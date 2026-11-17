// 存檔：localStorage，讀檔時容忍損毀或舊格式
window.FF = window.FF || {};

FF.Save = (() => {
  const KEY = 'foodfight_save_v1';

  function defaults() {
    const upgrades = {};
    FF.UPGRADES.forEach(u => (upgrades[u.id] = 0));
    const items = {};
    FF.ITEMS.forEach(i => (items[i.id] = 0));
    return {
      tickets: 0,
      upgrades,
      items,
      best: { score: 0, time: 0, wave: 0 },
      muted: false,
      vibrate: true,
      seenTutorial: false,
      runs: 0,
      venue: 'city',
      // 以下為後來新增的欄位，舊存檔缺少時由 sanitize 補預設值
      gfType: 'default',
      broth: 'classic',
      music: true,
      unlockedGf: ['default'],
      unlockedBroth: FF.BROTHS.filter(b => !b.unlock).map(b => b.id),
      life: lifeDefaults(),
      achievements: [],
      title: '',
      daily: { date: '', list: [], bonus: false },
      challenges: { cleared: [], plays: 0 },
      // ---- v3 新增：對象與自己的性別、暱稱、每日同題、雲端、加到主畫面 ----
      partner: 'f',       // 'f' 女朋友（預設）、'm' 男朋友
      me: 'auto',         // 'auto'＝跟對象相反，或 'm'／'f' 自己指定（不預設異性戀，同性伴侶也能選）
      nick: '',
      dc: dcDefaults(),
      cloud: { used: false, auto: true, base: 0, lastSync: 0 },
      pwa: { later: 0, laterRuns: 0, never: false, installed: false, asked: 0, seenIos: false },
      // ---- v4 新增：對象外觀（女友、男友各一套）、對象名字、筷子造型（照片另存在 foodfight_photo_v1，不放這裡）----
      look: { f: FF.LOOK.defaults('f'), m: FF.LOOK.defaults('m') },
      names: { f: '', m: '' },
      chops: { own: [], equip: 'plain' },
      updatedAt: 0,
    };
  }

  // 每日同題：rec 以日期（台灣時間）為鍵，只留最近 30 天；streak 連續參加天數；practice 今天練習了幾局
  function dcDefaults() {
    return { rec: {}, streak: { n: 0, last: '' }, practice: { date: '', n: 0 }, best: 0, played: 0 };
  }
  const DKEY = /^\d{4}-\d{2}-\d{2}$/;

  // 終身統計：SUM 累加、MAX 取最大、SETS 收集不重複的 id
  const LIFE_SUM = ['runs', 'eaten', 'perfect', 'raw', 'dodges', 'knocked', 'gfAte', 'steals', 'fed', 'fedFav', 'fedRaw',
    'rareEaten', 'saves', 'crashFails', 'pitchesBought', 'badBuys', 'goodDeals', 'declines', 'ults', 'ultCleared',
    'angerEnds', 'hungerEnds', 'playTime', 'ticketsEarned', 'missionsDone', 'challengeRuns', 'styled'];
  const LIFE_MAX = ['bestCombo', 'bestWave', 'bestTime', 'maxFedRun', 'maxScore'];
  const LIFE_SETS = ['venues', 'broths', 'gfs'];
  function lifeDefaults() {
    const L = {};
    LIFE_SUM.concat(LIFE_MAX).forEach(k => (L[k] = 0));
    LIFE_SETS.forEach(k => (L[k] = []));
    return L;
  }
  const ids = (arr, valid) => (Array.isArray(arr) ? [...new Set(arr.filter(x => typeof x === 'string' && valid(x)))] : []);

  const num = (v, d, min = 0, max = Infinity) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.floor(n))) : d;
  };

  function sanitize(raw) {
    const d = defaults();
    if (!raw || typeof raw !== 'object') return d;
    d.tickets = num(raw.tickets, 0);
    if (raw.upgrades && typeof raw.upgrades === 'object') {
      FF.UPGRADES.forEach(u => (d.upgrades[u.id] = num(raw.upgrades[u.id], 0, 0, u.max)));
    }
    if (raw.items && typeof raw.items === 'object') {
      FF.ITEMS.forEach(i => (d.items[i.id] = num(raw.items[i.id], 0, 0, 99)));
    }
    if (raw.best && typeof raw.best === 'object') {
      d.best.score = num(raw.best.score, 0);
      d.best.time = num(raw.best.time, 0);
      d.best.wave = num(raw.best.wave, 0);
    }
    d.muted = !!raw.muted;
    // 舊存檔沒有這個欄位時預設開啟
    d.vibrate = raw.vibrate === undefined ? true : !!raw.vibrate;
    d.seenTutorial = !!raw.seenTutorial;
    d.runs = num(raw.runs, 0);
    if (FF.VENUES.some(v => v.id === raw.venue)) d.venue = raw.venue;
    // ---- 新欄位 ----
    d.music = raw.music === undefined ? true : !!raw.music;
    const isGf = id => FF.PERSONAS.some(p => p.id === id);
    const isBroth = id => FF.BROTHS.some(b => b.id === id);
    d.unlockedGf = [...new Set(['default'].concat(ids(raw.unlockedGf, isGf)))];
    d.unlockedBroth = [...new Set(d.unlockedBroth.concat(ids(raw.unlockedBroth, isBroth)))];
    if (d.unlockedGf.includes(raw.gfType)) d.gfType = raw.gfType;
    if (d.unlockedBroth.includes(raw.broth)) d.broth = raw.broth;
    if (raw.life && typeof raw.life === 'object') {
      LIFE_SUM.concat(LIFE_MAX).forEach(k => (d.life[k] = num(raw.life[k], 0)));
      d.life.venues = ids(raw.life.venues, id => FF.VENUES.some(v => v.id === id));
      d.life.broths = ids(raw.life.broths, isBroth);
      d.life.gfs = ids(raw.life.gfs, isGf);
    } else {
      // 舊存檔沒有終身統計：用已知的資料補一點
      d.life.runs = d.runs;
      d.life.bestWave = d.best.wave;
      d.life.bestTime = d.best.time;
      d.life.maxScore = d.best.score;
    }
    d.achievements = ids(raw.achievements, id => FF.ACHIEVEMENTS.some(a => a.id === id));
    if (typeof raw.title === 'string' && d.achievements.includes(raw.title)) d.title = raw.title;
    const dl = raw.daily;
    if (dl && typeof dl === 'object' && typeof dl.date === 'string' && Array.isArray(dl.list)) {
      const list = dl.list
        .filter(m => m && typeof m === 'object' && FF.MISSIONS.some(x => x.id === m.id))
        .slice(0, 3)
        .map(m => ({ id: m.id, target: num(m.target, 1, 1, 100000), progress: num(m.progress, 0), claimed: !!m.claimed }));
      if (list.length === 3) d.daily = { date: dl.date.slice(0, 10), list, bonus: !!dl.bonus };
    }
    if (raw.challenges && typeof raw.challenges === 'object') {
      d.challenges.cleared = ids(raw.challenges.cleared, id => FF.CHALLENGES.some(c => c.id === id));
      d.challenges.plays = num(raw.challenges.plays, 0);
    }
    // ---- v3 新欄位（舊存檔沒有就用預設）----
    d.partner = raw.partner === 'm' ? 'm' : 'f';
    d.me = raw.me === 'm' || raw.me === 'f' ? raw.me : 'auto';
    d.nick = typeof raw.nick === 'string' ? raw.nick.replace(/[\u0000-\u001f\u007f<>&"]/g, '').trim().slice(0, 10) : '';
    const dc = raw.dc;
    if (dc && typeof dc === 'object') {
      if (dc.rec && typeof dc.rec === 'object') {
        Object.keys(dc.rec).filter(k => DKEY.test(k)).sort().slice(-30).forEach(k => {
          const r = dc.rec[k];
          if (!r || typeof r !== 'object') return;
          d.dc.rec[k] = {
            score: num(r.score, 0, 0, 1e7), time: num(r.time, 0, 0, 86400), wave: num(r.wave, 1, 1, 999),
            reason: typeof r.reason === 'string' ? r.reason.slice(0, 12) : '', sub: !!r.sub,
          };
        });
      }
      if (dc.streak && typeof dc.streak === 'object') {
        d.dc.streak = { n: num(dc.streak.n, 0, 0, 100000), last: DKEY.test(dc.streak.last) ? dc.streak.last : '' };
      }
      if (dc.practice && typeof dc.practice === 'object') {
        d.dc.practice = { date: DKEY.test(dc.practice.date) ? dc.practice.date : '', n: num(dc.practice.n, 0, 0, 9999) };
      }
      d.dc.best = num(dc.best, 0, 0, 1e7);
      d.dc.played = num(dc.played, 0, 0, 100000);
    }
    if (raw.cloud && typeof raw.cloud === 'object') {
      d.cloud = {
        used: !!raw.cloud.used, auto: raw.cloud.auto === undefined ? true : !!raw.cloud.auto,
        base: num(raw.cloud.base, 0, 0, 1e15), lastSync: num(raw.cloud.lastSync, 0, 0, 1e15),
      };
    }
    if (raw.pwa && typeof raw.pwa === 'object') {
      d.pwa = {
        later: num(raw.pwa.later, 0, 0, 1e15), laterRuns: num(raw.pwa.laterRuns, 0, 0, 1e6), never: !!raw.pwa.never,
        installed: !!raw.pwa.installed, asked: num(raw.pwa.asked, 0, 0, 1e6), seenIos: !!raw.pwa.seenIos,
      };
    }
    // ---- v4 新欄位 ----
    const lk = raw.look && typeof raw.look === 'object' ? raw.look : {};
    d.look = { f: FF.LOOK.sanitize(lk.f, 'f'), m: FF.LOOK.sanitize(lk.m, 'm') };
    const nm = raw.names && typeof raw.names === 'object' ? raw.names : {};
    d.names = { f: typeof nm.f === 'string' ? FF.Name.clean(nm.f) : '', m: typeof nm.m === 'string' ? FF.Name.clean(nm.m) : '' };
    if (raw.chops && typeof raw.chops === 'object') {
      const paid = FF.CHOPS.filter(c => c.price).map(c => c.id);
      d.chops.own = ids(raw.chops.own, id => paid.includes(id));
      const ownedNow = id => id === 'plain' || d.chops.own.includes(id) || (FF.chopById(id).ach && d.achievements.includes(FF.chopById(id).ach));
      if (typeof raw.chops.equip === 'string' && FF.CHOPS.some(c => c.id === raw.chops.equip) && ownedNow(raw.chops.equip)) d.chops.equip = raw.chops.equip;
    }
    d.updatedAt = num(raw.updatedAt, 0, 0, 1e15);
    return d;
  }

  let data = defaults();
  const persistHooks = [];

  function load() {
    try {
      const s = localStorage.getItem(KEY);
      data = sanitize(s ? JSON.parse(s) : null);
    } catch (e) {
      data = defaults();
    }
    return data;
  }

  function persist() {
    try {
      data.updatedAt = Date.now();
      localStorage.setItem(KEY, JSON.stringify(data));
      persistHooks.forEach(fn => { try { fn(data); } catch (e) { /* 雲端同步失敗不影響存檔 */ } });
    } catch (e) { /* 無痕模式等情況，忽略 */ }
  }

  return {
    load,
    persist,
    sanitize,
    defaults,
    KEY,
    onPersist(fn) { persistHooks.push(fn); },
    // 取代整份存檔（雲端還原用）：先過 sanitize，再寫進 localStorage
    replace(raw, keep) {
      const d = sanitize(raw);
      if (keep) Object.assign(d, keep);
      data = d;
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
      return data;
    },
    LIFE_SUM,
    LIFE_MAX,
    LIFE_SETS,
    get data() { return data; },
  };
})();
