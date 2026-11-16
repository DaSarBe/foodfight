// 場地背景（女友身後的窗外）與突發事件畫面
window.FF = window.FF || {};

FF.Scenes = (() => {
  const W = 540;
  const TOP = 0;
  const BOTTOM = 258;
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const TEXT_FONT = '"PingFang TC","Noto Sans TC","Microsoft JhengHei","WenQuanYi Zen Hei",sans-serif';

  function emoji(ctx, ch, x, y, size) {
    ctx.font = `${size}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, x, y);
  }

  function text(ctx, str, x, y, size, color, { align = 'center', stroke = null, strokeW = 4 } = {}) {
    ctx.font = `bold ${size}px ${TEXT_FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (stroke) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = strokeW;
      ctx.strokeStyle = stroke;
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrap(ctx, str, maxW, size) {
    ctx.font = `bold ${size}px ${TEXT_FONT}`;
    const lines = [];
    let cur = '';
    for (const ch of FF.G.units(str)) {
      if (ctx.measureText(cur + ch).width > maxW) {
        lines.push(cur);
        cur = ch;
      } else cur += ch;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // 固定的偽隨機，讓建築物每格位置穩定
  const rnd = i => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  function sky(ctx, top, bottom) {
    const g = ctx.createLinearGradient(0, TOP, 0, BOTTOM);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, TOP, W, BOTTOM);
  }

  function buildings(ctx, baseY, colors, litColor, count, seed, minH, maxH, time, flicker) {
    let x = -10;
    for (let i = 0; i < count; i++) {
      const w = 34 + rnd(seed + i) * 34;
      const h = minH + rnd(seed + i * 7) * (maxH - minH);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x, baseY - h, w, h);
      ctx.fillStyle = litColor;
      for (let wy = baseY - h + 8; wy < baseY - 8; wy += 14) {
        for (let wx = x + 6; wx < x + w - 8; wx += 11) {
          const k = rnd(seed + wx * 3 + wy);
          const on = flicker ? k > 0.45 + 0.1 * Math.sin(time * 0.5 + k * 9) : k > 0.5;
          if (on) ctx.fillRect(wx, wy, 5, 7);
        }
      }
      x += w + 2;
    }
  }

  function traffic(ctx, venue, time, laneY, speed, seed, size = 30) {
    const list = venue.traffic;
    const span = W + 240;
    for (let i = 0; i < 4; i++) {
      const sp = speed * (0.8 + rnd(seed + i) * 0.5);
      const off = rnd(seed + i * 13) * span;
      const x = W + 100 - ((time * sp + off) % span);
      emoji(ctx, list[(i + seed) % list.length], x, laneY, size);
    }
  }

  function road(ctx, y, h, time) {
    ctx.fillStyle = '#5a5a60';
    ctx.fillRect(0, y, W, h);
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(0, y - 6, W, 6);
    ctx.fillStyle = '#f5e27a';
    const off = (time * 120) % 60;
    for (let x = -60; x < W + 60; x += 60) ctx.fillRect(x - off, y + h / 2 - 2, 30, 4);
  }

  const drawers = {
    city(ctx, venue, time) {
      sky(ctx, '#7fb8ff', '#d9eeff');
      emoji(ctx, '☁️', 80 + ((time * 6) % 600) - 60, 92, 40);
      emoji(ctx, '☁️', 420 - ((time * 4) % 600) + 120, 120, 30);
      buildings(ctx, 200, ['#8ea4c2', '#7d93b3', '#9fb2cc'], 'rgba(255,240,170,0.75)', 14, 3, 70, 150, time, false);
      buildings(ctx, 204, ['#5f7593', '#6b819f'], 'rgba(255,240,170,0.9)', 12, 41, 40, 95, time, false);
      road(ctx, 210, 48, time);
      traffic(ctx, venue, time, 224, 140, 2, 30);
      traffic(ctx, venue, time + 3, 246, 90, 7, 28);
    },
    market(ctx, venue, time) {
      sky(ctx, '#1d1546', '#4a2f6e');
      buildings(ctx, 160, ['#2b2350', '#352a5e'], 'rgba(255,200,120,0.7)', 12, 9, 40, 90, time, true);
      // 攤位
      for (let i = 0; i < 6; i++) {
        const x = i * 92 - 6;
        ctx.fillStyle = '#ffcf86';
        ctx.fillRect(x, 168, 86, 52);
        for (let s = 0; s < 6; s++) {
          ctx.fillStyle = s % 2 ? '#ffffff' : (i % 2 ? '#e8414f' : '#2f8fd8');
          ctx.beginPath();
          ctx.moveTo(x + s * 15, 150);
          ctx.lineTo(x + s * 15 + 15, 150);
          ctx.lineTo(x + s * 15 + 18, 170);
          ctx.lineTo(x + s * 15 - 3, 170);
          ctx.fill();
        }
        emoji(ctx, ['🍢', '🦑', '🧋', '🍡', '🌭', '🎯'][i], x + 43, 196, 26);
      }
      // 燈籠
      for (let i = 0; i < 9; i++) {
        const x = 20 + i * 62;
        const sw = Math.sin(time * 2 + i) * 3;
        const g = ctx.createRadialGradient(x + sw, 126, 2, x + sw, 126, 24);
        g.addColorStop(0, 'rgba(255,180,90,0.7)');
        g.addColorStop(1, 'rgba(255,180,90,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x + sw, 126, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e8312f';
        ctx.beginPath();
        ctx.ellipse(x + sw, 126, 9, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#3b3346';
      ctx.fillRect(0, 222, W, 36);
      // 人潮
      for (let i = 0; i < 18; i++) {
        const x = ((i * 37 + time * (i % 2 ? 18 : -14)) % (W + 40) + W + 40) % (W + 40) - 20;
        ctx.fillStyle = i % 3 ? '#1c1626' : '#2a2236';
        ctx.beginPath();
        ctx.arc(x, 236 + (i % 3) * 6, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 10, 242 + (i % 3) * 6, 20, 20);
      }
      traffic(ctx, venue, time, 246, 50, 5, 26);
    },
    beach(ctx, venue, time) {
      sky(ctx, '#5fb4ff', '#ffd59a');
      const sun = ctx.createRadialGradient(100, 150, 5, 100, 150, 60);
      sun.addColorStop(0, '#fff6c2');
      sun.addColorStop(0.4, '#ffd36b');
      sun.addColorStop(1, 'rgba(255,211,107,0)');
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(100, 150, 60, 0, Math.PI * 2);
      ctx.fill();
      // 海
      const sea = ctx.createLinearGradient(0, 158, 0, 214);
      sea.addColorStop(0, '#2f9bd8');
      sea.addColorStop(1, '#5fd0e8');
      ctx.fillStyle = sea;
      ctx.fillRect(0, 158, W, 56);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      for (let r = 0; r < 4; r++) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 10) {
          const y = 168 + r * 12 + Math.sin(x * 0.05 + time * 2 + r) * 2;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      emoji(ctx, '⛵', ((time * 10) % 640) - 50, 170, 26);
      emoji(ctx, '🏄', W - ((time * 25 + 200) % 640) + 50, 196, 24);
      // 沙灘
      ctx.fillStyle = '#f3d9a4';
      ctx.beginPath();
      ctx.moveTo(0, 214);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 212 + Math.sin(x * 0.1 + time * 1.5) * 2);
      ctx.lineTo(W, BOTTOM);
      ctx.lineTo(0, BOTTOM);
      ctx.fill();
      emoji(ctx, '🌴', 34, 196, 64);
      emoji(ctx, '🌴', 506, 190, 70);
      emoji(ctx, '⛱️', 150, 228, 30);
      traffic(ctx, venue, time, 244, 70, 3, 26);
    },
    countdown(ctx, venue, time) {
      sky(ctx, '#080c2c', '#27336a');
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.4 * Math.sin(time * 2 + i)})`;
        ctx.fillRect(rnd(i) * W, 60 + rnd(i + 50) * 80, 2, 2);
      }
      // 煙火
      for (let k = 0; k < 3; k++) {
        const raw = time * 0.45 + k * 0.33;
        const ph = raw % 1;
        const id = Math.floor(raw) * 3 + k;
        const cx = 60 + rnd(id) * 420;
        const cy = 85 + rnd(id + 9) * 50;
        const col = ['#ff5a7a', '#ffd84a', '#6fe0ff', '#b48aff'][id % 4];
        ctx.globalAlpha = Math.max(0, 1 - ph);
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        for (let r = 0; r < 14; r++) {
          const a = (r / 14) * Math.PI * 2;
          const d1 = ph * 50;
          const d2 = ph * 50 + 8;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * d1, cy + Math.sin(a) * d1 + ph * 10);
          ctx.lineTo(cx + Math.cos(a) * d2, cy + Math.sin(a) * d2 + ph * 10);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      // 高塔
      ctx.fillStyle = '#1a2148';
      ctx.beginPath();
      ctx.moveTo(452, 60);
      ctx.lineTo(462, 60);
      ctx.lineTo(482, 205);
      ctx.lineTo(432, 205);
      ctx.closePath();
      ctx.fill();
      for (let y = 80; y < 200; y += 18) {
        ctx.fillStyle = `rgba(120,255,200,${0.5 + 0.3 * Math.sin(time * 3 + y)})`;
        ctx.fillRect(445 - (y - 60) * 0.1, y, 24 + (y - 60) * 0.2, 3);
      }
      buildings(ctx, 210, ['#141a3d', '#1c2350'], 'rgba(255,230,150,0.8)', 13, 77, 40, 110, time, true);
      road(ctx, 214, 44, time);
      traffic(ctx, venue, time, 230, 110, 4, 28);
      // 人潮與螢光棒
      for (let i = 0; i < 16; i++) {
        const x = i * 36 + 10;
        ctx.fillStyle = '#0d1030';
        ctx.beginPath();
        ctx.arc(x, 252, 10, 0, Math.PI * 2);
        ctx.fill();
        if (i % 3 === 0) {
          ctx.strokeStyle = ['#ff5a7a', '#6fe0ff', '#ffd84a'][i % 3 === 0 ? (i / 3) % 3 : 0];
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x + 6, 246);
          ctx.lineTo(x + 12 + Math.sin(time * 6 + i) * 4, 232);
          ctx.stroke();
        }
      }
    },
  };

  function windowFrame(ctx) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(40, 60);
    ctx.lineTo(120, 60);
    ctx.lineTo(60, 250);
    ctx.lineTo(-20, 250);
    ctx.fill();
    ctx.fillStyle = '#7a4a26';
    ctx.fillRect(0, 54, W, 8);
    ctx.fillRect(0, 248, W, 10);
    ctx.fillRect(0, 54, 8, 204);
    ctx.fillRect(W - 8, 54, 8, 204);
  }

  function drawBackground(ctx, venue, time, game) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, BOTTOM);
    ctx.clip();
    (drawers[venue.id] || drawers.city)(ctx, venue, time);
    if (game) {
      drawAccident(ctx, game, time);
      drawCrashVehicle(ctx, game, time);
    }
    ctx.restore();
    windowFrame(ctx);
  }

  function drawAccident(ctx, game, time) {
    const a = game.accident;
    if (!a) return;
    const k = Math.min(1, a.t * 4, (a.life - a.t) * 3);
    ctx.globalAlpha = Math.max(0, k);
    const y = 112 - Math.abs(Math.sin(time * 6)) * 8;
    const glow = ctx.createRadialGradient(a.x, y, 4, a.x, y, 44);
    glow.addColorStop(0, 'rgba(255,255,180,0.9)');
    glow.addColorStop(1, 'rgba(255,255,180,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(a.x, y, 44, 0, Math.PI * 2);
    ctx.fill();
    emoji(ctx, a.def.emoji, a.x, y, 46);
    emoji(ctx, '❗', a.x + 26, y - 26, 22);
    ctx.globalAlpha = 1;
  }

  function drawAccidentCaption(ctx, game) {
    const a = game.accident;
    if (!a) return;
    const k = Math.min(1, a.t * 4, (a.life - a.t) * 3);
    ctx.globalAlpha = Math.max(0, k);
    const lines = wrap(ctx, '外面：' + a.def.text, 150, 13);
    const h = lines.length * 17 + 10;
    const x = 368;
    const y = 222 - h;
    ctx.fillStyle = 'rgba(30,15,5,0.78)';
    roundRect(ctx, x, y, 164, h, 9);
    ctx.fill();
    lines.forEach((l, i) => text(ctx, l, x + 82, y + 13 + i * 17, 13, '#fff3c4'));
    ctx.globalAlpha = 1;
  }

  function drawCrashVehicle(ctx, game, time) {
    const c = game.crash;
    if (!c) return;
    const v = game.venue.vehicle;
    if (c.phase === 'warn') {
      const k = Math.min(1, c.t / 1.3);
      const x = 470 - k * 200;
      const size = 40 + k * k * 150;
      if (Math.sin(time * 30) > 0) {
        const g = ctx.createRadialGradient(x, 200, 5, x, 200, 120 * k + 30);
        g.addColorStop(0, 'rgba(255,255,200,0.9)');
        g.addColorStop(1, 'rgba(255,255,200,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, BOTTOM);
      }
      emoji(ctx, v.emoji, x, 200 - k * 20, size);
    }
  }

  function drawCracks(ctx, cx, cy) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + rnd(i) * 0.4;
      let x = cx;
      let y = cy;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        const len = 30 + rnd(i * 5 + s) * 40;
        const aa = a + (rnd(i * 9 + s) - 0.5) * 0.6;
        x += Math.cos(aa) * len;
        y += Math.sin(aa) * len;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // 前景：推銷卡、撞車按鈕、換桌轉場
  function drawEvents(ctx, game, time) {
    drawAccidentCaption(ctx, game);
    drawWaiter(ctx, game, time);
    drawCrash(ctx, game, time);
  }

  function drawWaiter(ctx, game, time) {
    const w = game.waiter;
    if (!w) return;
    const L = FF.EVENT_LAYOUT;
    const v = game.venue.waiter;
    let wx = 470;
    if (w.phase === 'in') wx = 640 - (w.t / 0.45) * 170;
    if (w.phase === 'out') wx = 470 + (w.t / 0.45) * 170;
    if (w.phase === 'pitch') {
      const C = L.card;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      roundRect(ctx, C.x + 4, C.y + 6, C.w, C.h, 16);
      ctx.fill();
      ctx.fillStyle = '#fffdf6';
      roundRect(ctx, C.x, C.y, C.w, C.h, 16);
      ctx.fill();
      ctx.strokeStyle = '#ffb36b';
      ctx.lineWidth = 3;
      ctx.stroke();
      // 剩餘時間
      const left = Math.max(0, 1 - w.t / w.life);
      ctx.fillStyle = '#ffd7a8';
      roundRect(ctx, C.x + 14, C.y + 8, (C.w - 28) * left, 5, 2.5);
      ctx.fill();
      text(ctx, `${v.name}：`, C.x + 18, C.y + 28, 16, '#c2412b', { align: 'left' });
      const lines = wrap(ctx, w.text, C.w - 36, 15).slice(0, 4);
      lines.forEach((l, i) => text(ctx, l, C.x + 18, C.y + 52 + i * 20, 15, '#5a2a14', { align: 'left' }));
      const btn = (r, label, bg, fg, sh) => {
        ctx.fillStyle = sh;
        roundRect(ctx, r.x, r.y + 4, r.w, r.h, 12);
        ctx.fill();
        ctx.fillStyle = bg;
        roundRect(ctx, r.x, r.y, r.w, r.h, 12);
        ctx.fill();
        text(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + 1, 16, fg);
      };
      // 文字多時把按鈕往下移
      const by = Math.max(0, lines.length - 4) * 20;
      btn({ ...L.btnNo, y: L.btnNo.y + by }, '不用，謝謝 🙅', '#ffe2c2', '#7a3b12', '#d9a06a');
      btn({ ...L.btnBuy, y: L.btnBuy.y + by }, '好啦買一個（-30分）', '#ffcf4a', '#6b3a00', '#c9800f');
    }
    ctx.save();
    ctx.translate(wx, 520 + Math.sin(time * 8) * 2);
    if (w.phase !== 'pitch') ctx.rotate(Math.sin(time * 14) * 0.08);
    emoji(ctx, v.emoji, 0, 0, 84);
    ctx.restore();
    if (w.phase === 'pitch') emoji(ctx, '💬', wx - 52, 482, 30);
    if (w.phase === 'out' && w.bye) text(ctx, w.bye, Math.min(wx, 420), 466, 15, '#fff', { stroke: 'rgba(0,0,0,0.6)', strokeW: 4 });
    if (w.phase === 'in') emoji(ctx, '🔔', wx - 46, 478, 26);
  }

  function drawCrash(ctx, game, time) {
    const c = game.crash;
    if (!c) return;
    const v = game.venue.vehicle;
    if (c.phase === 'warn') {
      ctx.fillStyle = 'rgba(120,0,0,0.55)';
      ctx.fillRect(0, 420, W, 90);
      text(ctx, `⚠️ ${v.name}衝過來了！`, 270, 465, 30, '#ffe066', { stroke: '#5a0000', strokeW: 7 });
    } else if (c.phase === 'escape') {
      drawCracks(ctx, 300, 180);
      ctx.save();
      ctx.translate(420, 220);
      ctx.rotate(-0.25 + Math.sin(time * 40) * 0.02);
      emoji(ctx, v.emoji, 0, 0, 170);
      ctx.restore();
      emoji(ctx, '💨', 330, 250, 50);
      ctx.fillStyle = `rgba(255,0,0,${0.18 + 0.12 * Math.sin(time * 16)})`;
      ctx.fillRect(0, 0, W, 960);
      const L = FF.EVENT_LAYOUT.escape;
      const pulse = 1 + Math.sin(time * 14) * 0.05;
      ctx.save();
      ctx.translate(L.x + L.w / 2, L.y + L.h / 2);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#7a1a0a';
      roundRect(ctx, -L.w / 2, -L.h / 2 + 6, L.w, L.h, 22);
      ctx.fill();
      ctx.fillStyle = '#ff5a3c';
      roundRect(ctx, -L.w / 2, -L.h / 2, L.w, L.h, 22);
      ctx.fill();
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 4;
      ctx.stroke();
      text(ctx, '🏃 帶她換桌！', 0, -8, 30, '#fff', { stroke: '#7a1a0a', strokeW: 6 });
      const left = Math.max(0, 1 - c.t / c.limit);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      roundRect(ctx, -L.w / 2 + 24, 20, L.w - 48, 10, 5);
      ctx.fill();
      ctx.fillStyle = left > 0.35 ? '#ffe066' : '#ffffff';
      roundRect(ctx, -L.w / 2 + 24, 20, (L.w - 48) * left, 10, 5);
      ctx.fill();
      ctx.restore();
      text(ctx, '車子撞進來了！快點按鈕！', 270, 580, 20, '#fff', { stroke: '#7a1a0a', strokeW: 5 });
    } else if (c.phase === 'moving') {
      const k = Math.sin(Math.PI * Math.min(1, c.t / 1.1));
      ctx.fillStyle = `rgba(20,8,2,${k})`;
      ctx.fillRect(0, 0, W, 960);
      ctx.globalAlpha = k;
      if (c.success) {
        text(ctx, '🏃‍♂️💨🏃‍♀️', 270, 440, 50, '#fff');
        text(ctx, `換到第 ${game.tableNo + (c.applied ? 0 : 1)} 桌，繼續吃！`, 270, 510, 26, '#ffe066');
      } else {
        text(ctx, '😱', 270, 440, 60, '#fff');
        text(ctx, '你愣住了…她自己跑去換桌', 270, 510, 24, '#ffb4b4');
      }
      ctx.globalAlpha = 1;
    }
  }

  return { drawBackground, drawEvents };
})();
