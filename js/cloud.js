// 雲端功能的抽象介面 FF.Cloud：排行榜、暱稱、雲端存檔
// 後端有三種：off（沒設定，所有雲端功能隱藏或顯示「尚未開放」）、mock（記憶體／localStorage 模擬，測試用）、firebase（見 cloud-firebase.js）
// 啟用 mock：網址加 ?cloud=mock，或呼叫 FF.debug.cloudMock()。
// 沒設定 Firebase 時完全不會下載 SDK；SDK 載入失敗（離線、被擋）會退回「尚未開放」，不丟錯誤、不影響遊戲。
window.FF = window.FF || {};

FF.Cloud = (() => {
  const listeners = [];
  const st = { phase: 'idle', user: null, error: '' }; // phase：idle → loading → ready | error
  let mode = 'off';
  let impl = null;
  let initP = null;
  let pendingConflict = null;
  let lastSyncMsg = '';

  const cfgOk = () => {
    const c = FF.FIREBASE_CONFIG || {};
    return !!(c.apiKey && c.projectId && c.appId);
  };
  function detect() {
    try {
      if (/[?&]cloud=mock\b/.test(location.search)) return 'mock';
    } catch (e) { /* ignore */ }
    return cfgOk() ? 'firebase' : 'off';
  }
  mode = detect();

  const emit = () => listeners.forEach(fn => { try { fn(st); } catch (e) { /* ignore */ } });
  const setUser = u => {
    st.user = u ? { uid: u.uid, anon: !!u.anon, name: u.name || '', email: u.email || '' } : null;
    emit();
  };
  const fail = (e, extra) => ({ ok: false, error: (e && (e.code || e.message)) || String(e), ...extra });

  // ---------- 初始化 ----------
  function ensure() {
    if (mode === 'off') return Promise.resolve(false);
    if (initP) return initP;
    st.phase = 'loading';
    emit();
    initP = (async () => {
      try {
        impl = mode === 'mock' ? FF.CloudMock.create() : FF.CloudFirebase.create(FF.FIREBASE_CONFIG, FF.FIREBASE_SDK_VERSION);
        impl.onUser(setUser);
        await impl.init();
        st.phase = 'ready';
        st.error = '';
        emit();
        return true;
      } catch (e) {
        // SDK 載入失敗、離線、被擋：退回尚未開放，遊戲照常
        impl = null;
        st.phase = 'error';
        st.error = (e && (e.code || e.message)) || 'init';
        initP = null;
        emit();
        return false;
      }
    })();
    return initP;
  }

  // ---------- 暱稱與資料檢查 ----------
  function checkEntry(e) {
    const C = FF.COMPETE;
    if (!e || typeof e.score !== 'number' || typeof e.time !== 'number') return false;
    if (e.score !== Math.floor(e.score) || e.time !== Math.floor(e.time)) return false;
    if (e.wave < 1 || e.wave > 999) return false;
    return C.plausible(e.score, e.time);
  }

  // ---------- 對外功能 ----------
  async function guard(fn) {
    if (mode === 'off') return { ok: false, error: 'off' };
    const ready = await ensure();
    if (!ready) return { ok: false, error: 'unavailable' };
    try {
      return await fn();
    } catch (e) {
      return fail(e);
    }
  }

  async function signInAnon() {
    return guard(async () => {
      if (st.user) return { ok: true, user: st.user };
      await impl.signInAnon();
      return { ok: true, user: st.user };
    });
  }
  async function signInGoogle() {
    return guard(async () => {
      const r = await impl.signInGoogle();
      return { ok: !r.error && !r.cancelled, ...r, user: st.user };
    });
  }
  async function signOut() {
    return guard(async () => {
      await impl.signOut();
      pendingConflict = null;
      return { ok: true };
    });
  }

  // 上傳每日成績（也會更新本週累計）。entry：{ score, time, wave, nick, persona, venue, broth }
  async function submitDaily(dateKey, entry) {
    if (!checkEntry(entry)) return { ok: false, error: 'implausible' };
    const nk = FF.Duel.cleanNick(entry.nick);
    if (!nk.ok) return { ok: false, error: 'nick', msg: nk.msg };
    return guard(async () => {
      if (!st.user) await impl.signInAnon();
      return await impl.submitDaily(dateKey, FF.Daily.weekKey(dateKey), { ...entry, nick: nk.nick });
    });
  }

  // kind：'daily'（key＝日期）或 'weekly'（key＝2026-W47）；回傳前 limit 名與自己的名次
  async function board(kind, key, limit = 50) {
    return guard(async () => {
      const r = await impl.board(kind, key, limit);
      if (r.entries) {
        const uid = st.user && st.user.uid;
        r.entries.sort((a, b) => b.score - a.score || (a.time || 0) - (b.time || 0));
        r.entries.forEach((e, i) => { e.rank = i + 1; e.me = !!uid && e.uid === uid; });
      }
      return r;
    });
  }

  // ---------- 雲端存檔 ----------
  const hasProgress = d => !!d && (d.runs > 0 || d.tickets > 0 || (d.achievements && d.achievements.length > 0));
  const summary = d => ({ tickets: d.tickets || 0, bestScore: (d.best && d.best.score) || 0, runs: d.runs || 0, updatedAt: d.updatedAt || 0 });
  const isGoogle = () => !!(st.user && !st.user.anon);

  async function upload() {
    const d = FF.Save.data;
    const r = await impl.saveUpload({ json: JSON.stringify(d), ...summary(d) });
    d.cloud.base = r.updatedAt;
    d.cloud.lastSync = Date.now();
    d.cloud.used = true;
    FF.Save.persist();
    return r;
  }
  function restore(remote) {
    let raw;
    try { raw = JSON.parse(remote.json); } catch (e) { return false; }
    const keep = { cloud: { ...FF.Save.data.cloud, base: remote.updatedAt, lastSync: Date.now(), used: true } };
    FF.Save.replace(raw, keep);
    FF.Save.persist(); // 會把 base 與時間一起存下來
    return true;
  }

  // 同步：manual＝手動按（有衝突就回傳 conflict 讓介面問玩家）；auto＝自動（有衝突只記下來，不打擾）
  async function sync({ manual = false } = {}) {
    if (mode === 'off') return { ok: false, error: 'off' };
    if (!isGoogle()) return { ok: false, error: 'login' };
    return guard(async () => {
      const local = FF.Save.data;
      const remote = await impl.saveDownload();
      if (!remote) {
        if (!hasProgress(local)) return { ok: true, action: 'none' };
        await upload();
        return { ok: true, action: 'uploaded' };
      }
      if (local.cloud.base === remote.updatedAt && local.cloud.base) {
        // 上次同步之後雲端沒人動過：本機有變動就上傳
        if ((local.updatedAt || 0) > (local.cloud.lastSync || 0)) {
          await upload();
          return { ok: true, action: 'uploaded' };
        }
        return { ok: true, action: 'same' };
      }
      // 雲端跟上次同步時不一樣（別的裝置上傳過，或第一次連結）
      if (!hasProgress(local)) {
        restore(remote);
        return { ok: true, action: 'restored' };
      }
      const rs = { tickets: remote.tickets, bestScore: remote.bestScore, runs: remote.runs, updatedAt: remote.updatedAt };
      const ls = summary(local);
      if (rs.tickets === ls.tickets && rs.bestScore === ls.bestScore && rs.runs === ls.runs) {
        local.cloud.base = remote.updatedAt;
        local.cloud.lastSync = Date.now();
        FF.Save.persist();
        return { ok: true, action: 'same' };
      }
      pendingConflict = { local: ls, remote: rs, remoteData: remote };
      emit();
      return { ok: true, action: 'conflict', conflict: pendingConflict, manual };
    });
  }
  // 玩家在衝突畫面做決定：'local'（用本機覆蓋雲端）、'remote'（用雲端覆蓋本機）
  async function resolve(choice) {
    if (!pendingConflict) return { ok: false, error: 'noconflict' };
    return guard(async () => {
      const c = pendingConflict;
      if (choice === 'remote') {
        if (!restore(c.remoteData)) return { ok: false, error: 'corrupt' };
      } else {
        await upload();
      }
      pendingConflict = null;
      emit();
      return { ok: true, action: choice === 'remote' ? 'restored' : 'uploaded' };
    });
  }

  // 自動同步：開遊戲、每局結束後（有登入 Google、沒關自動同步才做；失敗不吵玩家）
  let autoBusy = false;
  async function autoSync() {
    const d = FF.Save.data;
    if (mode === 'off' || !d.cloud.used || !d.cloud.auto || autoBusy || !isGoogle()) return null;
    autoBusy = true;
    try {
      const r = await sync({ manual: false });
      lastSyncMsg = r.ok ? r.action : r.error;
      return r;
    } finally {
      autoBusy = false;
    }
  }

  // 啟動時：玩過雲端功能的人（存檔有 cloud.used）才會在背景載入 SDK 恢復登入狀態
  function boot() {
    if (mode === 'off') return;
    if (FF.Save.data.cloud.used || mode === 'mock') {
      ensure().then(ok => ok && FF.Save.data.cloud.used && setTimeout(autoSync, 1200));
    }
  }

  return {
    get mode() { return mode; },
    get state() { return st; },
    get user() { return st.user; },
    get conflict() { return pendingConflict; },
    get lastSync() { return lastSyncMsg; },
    available: () => mode !== 'off',
    isGoogle,
    ensure, signInAnon, signInGoogle, signOut, submitDaily, board, sync, resolve, autoSync, boot,
    hasProgress, summary, checkEntry,
    onChange(fn) { listeners.push(fn); },
    // 測試用：切到 mock（要在 ensure 之前呼叫）
    enableMock() {
      if (initP) return false;
      mode = 'mock';
      return true;
    },
    get impl() { return impl; },
  };
})();

// ---------- mock 後端：用 localStorage 模擬雲端（測試用），行為對齊 Firebase 版 ----------
FF.CloudMock = (() => {
  const KEY = 'foodfight_mock_cloud_v1';
  const delay = () => new Promise(r => setTimeout(r, 15));
  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  };
  const store = db => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore */ } };
  const NAMES = ['小火鍋', '蝦滑王', '貢丸俠', '牛奶鍋鍋', '麻辣阿嬤', '鴛鴦手', '筷神', '夾肉師傅', '和牛愛好者', '龍蝦殺手', '蛋餃小子', '高麗菜',
    '魚板大師', '玉米濃湯', '香菇頭', '飯票大亨', '詠春傳人', '手殘黨', '火鍋土匪', '不吃辣', '加湯小弟', '服務員小王'];

  // 假玩家（決定性產生，同一天永遠一樣），讓排行榜有 60 位可以排
  function fakes(kind, key) {
    const r = FF.Rng.mulberry32(FF.Rng.hash('mock-' + kind + key));
    return Array.from({ length: 60 }, (_, i) => {
      const time = 25 + Math.floor(r() * 320);
      const score = Math.min(Math.floor(time * (3 + r() * 6)), FF.COMPETE.limits.scoreBase + time * FF.COMPETE.limits.scorePerSec);
      const days = kind === 'weekly' ? 1 + Math.floor(r() * 5) : 1;
      return {
        uid: 'fake-' + i, nick: NAMES[i % NAMES.length] + (i >= NAMES.length ? i : ''), score: kind === 'weekly' ? score * days : score,
        time, wave: 1 + Math.floor(time / 30), days, best: score,
      };
    });
  }

  function create() {
    let userCb = null;
    let user = null;
    const uidOf = () => 'mock-' + Math.random().toString(36).slice(2, 10);
    return {
      onUser(cb) { userCb = cb; },
      async init() {
        await delay();
        const db = load();
        user = db.session || null;
        userCb && userCb(user);
      },
      async signInAnon() {
        await delay();
        const db = load();
        user = { uid: uidOf(), anon: true, name: '', email: '' };
        db.session = user;
        store(db);
        userCb && userCb(user);
        return user;
      },
      // 模擬 Google 登入：同一個 Google 帳號永遠對應同一個 uid；匿名帳號登入時盡量「連結」（保留 uid）
      async signInGoogle() {
        await delay();
        if (FF.Cloud.mockGoogleFail) return { error: FF.Cloud.mockGoogleFail };
        const g = FF.Cloud.mockGoogle || { id: 'g-tester', name: '測試玩家', email: 'tester@example.com' };
        const db = load();
        db.google = db.google || {};
        let linked = false;
        let lost = false;
        if (db.google[g.id]) {
          // 這個 Google 帳號以前就有了：改用它的 uid（若原本是匿名帳號，匿名身分就接不上了）
          lost = !!(user && user.anon);
          user = { uid: db.google[g.id], anon: false, name: g.name, email: g.email };
        } else if (user && user.anon) {
          user = { ...user, anon: false, name: g.name, email: g.email };
          db.google[g.id] = user.uid;
          linked = true;
        } else {
          user = { uid: uidOf(), anon: false, name: g.name, email: g.email };
          db.google[g.id] = user.uid;
        }
        db.session = user;
        store(db);
        userCb && userCb(user);
        return { linked, lost };
      },
      async signOut() {
        await delay();
        const db = load();
        db.session = null;
        store(db);
        user = null;
        userCb && userCb(null);
      },
      async submitDaily(dateKey, wk, e) {
        await delay();
        const db = load();
        db.daily = db.daily || {};
        db.weekly = db.weekly || {};
        const day = (db.daily[dateKey] = db.daily[dateKey] || {});
        if (day[user.uid]) return { ok: true, already: true, entry: day[user.uid], rank: rankOf('daily', dateKey, day[user.uid].score, db) };
        day[user.uid] = { uid: user.uid, nick: e.nick, score: e.score, time: e.time, wave: e.wave, persona: e.persona, venue: e.venue, broth: e.broth };
        const wkMap = (db.weekly[wk] = db.weekly[wk] || {});
        const w = wkMap[user.uid];
        wkMap[user.uid] = {
          uid: user.uid, nick: e.nick, score: (w ? w.score : 0) + e.score, days: (w ? w.days : 0) + 1, best: Math.max(w ? w.best : 0, e.score),
          time: (w ? w.time : 0) + e.time, wave: e.wave,
        };
        store(db);
        return { ok: true, already: false, rank: rankOf('daily', dateKey, e.score, db) };
      },
      async board(kind, key, limit) {
        await delay();
        const db = load();
        const real = Object.values(((kind === 'daily' ? db.daily : db.weekly) || {})[key] || {});
        const all = fakes(kind, key).concat(real).sort((a, b) => b.score - a.score || a.time - b.time);
        const entries = all.slice(0, limit).map(x => ({ ...x }));
        const uid = user && user.uid;
        let me = null;
        if (uid) {
          const idx = all.findIndex(x => x.uid === uid);
          if (idx >= 0) me = { rank: idx + 1, entry: { ...all[idx] } };
        }
        return { ok: true, entries, me, total: all.length };
      },
      async saveUpload(obj) {
        await delay();
        const db = load();
        db.saves = db.saves || {};
        const updatedAt = Math.max(Date.now(), ((db.saves[user.uid] || {}).updatedAt || 0) + 1);
        db.saves[user.uid] = { ...obj, updatedAt };
        store(db);
        return { updatedAt };
      },
      async saveDownload() {
        await delay();
        const db = load();
        const s = (db.saves || {})[user.uid];
        return s ? { ...s } : null;
      },
    };
  }
  function rankOf(kind, key, score, db) {
    const real = Object.values((db.daily || {})[key] || {});
    return fakes(kind, key).concat(real).filter(x => x.score > score).length + 1;
  }
  return { create, KEY };
})();
