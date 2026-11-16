// 背景音樂：WebAudio 即時合成的循環配樂（旋律＋低音＋和弦＋鼓）
// 用 AudioContext 的時間預先排程（lookahead），計時器只負責「叫醒」排程器，不會飄拍。
// 選單：只放 A 段、慢一點、沒有鼓；遊戲中：A＋B 共 16 小節，波數越高越快；怒氣很高、撞車、大絕招時轉小調＋加密的鈸。
window.FF = window.FF || {};

FF.Music = (() => {
  const VOL = 0.16;          // 音樂匯流排音量（音效是 0.5，音樂要在底下）
  const LOOKAHEAD = 0.25;    // 預先排程幾秒
  const TICK_MS = 60;        // 排程器多久醒來一次

  // 每小節 8 個八分音符：數字＝MIDI 音高、-1＝延長上一個音、0＝休止
  const MELODY = [
    // A 段
    [76, 79, 76, 72, 74, 76, 79, -1],
    [74, -1, 71, 67, 69, 71, 74, -1],
    [72, 76, 81, 79, 76, -1, 72, -1],
    [69, 72, 77, 76, 74, -1, -1, 0],
    [76, 79, 84, 83, 79, 76, 79, -1],
    [74, 79, 83, 81, 79, -1, 74, -1],
    [77, 76, 74, 72, 69, 72, 77, 81],
    [79, -1, 77, 76, 74, -1, 0, 0],
    // B 段
    [81, -1, 79, 77, 76, 77, 81, -1],
    [79, -1, 77, 74, 71, 74, 79, -1],
    [76, 79, 83, 79, 76, -1, 71, -1],
    [69, 72, 76, 81, 79, 76, 72, -1],
    [77, -1, 76, 74, 69, 74, 77, 81],
    [83, -1, 81, 79, 74, 79, 83, 86],
    [84, -1, 79, 76, 72, 76, 79, -1],
    [84, -1, -1, -1, 0, 0, 67, 71],
  ];
  // 每小節的和弦：[根音 MIDI, 是否小三和弦]
  const CHORDS = [
    [48, 0], [43, 0], [45, 1], [41, 0], [48, 0], [43, 0], [41, 0], [43, 0],
    [41, 0], [43, 0], [40, 1], [45, 1], [38, 1], [43, 0], [48, 0], [48, 0],
  ];

  let enabled = true;
  let scene = 'menu';
  let paused = false;
  let hidden = false;
  let wave = 1;
  let tension = false;
  let timer = null;
  let nextT = 0;
  let step = 0;
  let live = 0;
  let created = 0;

  const A = () => FF.Audio;
  const ctx = () => A().ctx;

  function bars() { return scene === 'game' ? 16 : 8; }
  function tempo() { return scene === 'game' ? Math.min(144, 112 + 4 * (wave - 1)) : 96; }

  // 緊張時轉成同主音小調：Mi、La、Si 降半音
  function minor(n) {
    const pc = ((n % 12) + 12) % 12;
    return pc === 4 || pc === 9 || pc === 11 ? n - 1 : n;
  }
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);

  function track(node) {
    live++;
    created++;
    node.onended = () => { live--; };
  }

  function note(n, t, dur, { type = 'triangle', vol = 0.15, attack = 0.012 } = {}) {
    const c = ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(hz(n), t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(vol * 0.6, t + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(A().musicBus);
    track(o);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function kick(t) {
    const c = ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(A().musicBus);
    track(o);
    o.start(t);
    o.stop(t + 0.18);
  }

  function noiseHit(t, { freq, type, vol, dur }) {
    const c = ctx();
    const buf = A().noiseBuf;
    if (!buf) return;
    const s = c.createBufferSource();
    s.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(A().musicBus);
    track(s);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  // 排一個八分音符格子
  function scheduleStep(i, t, eighth) {
    const bar = Math.floor(i / 8);
    const pos = i % 8;
    const game = scene === 'game';
    const tense = game && tension;
    const tr = n => (tense ? minor(n) : n);
    // 旋律
    const row = MELODY[bar];
    const n = row[pos];
    if (n > 0) {
      let len = 1;
      while (pos + len < 8 && row[pos + len] === -1) len++;
      note(tr(n), t, eighth * len * 0.92, { type: game ? 'square' : 'triangle', vol: game ? 0.05 : 0.13 });
      if (game) note(tr(n) + 12, t, eighth * len * 0.6, { type: 'sine', vol: 0.035 });
    }
    // 低音：碰-恰-碰-恰（緊張時改成一直八分音符）
    const [root, isMinor] = CHORDS[bar];
    const r = tr(root - 12);
    if (tense) note(pos % 2 ? r + 12 : r, t, eighth * 0.8, { type: 'triangle', vol: 0.2 });
    else if (pos === 0 || pos === 4) note(r, t, eighth * 1.6, { type: 'triangle', vol: 0.22 });
    else if (pos === 2 || pos === 6) note(r + (pos === 2 ? 7 : 12), t, eighth * 0.9, { type: 'triangle', vol: 0.14 });
    // 反拍和弦（可愛的「恰」）
    if (game && (pos === 2 || pos === 6)) {
      const third = isMinor ? 3 : 4;
      [12, 12 + third, 19].forEach(iv => note(tr(root + iv), t, eighth * 0.45, { type: 'square', vol: 0.016, attack: 0.005 }));
    } else if (!game && pos === 0) {
      const third = isMinor ? 3 : 4;
      [12, 12 + third, 19].forEach(iv => note(root + iv, t, eighth * 7, { type: 'sine', vol: 0.03, attack: 0.08 }));
    }
    // 鼓
    if (game) {
      if (pos === 0 || pos === 4) kick(t);
      if (pos === 2 || pos === 6) noiseHit(t, { freq: 1800, type: 'bandpass', vol: 0.16, dur: 0.09 });
      noiseHit(t, { freq: 7500, type: 'highpass', vol: pos % 2 ? 0.035 : 0.05, dur: 0.03 });
      if (tense) noiseHit(t + eighth / 2, { freq: 7500, type: 'highpass', vol: 0.035, dur: 0.025 });
    } else if (pos % 2 === 1) {
      noiseHit(t, { freq: 8000, type: 'highpass', vol: 0.018, dur: 0.03 });
    }
  }

  function tick() {
    const c = ctx();
    if (!c || c.state !== 'running') return;
    const now = c.currentTime;
    if (nextT < now - 0.05) nextT = now + 0.05; // 落後太多（例如卡頓）就重新對齊，不要一口氣補播
    const eighth = 60 / tempo() / 2;
    while (nextT < now + LOOKAHEAD) {
      scheduleStep(step, nextT, eighth);
      nextT += eighth;
      step = (step + 1) % (bars() * 8);
    }
  }

  function targetVol() {
    if (!enabled || hidden) return 0;
    return paused ? VOL * 0.3 : VOL;
  }

  // 依目前狀態開關排程器與音量
  function refresh() {
    const c = ctx();
    const bus = A().musicBus;
    if (!c || !bus) return;
    const v = targetVol();
    try {
      bus.gain.cancelScheduledValues(c.currentTime);
      bus.gain.setValueAtTime(bus.gain.value, c.currentTime);
      bus.gain.linearRampToValueAtTime(v, c.currentTime + 0.3);
    } catch (e) { /* 忽略 */ }
    const run = enabled && !hidden;
    if (run && !timer) {
      nextT = c.currentTime + 0.1;
      timer = setInterval(tick, TICK_MS);
      tick();
    } else if (!run && timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function setScene(s) {
    if (s === scene) return;
    scene = s;
    step = 0;
    tension = false;
    const c = ctx();
    if (c) nextT = Math.max(nextT, c.currentTime + 0.05);
    refresh();
  }

  A().onUnlock(refresh);

  return {
    setEnabled(v) { enabled = !!v; refresh(); },
    setScene,
    setPaused(v) { if (paused !== !!v) { paused = !!v; refresh(); } },
    setHidden(v) { hidden = !!v; refresh(); },
    // 每幀由主迴圈呼叫：波數與是否緊張
    setIntensity(w, tense) {
      wave = w || 1;
      tension = !!tense;
    },
    stats() {
      const c = ctx();
      return { live, created, running: !!timer, scene, tempo: tempo(), tension, nextT, now: c ? c.currentTime : 0, step };
    },
  };
})();
