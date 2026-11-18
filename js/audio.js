// WebAudio 即時合成音效，第一次使用者互動後才建立 AudioContext
// 音效與背景音樂走不同的音量匯流排：sfx → out、music → out，可以分開開關
window.FF = window.FF || {};

FF.Audio = (() => {
  let ctx = null;
  let out = null;     // 總輸出
  let master = null;  // 音效匯流排
  let musicBus = null;
  let muted = false;
  let noiseBuf = null;
  let hidden = false; // 分頁隱藏時暫停整個 AudioContext
  const unlockCbs = [];

  function unlock() {
    if (ctx) {
      if (ctx.state === 'suspended' && !hidden) ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      out = ctx.createGain();
      out.gain.value = 1;
      out.connect(ctx.destination);
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(out);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0;
      musicBus.connect(out);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) {
      ctx = null;
      return;
    }
    unlockCbs.forEach(fn => { try { fn(); } catch (e) { /* 忽略 */ } });
    setTimeout(() => { loadSamples().catch(() => {}); }, 300); // 背景預載，不擋遊戲開始
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.5;
  }

  // 分頁隱藏：暫停 AudioContext（音樂排程器也會停）；回來再恢復
  function setHidden(h) {
    hidden = h;
    if (!ctx) return;
    try {
      if (h && ctx.state === 'running') ctx.suspend();
      else if (!h && ctx.state === 'suspended') ctx.resume();
    } catch (e) { /* 忽略 */ }
  }

  function tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0 } = {}) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function noise(dur, { vol = 0.3, freq = 1200, q = 1, sweep = 0, delay = 0, type = 'bandpass' } = {}) {
    if (!ctx || muted || !noiseBuf) return;
    const t0 = ctx.currentTime + delay;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t0);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(50, freq + sweep), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t0);
    s.stop(t0 + dur + 0.02);
  }

  const sfx = {
    click: () => tone(660, 0.06, { type: 'triangle', vol: 0.2 }),
    reach: () => noise(0.08, { vol: 0.12, freq: 2500, sweep: 1500 }),
    grab: () => { tone(520, 0.08, { type: 'triangle', vol: 0.25, slide: 300 }); },
    miss: () => tone(300, 0.18, { type: 'square', vol: 0.12, slide: -120 }),
    perfect: () => { tone(880, 0.1, { type: 'triangle', vol: 0.25 }); tone(1320, 0.16, { type: 'triangle', vol: 0.22, delay: 0.07 }); },
    okay: () => tone(600, 0.12, { type: 'triangle', vol: 0.2 }),
    raw: () => tone(140, 0.3, { type: 'sawtooth', vol: 0.15, slide: -40 }),
    warn: () => { tone(1100, 0.07, { type: 'square', vol: 0.15 }); tone(1100, 0.07, { type: 'square', vol: 0.15, delay: 0.1 }); },
    hit: () => { noise(0.18, { vol: 0.6, freq: 400, q: 0.7, type: 'lowpass' }); tone(180, 0.15, { type: 'square', vol: 0.25, slide: -100 }); },
    // 閃避：咻（風切）→ 她的筷子撲空「喀」→ 低音收尾 → 上揚的叮叮叮（連續閃避音調越來越高）
    dodge: (streak = 1) => {
      const up = Math.pow(2, Math.min(streak - 1, 7) / 12);
      noise(0.2, { vol: 0.45, freq: 500, sweep: 4500, q: 1.5 });
      noise(0.12, { vol: 0.25, freq: 6000, sweep: -3000, q: 3, delay: 0.03 });
      noise(0.035, { vol: 0.5, freq: 3200, q: 4, delay: 0.09 });
      tone(1900, 0.04, { type: 'square', vol: 0.12, delay: 0.09 });
      tone(150, 0.16, { type: 'sine', vol: 0.4, slide: -90, delay: 0.02 });
      [1047, 1319, 1568, 2093].forEach((f, i) =>
        tone(f * up, 0.14, { type: 'triangle', vol: 0.2, delay: 0.12 + i * 0.045 }));
      tone(2093 * up * 1.5, 0.3, { type: 'sine', vol: 0.1, delay: 0.3 });
    },
    splash: () => noise(0.25, { vol: 0.2, freq: 900, sweep: -500, q: 0.8 }),
    gfEat: () => { tone(400, 0.06, { type: 'sine', vol: 0.15 }); tone(480, 0.06, { type: 'sine', vol: 0.15, delay: 0.09 }); },
    angry: () => { tone(220, 0.12, { type: 'sawtooth', vol: 0.15 }); tone(200, 0.16, { type: 'sawtooth', vol: 0.15, delay: 0.12 }); },
    item: () => sfx.useItem(), // 花飯票購買（有取樣；沒載入時退回這個合成音）
    useItem: () => { tone(700, 0.08, { type: 'triangle', vol: 0.2 }); tone(1050, 0.12, { type: 'triangle', vol: 0.2, delay: 0.06 }); }, // 遊戲中使用道具（只有合成音）
    coin: () => { tone(988, 0.07, { type: 'square', vol: 0.12 }); tone(1319, 0.18, { type: 'square', vol: 0.12, delay: 0.07 }); },
    wave: () => [523, 659, 784].forEach((f, i) => tone(f, 0.14, { type: 'triangle', vol: 0.2, delay: i * 0.09 })),
    rare: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, { type: 'sine', vol: 0.18, delay: i * 0.06 })),
    // 解鎖（成就、新場地、下一關、免費解鎖）：沿用原本成就解鎖時的閃亮琶音當退回音
    unlock: () => sfx.rare(),
    gameover: () => [440, 370, 311, 262].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.22, delay: i * 0.18 })),
    bell: () => { tone(2093, 0.5, { type: 'sine', vol: 0.25 }); tone(2637, 0.4, { type: 'sine', vol: 0.12, delay: 0.01 }); },
    ooh: () => { tone(500, 0.25, { type: 'triangle', vol: 0.18, slide: 300 }); tone(700, 0.3, { type: 'triangle', vol: 0.14, slide: 400, delay: 0.12 }); },
    screech: () => {
      tone(1400, 1.1, { type: 'sawtooth', vol: 0.1, slide: -500 });
      tone(1460, 1.1, { type: 'sawtooth', vol: 0.08, slide: -520 });
      noise(1.1, { vol: 0.25, freq: 3000, q: 6, sweep: -1200 });
      [0, 0.3, 0.6, 0.9].forEach(d => tone(880, 0.15, { type: 'square', vol: 0.1, delay: d }));
    },
    crash: () => {
      noise(0.6, { vol: 0.9, freq: 300, q: 0.5, type: 'lowpass' });
      noise(0.5, { vol: 0.5, freq: 5000, q: 1, delay: 0.05 });
      tone(90, 0.5, { type: 'sine', vol: 0.6, slide: -50 });
      [0.1, 0.18, 0.27, 0.4].forEach(d => noise(0.08, { vol: 0.25, freq: 6000 + d * 4000, q: 8, delay: d }));
    },
    hero: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.22, delay: i * 0.08 })),
    error: () => tone(200, 0.15, { type: 'square', vol: 0.12 }),
    // 大絕招：低音轟一聲 + 往上衝的蓄力音 + 兩聲重鼓
    ult: () => {
      noise(0.5, { vol: 0.6, freq: 200, q: 0.6, type: 'lowpass' });
      tone(110, 0.9, { type: 'sawtooth', vol: 0.16, slide: 440 });
      tone(165, 0.9, { type: 'square', vol: 0.08, slide: 660, delay: 0.05 });
      [0.55, 0.8].forEach(d => { tone(80, 0.18, { type: 'sine', vol: 0.5, slide: -40, delay: d }); noise(0.1, { vol: 0.4, freq: 800, delay: d }); });
      tone(1760, 0.25, { type: 'triangle', vol: 0.12, delay: 0.9 });
    },
    swipe: () => { noise(0.12, { vol: 0.35, freq: 1500, sweep: 3500, q: 2 }); tone(900, 0.06, { type: 'triangle', vol: 0.1, slide: 500 }); },
    // 餵食：「啊～」上滑 + 「嗯！」+ 叮叮
    feed: () => {
      tone(500, 0.18, { type: 'sine', vol: 0.2, slide: 300 });
      tone(700, 0.1, { type: 'sine', vol: 0.18, delay: 0.2 });
      [1319, 1568, 2093].forEach((f, i) => tone(f, 0.16, { type: 'triangle', vol: 0.14, delay: 0.3 + i * 0.07 }));
    },
    yuck: () => { tone(330, 0.35, { type: 'sawtooth', vol: 0.12, slide: -180 }); tone(260, 0.3, { type: 'square', vol: 0.06, slide: -120, delay: 0.12 }); },
  };

  // ---------- 取樣音效（mp3）----------
  // 第一次互動、AudioContext 建立後，在背景逐檔 fetch + decodeAudioData；
  // 還沒載好、解碼失敗、file://、不支援時一律退回上面的合成音（合成音程式都還在）。
  // g：相對音量（候選 mp3 響度約為合成音的 3 倍，試聽頁壓到 0.4）；rate：隨機變速範圍
  const SAMPLE_GAIN = 0.4;
  const MAX_VOICES = 3;
  const SAMPLES = {
    click: { g: 0.7, rate: [0.97, 1.04] },
    grab: { rate: [0.94, 1.08] },
    hit: { rate: [0.96, 1.04] },
    miss: { g: 0.85 },
    coin: { rate: [0.97, 1.04] },
    item: {},
    unlock: {},
    rare: {},
    feed: {},
    yuck: {},
    angry: { rate: [0.97, 1.03] },
    ooh: {},
    screech: {},
    crash: {},
    splash: { rate: [0.92, 1.1] },
  };
  const buffers = {};   // name -> AudioBuffer（載好才有）
  const voices = {};    // name -> 目前正在播的 source
  let loadStarted = false;

  function decode(data) {
    // 舊版 Safari 只有 callback 形式
    return new Promise((resolve, reject) => {
      try {
        const r = ctx.decodeAudioData(data, resolve, reject);
        if (r && typeof r.then === 'function') r.then(resolve, reject);
      } catch (e) { reject(e); }
    });
  }

  async function loadSamples() {
    if (loadStarted || !ctx) return;
    loadStarted = true;
    if (typeof fetch !== 'function' || location.protocol === 'file:') return; // file:// 抓不到，直接用合成音
    for (const name of Object.keys(SAMPLES)) {
      try {
        const res = await fetch('sfx/' + name + '.mp3');
        if (!res.ok) continue;
        const buf = await decode(await res.arrayBuffer());
        if (buf) buffers[name] = buf;
      } catch (e) { /* 這個音效就用合成音 */ }
      await new Promise(r => setTimeout(r, 30)); // 一檔一檔來，不跟遊戲搶主執行緒
    }
  }

  function playSample(name) {
    const buf = buffers[name];
    const cfg = SAMPLES[name];
    if (!buf || !cfg || !ctx || !master) return false;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      if (cfg.rate) src.playbackRate.value = cfg.rate[0] + Math.random() * (cfg.rate[1] - cfg.rate[0]);
      const g = ctx.createGain();
      g.gain.value = SAMPLE_GAIN * (cfg.g || 1);
      src.connect(g).connect(master);
      const list = voices[name] || (voices[name] = []);
      const v = { src, g };
      while (list.length >= MAX_VOICES) { // 同一種最多 3 個同時，最舊的快速淡出
        const old = list.shift();
        try {
          old.g.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
          old.src.stop(ctx.currentTime + 0.08);
        } catch (e) { /* 忽略 */ }
      }
      list.push(v);
      src.onended = () => {
        const i = list.indexOf(v);
        if (i >= 0) list.splice(i, 1);
        try { src.disconnect(); g.disconnect(); } catch (e) { /* 忽略 */ }
      };
      src.start();
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    unlock,
    setMuted,
    setHidden,
    onUnlock(fn) { unlockCbs.push(fn); },
    get ctx() { return ctx; },
    get musicBus() { return musicBus; },
    get noiseBuf() { return noiseBuf; },
    get sampleNames() { return Object.keys(buffers); }, // 測試用：已載入的取樣
    play(name, arg) {
      if (!ctx || muted) return;
      try {
        if (buffers[name] && playSample(name)) return;
        sfx[name] && sfx[name](arg);
      } catch (e) { /* 忽略音效錯誤 */ }
    },
  };
})();
