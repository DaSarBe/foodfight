// 局外進度：終身統計、每日任務、成就與稱號、她的模式／鍋底解鎖
// 遊戲中即時檢查成就的部分掛在 FF.Game 上
window.FF = window.FF || {};

FF.Progress = (() => {
  let clock = () => new Date(); // 測試可用 setClock 改寫日期
  const pad = n => String(n).padStart(2, '0');
  const S = () => FF.Save.data;

  function todayKey() {
    const d = clock();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // 依日期決定的亂數：同一天重新產生也會是同一組任務
  function seeded(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    let a = h >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const missionDef = id => FF.MISSIONS.find(m => m.id === id);

  // 換日時產生今天的 3 個任務；回傳是否換了新任務
  function ensureDaily() {
    const s = S();
    const key = todayKey();
    if (s.daily.date === key && s.daily.list.length === 3) return false;
    const rnd = seeded('foodfight-' + key);
    // 還沒玩到撞車的人不要給「英雄救美」
    const pool = FF.MISSIONS.filter(m => !(m.id === 'save' && s.best.wave < 3));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const veteran = s.runs >= 8;
    const list = pool.slice(0, 3).map(m => {
      let target = m.targets[veteran && m.targets.length > 1 && rnd() < 0.6 ? 1 : 0];
      if (m.id === 'wave') target = Math.min(target, Math.max(3, s.best.wave));
      return { id: m.id, target, progress: 0, claimed: false };
    });
    s.daily = { date: key, list, bonus: false };
    FF.Save.persist();
    return true;
  }

  function dailyState() {
    ensureDaily();
    const list = S().daily.list;
    const done = list.filter(m => m.progress >= m.target).length;
    const claimable = list.filter(m => m.progress >= m.target && !m.claimed).length + (done === 3 && !S().daily.bonus ? 1 : 0);
    return { done, claimable, total: list.length };
  }

  // 一局對某個統計的貢獻
  function runValue(stat, game, r) {
    if (stat === 'runs') return 1;
    if (stat === 'challengeRuns') return r.mode === 'challenge' ? 1 : 0;
    if (stat === 'score') return r.score;
    if (stat === 'wave') return r.wave;
    return r.stats[stat] || 0;
  }

  function applyRunToMissions(game, r) {
    ensureDaily();
    const s = S();
    const out = [];
    for (const m of s.daily.list) {
      const def = missionDef(m.id);
      if (!def || m.progress >= m.target) continue;
      let v = runValue(def.stat, game, r);
      if (def.normalOnly && r.mode !== 'normal') v = 0;
      const before = m.progress;
      const after = Math.min(m.target, def.single ? Math.max(before, v) : before + v);
      if (after > before) {
        m.progress = after;
        const done = after >= m.target;
        if (done) s.life.missionsDone++;
        out.push({ id: m.id, icon: def.icon, text: def.text(m.target), before, after, target: m.target, done, reward: def.reward });
      }
    }
    return out;
  }

  function claimMission(i) {
    const s = S();
    const m = s.daily.list[i];
    if (!m || m.claimed || m.progress < m.target) return 0;
    const def = missionDef(m.id);
    m.claimed = true;
    s.tickets += def.reward;
    s.life.ticketsEarned += def.reward;
    FF.Save.persist();
    return def.reward;
  }

  function claimBonus() {
    const s = S();
    if (s.daily.bonus || s.daily.list.some(m => m.progress < m.target)) return 0;
    s.daily.bonus = true;
    s.tickets += FF.MISSION_BONUS;
    s.life.ticketsEarned += FF.MISSION_BONUS;
    FF.Save.persist();
    return FF.MISSION_BONUS;
  }

  // ---------- 終身統計 ----------
  // 一局換算成終身統計的增量（r 為結算結果；遊戲中即時檢查時為 null）
  function runDelta(game, r) {
    const st = game.stats;
    const normal = !game.challenge && !game.comp;
    const sum = {
      runs: r ? 1 : 0,
      playTime: Math.floor(game.t),
      angerEnds: r && r.reason === 'anger' ? 1 : 0,
      hungerEnds: r && r.reason === 'hunger' ? 1 : 0,
      ticketsEarned: r ? r.tickets.total : 0,
      challengeRuns: r && game.challenge ? 1 : 0,
    };
    ['eaten', 'perfect', 'raw', 'dodges', 'knocked', 'gfAte', 'steals', 'fed', 'fedFav', 'fedRaw', 'rareEaten', 'saves',
      'crashFails', 'pitchesBought', 'badBuys', 'goodDeals', 'declines', 'ults', 'ultCleared'].forEach(k => (sum[k] = st[k] || 0));
    const max = {
      bestCombo: st.bestCombo || 0,
      bestWave: normal ? game.wave : 0,
      bestTime: normal ? Math.floor(game.t) : 0,
      maxFedRun: st.fed || 0,
      maxScore: normal ? game.score : 0,
    };
    const sets = r ? { venues: game.venue.id, broths: game.broth.id, gfs: game.persona.id } : {};
    return { sum, max, sets };
  }

  function addDelta(L, d) {
    for (const k in d.sum) L[k] = (L[k] || 0) + d.sum[k];
    for (const k in d.max) L[k] = Math.max(L[k] || 0, d.max[k]);
    for (const k in d.sets) if (!L[k].includes(d.sets[k])) L[k].push(d.sets[k]);
  }

  // 終身統計（可選擇加上一局還沒結算的數據）＋ 一些衍生數值，給成就判定用
  function combinedLife(game) {
    const s = S();
    const L = JSON.parse(JSON.stringify(s.life));
    if (game) addDelta(L, runDelta(game, null));
    L.gfUnlocked = s.unlockedGf.length;
    L.challengesCleared = s.challenges.cleared.length;
    L.named = (s.names.f ? 1 : 0) + (s.names.m ? 1 : 0);
    L.chopsOwned = FF.Chops ? FF.Chops.ownedCount() : 1;
    return L;
  }

  // 檢查新解鎖的成就，直接發放飯票獎勵；回傳新解鎖的成就
  function checkAchievements(L) {
    const s = S();
    const got = [];
    for (const a of FF.ACHIEVEMENTS) {
      if (s.achievements.includes(a.id)) continue;
      let ok = false;
      try { ok = !!a.test(L); } catch (e) { ok = false; }
      if (!ok) continue;
      s.achievements.push(a.id);
      if (a.reward) {
        s.tickets += a.reward;
        s.life.ticketsEarned += a.reward;
      }
      got.push(a);
    }
    if (got.length) FF.Save.persist();
    return got;
  }

  // 一局結束：任務、終身統計、成就
  function commitRun(game, r) {
    const s = S();
    const missions = applyRunToMissions(game, r);
    addDelta(s.life, runDelta(game, r));
    const late = checkAchievements(combinedLife(null));
    const achievements = (game.achUnlocked || []).concat(late);
    FF.Save.persist();
    return { missions, achievements };
  }

  // 解鎖狀態改變（買女友模式、鍋底、過關）後也要檢查成就
  function recheck() {
    return checkAchievements(combinedLife(null));
  }

  // ---------- 稱號 ----------
  function titleName(save = S()) {
    const a = FF.ACHIEVEMENTS.find(x => x.id === save.title);
    return a && save.achievements.includes(a.id) ? a.title : FF.DEFAULT_TITLE;
  }

  function equipTitle(id) {
    const s = S();
    if (id && !s.achievements.includes(id)) return false;
    s.title = id || '';
    FF.Save.persist();
    return true;
  }

  // ---------- 解鎖 ----------
  function personaStatus(p) {
    const s = S();
    const owned = s.unlockedGf.includes(p.id);
    const u = p.unlock || {};
    const cond = u.cond || null;
    const have = cond ? s.life[cond.stat] || 0 : 0;
    return { owned, price: u.price || 0, cond, have, condMet: !!cond && have >= cond.n };
  }

  // how：'cond'（條件達成免費）或 'buy'（花飯票）
  function unlockPersona(id, how) {
    const s = S();
    const p = FF.PERSONAS.find(x => x.id === id);
    if (!p) return false;
    const st = personaStatus(p);
    if (st.owned) return true;
    if (how === 'cond') {
      if (!st.condMet) return false;
    } else {
      if (s.tickets < st.price) return false;
      s.tickets -= st.price;
    }
    s.unlockedGf.push(id);
    FF.Save.persist();
    recheck();
    return true;
  }

  function unlockBroth(id) {
    const s = S();
    const b = FF.BROTHS.find(x => x.id === id);
    if (!b) return false;
    if (s.unlockedBroth.includes(id)) return true;
    const price = (b.unlock && b.unlock.price) || 0;
    if (s.tickets < price) return false;
    s.tickets -= price;
    s.unlockedBroth.push(id);
    FF.Save.persist();
    return true;
  }

  function challengeOpen(i) {
    return i === 0 || S().challenges.cleared.includes(FF.CHALLENGES[i - 1].id);
  }

  return {
    todayKey,
    ensureDaily,
    dailyState,
    missionDef,
    claimMission,
    claimBonus,
    combinedLife,
    checkAchievements,
    commitRun,
    recheck,
    titleName,
    equipTitle,
    personaStatus,
    unlockPersona,
    unlockBroth,
    challengeOpen,
    setClock(fn) { clock = fn || (() => new Date()); },
  };
})();

// 遊戲中：每秒檢查一次成就，解鎖時在畫面上方跳通知
Object.assign(FF.Game.prototype, {
  initProgress() {
    this.achUnlocked = [];
    this.notices = [];
    this.progTimer = 1;
  },

  updateProgress(dt) {
    for (const n of this.notices) n.t += dt;
    this.notices = this.notices.filter(n => n.t < n.life);
    this.progTimer -= dt;
    if (this.progTimer > 0) return;
    this.progTimer = 1;
    const got = FF.Progress.checkAchievements(FF.Progress.combinedLife(this));
    got.forEach((a, i) => {
      this.achUnlocked.push(a);
      // 一次解鎖好幾個時排隊顯示
      this.notices.push({ a, t: -i * 2.6, life: 2.8 });
    });
    if (got.length) {
      FF.Audio.play('unlock');
      FF.Haptics.vibrate('comboClear');
    }
  },
});
