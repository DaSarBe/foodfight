// WebAudio 即時合成音效，第一次使用者互動後才建立 AudioContext
window.FF = window.FF || {};

FF.Audio = (() => {
  let ctx = null;
  let master = null;
  let muted = false;
  let noiseBuf = null;

  function unlock() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) {
      ctx = null;
    }
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.5;
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
    item: () => { tone(700, 0.08, { type: 'triangle', vol: 0.2 }); tone(1050, 0.12, { type: 'triangle', vol: 0.2, delay: 0.06 }); },
    coin: () => { tone(988, 0.07, { type: 'square', vol: 0.12 }); tone(1319, 0.18, { type: 'square', vol: 0.12, delay: 0.07 }); },
    wave: () => [523, 659, 784].forEach((f, i) => tone(f, 0.14, { type: 'triangle', vol: 0.2, delay: i * 0.09 })),
    rare: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, { type: 'sine', vol: 0.18, delay: i * 0.06 })),
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
  };

  return {
    unlock,
    setMuted,
    play(name, arg) {
      try { sfx[name] && sfx[name](arg); } catch (e) { /* 忽略音效錯誤 */ }
    },
  };
})();
