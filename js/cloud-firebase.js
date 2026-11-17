// Firebase 後端（Firestore + Authentication），只有在 js/firebase-config.js 填了設定、而且玩家真的用到雲端功能時才會載入 SDK。
// SDK 從 Google CDN（gstatic）以 ES module 動態載入；載入失敗（離線、被擋）會丟錯，由 FF.Cloud 接住並退回「尚未開放」。
// 資料結構（規則見 firestore.rules）：
//   daily/{日期}/scores/{uid}     每日同題成績（每人每天一筆，只能建立、不能改）
//   weekly/{週}/scores/{uid}      本週累計（每天成績加總、參加天數、單日最佳）
//   saves/{uid}                   雲端存檔（只有本人能讀寫）
window.FF = window.FF || {};

FF.CloudFirebase = (() => {
  function create(cfg, ver) {
    let M = null; // 載入後的模組：{ app, auth, fs }
    let auth = null;
    let db = null;
    let userCb = null;
    const toUser = u => (u ? { uid: u.uid, anon: u.isAnonymous, name: u.displayName || '', email: u.email || '' } : null);

    return {
      onUser(cb) { userCb = cb; },
      async init() {
        const base = `https://www.gstatic.com/firebasejs/${ver}/`;
        // 用 allSettled：任一個載入失敗時，其他的失敗不會變成沒人接的 rejection（會被當成頁面錯誤）
        const got = await Promise.allSettled([
          import(base + 'firebase-app.js'),
          import(base + 'firebase-auth.js'),
          import(base + 'firebase-firestore.js'),
        ]);
        const bad = got.find(x => x.status === 'rejected');
        if (bad) throw bad.reason || new Error('sdk-load');
        const [appM, authM, fsM] = got.map(x => x.value);
        M = { app: appM, auth: authM, fs: fsM };
        const app = appM.initializeApp(cfg);
        auth = authM.getAuth(app);
        db = fsM.getFirestore(app);
        // 手機 popup 被擋改走 redirect 時，回到頁面要接結果（失敗就忽略，不影響其他功能）
        try { await authM.getRedirectResult(auth); } catch (e) { /* ignore */ }
        await new Promise(res => {
          const off = authM.onAuthStateChanged(auth, u => {
            off();
            userCb && userCb(toUser(u));
            res();
          });
        });
        authM.onAuthStateChanged(auth, u => userCb && userCb(toUser(u)));
      },
      async signInAnon() {
        await M.auth.signInAnonymously(auth);
        return toUser(auth.currentUser);
      },
      // 匿名帳號盡量用 link 升級成 Google 帳號，排行榜身分（uid）就不會變
      async signInGoogle() {
        const A = M.auth;
        const provider = new A.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const cur = auth.currentUser;
        try {
          if (cur && cur.isAnonymous) {
            await A.linkWithPopup(cur, provider);
            userCb && userCb(toUser(auth.currentUser));
            return { linked: true };
          }
          await A.signInWithPopup(auth, provider);
          return { linked: false };
        } catch (e) {
          const code = e && e.code;
          if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return { cancelled: true };
          // 手機瀏覽器常擋 popup：改走整頁轉址（回來後 init 會接結果）
          if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(code)) {
            if (cur && cur.isAnonymous) await A.linkWithRedirect(cur, provider);
            else await A.signInWithRedirect(auth, provider);
            return { redirecting: true };
          }
          // 這個 Google 帳號已經是別的 uid（例如在別台裝置登入過）：改用那個帳號，目前的匿名身分就接不上了
          if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
            const cred = A.GoogleAuthProvider.credentialFromError(e);
            if (cred) {
              await A.signInWithCredential(auth, cred);
              return { linked: false, lost: true };
            }
          }
          return { error: code || 'login' };
        }
      },
      async signOut() { await M.auth.signOut(auth); },

      // 一個交易：每天只能建立一次每日成績，同時更新本週累計
      async submitDaily(dateKey, wk, e) {
        const F = M.fs;
        const u = auth.currentUser;
        if (!u) throw new Error('not-signed-in');
        const dref = F.doc(db, 'daily', dateKey, 'scores', u.uid);
        const wref = F.doc(db, 'weekly', wk, 'scores', u.uid);
        let existing = null;
        await F.runTransaction(db, async tx => {
          const ds = await tx.get(dref);
          if (ds.exists()) { existing = ds.data(); return; }
          const ws = await tx.get(wref);
          const w = ws.exists() ? ws.data() : null;
          tx.set(dref, {
            uid: u.uid, nick: e.nick, score: e.score, time: e.time, wave: e.wave,
            persona: e.persona || '', venue: e.venue || '', broth: e.broth || '', v: FF.COMPETE.VERSION, at: F.serverTimestamp(),
          });
          tx.set(wref, {
            uid: u.uid, nick: e.nick, total: (w ? w.total : 0) + e.score, days: (w ? w.days : 0) + 1, best: Math.max(w ? w.best : 0, e.score),
            lastDate: dateKey, v: FF.COMPETE.VERSION, at: F.serverTimestamp(),
          });
        });
        const mine = existing || e;
        let rank = null;
        try {
          const c = await F.getCountFromServer(F.query(F.collection(db, 'daily', dateKey, 'scores'), F.where('score', '>', mine.score)));
          rank = c.data().count + 1;
        } catch (er) { /* 名次查不到就算了 */ }
        return { ok: true, already: !!existing, entry: existing || undefined, rank };
      },

      async board(kind, key, limit) {
        const F = M.fs;
        const weekly = kind === 'weekly';
        const coll = F.collection(db, weekly ? 'weekly' : 'daily', key, 'scores');
        const field = weekly ? 'total' : 'score';
        const snap = await F.getDocs(F.query(coll, F.orderBy(field, 'desc'), F.limit(limit)));
        const entries = snap.docs.map(d => {
          const x = d.data();
          return weekly
            ? { uid: x.uid, nick: x.nick, score: x.total, days: x.days, best: x.best, time: 0 }
            : { uid: x.uid, nick: x.nick, score: x.score, time: x.time, wave: x.wave };
        });
        let me = null;
        const u = auth.currentUser;
        if (u) {
          const ms = await F.getDoc(F.doc(db, weekly ? 'weekly' : 'daily', key, 'scores', u.uid));
          if (ms.exists()) {
            const x = ms.data();
            const mine = weekly ? x.total : x.score;
            let rank = null;
            try {
              const c = await F.getCountFromServer(F.query(coll, F.where(field, '>', mine)));
              rank = c.data().count + 1;
            } catch (er) { /* ignore */ }
            me = { rank, entry: weekly ? { uid: x.uid, nick: x.nick, score: x.total, days: x.days, best: x.best, time: 0 } : { uid: x.uid, nick: x.nick, score: x.score, time: x.time, wave: x.wave } };
          }
        }
        return { ok: true, entries, me };
      },

      async saveUpload(obj) {
        const F = M.fs;
        const u = auth.currentUser;
        if (!u) throw new Error('not-signed-in');
        const updatedAt = Date.now();
        await F.setDoc(F.doc(db, 'saves', u.uid), {
          uid: u.uid, json: obj.json, tickets: obj.tickets, bestScore: obj.bestScore, runs: obj.runs, updatedAt, v: 1, at: F.serverTimestamp(),
        });
        return { updatedAt };
      },
      async saveDownload() {
        const F = M.fs;
        const u = auth.currentUser;
        if (!u) throw new Error('not-signed-in');
        const s = await F.getDoc(F.doc(db, 'saves', u.uid));
        if (!s.exists()) return null;
        const x = s.data();
        return { json: x.json, tickets: x.tickets || 0, bestScore: x.bestScore || 0, runs: x.runs || 0, updatedAt: x.updatedAt || 0 };
      },
    };
  }
  return { create };
})();
