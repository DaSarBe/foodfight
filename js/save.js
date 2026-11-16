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
      seenTutorial: false,
      runs: 0,
    };
  }

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
    d.seenTutorial = !!raw.seenTutorial;
    d.runs = num(raw.runs, 0);
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
    get data() { return data; },
  };
})();
