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
    };
  }

  // 終身統計：SUM 累加、MAX 取最大、SETS 收集不重複的 id
  const LIFE_SUM = ['runs', 'eaten', 'perfect', 'raw', 'dodges', 'knocked', 'gfAte', 'steals', 'fed', 'fedFav', 'fedRaw',
    'rareEaten', 'saves', 'crashFails', 'pitchesBought', 'badBuys', 'goodDeals', 'declines', 'ults', 'ultCleared',
    'angerEnds', 'hungerEnds', 'playTime', 'ticketsEarned', 'missionsDone', 'challengeRuns'];
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
    return d;
  }

  let data = defaults();

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
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* 無痕模式等情況，忽略 */ }
  }

  return {
    load,
    persist,
    sanitize,
    LIFE_SUM,
    LIFE_MAX,
    LIFE_SETS,
    get data() { return data; },
  };
})();
