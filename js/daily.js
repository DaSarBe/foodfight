// 每日同題：以台灣時間（Asia/Taipei，UTC+8，沒有夏令時間）換日，全世界同一天同一個種子與配置
// 每人每天只有「第一局」算正式成績；之後可以練習但不計分
window.FF = window.FF || {};

FF.Daily = (() => {
  const TZ = 8 * 3600 * 1000;
  const DAY = 86400000;
  let clock = () => Date.now(); // 測試可以用 setClock 模擬時間

  const dateKey = (ms = clock()) => new Date(ms + TZ).toISOString().slice(0, 10);
  const today = () => dateKey();
  const S = () => FF.Save.data.dc;

  // 距離下次換日（台灣午夜）還有幾毫秒
  function msLeft() {
    const t = clock() + TZ;
    return DAY - (((t % DAY) + DAY) % DAY);
  }

  // 當天的配置：種子與場地／模式／鍋底都由日期決定（順序寫死在 duel.js，跟戰帖共用）
  function config(key = today()) {
    const seed = FF.Rng.hash('foodfight-daily-seed-' + key);
    const r = FF.Rng.mulberry32(FF.Rng.hash('foodfight-daily-cfg-' + key));
    const pick = arr => arr[Math.floor(r() * arr.length)];
    return {
      kind: 'daily', dateKey: key, seed,
      venue: pick(FF.Duel.VENUE_IDS), persona: pick(FF.Duel.PERSONA_IDS), broth: pick(FF.Duel.BROTH_IDS),
    };
  }

  const official = (key = today()) => S().rec[key] || null;

  // 準備開局：今天已經有正式成績就是練習
  function compOpts(key = today()) {
    const c = config(key);
    c.practice = !!official(key);
    return c;
  }

  function streak() {
    const st = S().streak;
    if (st.last === today() || st.last === dateKey(clock() - DAY)) return st.n;
    return 0;
  }

  // 一局結束時呼叫（compete.js）：回傳是不是正式成績
  function recordRun(comp, r) {
    const d = S();
    if (comp.practice || d.rec[comp.dateKey]) {
      if (d.practice.date !== comp.dateKey) d.practice = { date: comp.dateKey, n: 0 };
      d.practice.n++;
      return false;
    }
    d.rec[comp.dateKey] = { score: r.score, time: r.time, wave: r.wave, reason: r.reason, sub: false };
    const prev = dateKey(Date.parse(comp.dateKey + 'T00:00:00Z') - DAY);
    d.streak = { n: d.streak.last === prev ? d.streak.n + 1 : d.streak.last === comp.dateKey ? d.streak.n : 1, last: comp.dateKey };
    d.played++;
    d.best = Math.max(d.best, r.score);
    Object.keys(d.rec).sort().slice(0, -30).forEach(k => delete d.rec[k]);
    return true;
  }

  // ISO 週（週一開始），以日期字串計算：'2026-W47'
  function weekKey(key = today()) {
    const d = new Date(key + 'T00:00:00Z');
    const day = (d.getUTCDay() + 6) % 7; // 週一＝0
    d.setUTCDate(d.getUTCDate() - day + 3); // 該週的週四決定年份
    const y = d.getUTCFullYear();
    const jan4 = new Date(Date.UTC(y, 0, 4));
    const wk = 1 + Math.round(((d - jan4) / DAY - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
    return `${y}-W${String(wk).padStart(2, '0')}`;
  }

  // 分享用的文字（類似 Wordle）：成績、波數用方塊表示
  function shareText(key, rec) {
    const cfg = config(key);
    const v = FF.VENUES.find(x => x.id === cfg.venue);
    const p = FF.personaById(cfg.persona);
    const b = FF.brothById(cfg.broth);
    const blocks = Array.from({ length: Math.min(10, rec.wave) }, (_, i) => (i < 2 ? '🟨' : i < 5 ? '🟧' : '🟥')).join('');
    const end = rec.reason === 'anger' ? '😤' : rec.reason === 'hunger' ? '😵' : '🙄';
    const st = streak();
    return FF.G.t([
      `🍲 搶火鍋大作戰 每日同題 ${key}`,
      `${v.icon} ${v.name}・${p.icon} ${p.name}・${b.icon} ${b.short}`,
      `🏅 ${rec.score} 分　⏱ ${FF.Render.fmtTime(rec.time)}　🌊 第 ${rec.wave} 波`,
      `${blocks}${end}${st > 1 ? `　🔥 連續 ${st} 天` : ''}`,
      FF.Duel.baseUrl().replace(/\?.*$/, ''),
    ].join('\n'));
  }

  return {
    today, dateKey, msLeft, config, official, compOpts, streak, recordRun, weekKey, shareText,
    setClock(fn) { clock = fn || (() => Date.now()); },
    get now() { return clock(); },
  };
})();
