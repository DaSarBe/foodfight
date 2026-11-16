// 所有 canvas 繪製
window.FF = window.FF || {};

FF.Render = (() => {
  const C = FF.CONFIG;
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const TEXT_FONT = '"PingFang TC","Noto Sans TC","Microsoft JhengHei","WenQuanYi Zen Hei",sans-serif';
  const canFilter = (() => {
    try {
      const c = document.createElement('canvas').getContext('2d');
      c.filter = 'brightness(0.5)';
      return c.filter === 'brightness(0.5)';
    } catch (e) {
      return false;
    }
  })();

  function emoji(ctx, ch, x, y, size) {
    ctx.font = `${size}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, x, y + size * 0.05);
  }

  function text(ctx, str, x, y, size, color, { align = 'center', weight = 'bold', stroke = null, strokeW = 4, base = 'middle' } = {}) {
    ctx.font = `${weight} ${size}px ${TEXT_FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = base;
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

  // ---------- 背景 ----------
  function drawRoom(ctx) {
    const wall = ctx.createLinearGradient(0, 0, 0, 260);
    wall.addColorStop(0, '#ffe2c4');
    wall.addColorStop(1, '#ffcfa3');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, C.W, 260);
    // 牆上的燈籠點綴
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#ff9a7a' : '#ffb98a';
      ctx.beginPath();
      ctx.arc(45 + i * 90, 64, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTable(ctx) {
    const g = ctx.createLinearGradient(0, 255, 0, C.H);
    g.addColorStop(0, '#b9733f');
    g.addColorStop(1, '#8a4f28');
    ctx.fillStyle = g;
    ctx.fillRect(0, 255, C.W, C.H - 255);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 2;
    for (let y = 290; y < C.H; y += 46) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(180, y + 8, 360, y - 8, C.W, y + 4);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(0, 255, C.W, 4);
  }

  function drawPot(ctx, time, spicy, soupT) {
    const P = C.pot;
    // 把手
    ctx.fillStyle = '#5d6670';
    roundRect(ctx, P.x - P.r - 30, P.y - 16, 40, 32, 10);
    ctx.fill();
    roundRect(ctx, P.x + P.r - 10, P.y - 16, 40, 32, 10);
    ctx.fill();
    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(P.x, P.y + 14, P.r + 18, P.r + 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // 鍋緣
    const rim = ctx.createRadialGradient(P.x - 60, P.y - 80, 20, P.x, P.y, P.r + 16);
    rim.addColorStop(0, '#eef2f5');
    rim.addColorStop(0.8, '#9aa5ae');
    rim.addColorStop(1, '#6c7780');
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(P.x, P.y, P.r + 14, 0, Math.PI * 2);
    ctx.fill();
    // 湯
    const soup = ctx.createRadialGradient(P.x - 40, P.y - 50, 10, P.x, P.y, P.r);
    if (spicy) {
      soup.addColorStop(0, '#ff7a45');
      soup.addColorStop(0.7, '#d7301f');
      soup.addColorStop(1, '#8f1a0e');
    } else {
      soup.addColorStop(0, '#ffd27d');
      soup.addColorStop(0.7, '#e9a23b');
      soup.addColorStop(1, '#b8691b');
    }
    ctx.fillStyle = soup;
    ctx.beginPath();
    ctx.arc(P.x, P.y, P.r, 0, Math.PI * 2);
    ctx.fill();
    // 湯面泡泡
    ctx.save();
    ctx.beginPath();
    ctx.arc(P.x, P.y, P.r, 0, Math.PI * 2);
    ctx.clip();
    for (let i = 0; i < 22; i++) {
      const cycle = 1.6 + (i % 5) * 0.3;
      const ph = ((time + i * 0.37) % cycle) / cycle;
      const a = i * 2.39996;
      const r = ((i * 53) % 100) / 100 * (P.r - 20);
      const bx = P.x + Math.cos(a) * r;
      const by = P.y + Math.sin(a) * r;
      const br = 3 + (i % 4) * 2.2;
      ctx.globalAlpha = (1 - ph) * 0.55;
      ctx.strokeStyle = spicy ? '#ffd0b0' : '#fff6dc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, br * (0.4 + ph), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 湯面反光
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.ellipse(P.x - 70, P.y - 90, 70, 26, -0.5, 0, Math.PI * 2);
    ctx.fill();
    if (spicy) {
      for (let i = 0; i < 6; i++) {
        const a = time * 0.4 + i;
        emoji(ctx, '🌶️', P.x + Math.cos(a) * (P.r - 40), P.y + Math.sin(a * 1.3) * (P.r - 50), 18);
      }
    }
    if (soupT > 0) {
      ctx.globalAlpha = Math.min(1, soupT) * 0.25;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(P.x, P.y, P.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawWisps(ctx, time) {
    const P = C.pot;
    for (let i = 0; i < 5; i++) {
      const ph = ((time * 0.35 + i * 0.2) % 1);
      const x = P.x - 140 + i * 70 + Math.sin(time * 1.3 + i) * 14;
      const y = P.y - P.r * 0.3 - ph * 200;
      ctx.globalAlpha = Math.sin(Math.PI * ph) * 0.22;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 18 + ph * 22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- 食物 ----------
  const STAGE_COLOR = { raw: '#8fd0ff', perfect: '#3ddc6a', over: '#9b6b3c' };

  function drawFood(ctx, game, f, time, opts = {}) {
    const st = game ? game.stage(f) : 'perfect';
    const frac = game ? game.stageFrac(f) : 0.5;
    const bob = f.state === 'pot' && !f.fly ? Math.sin(time * 2.2 + f.phase) * 2.5 : 0;
    const x = f.x;
    const y = f.y + bob;
    const scale = 1 + (f.pop > 0 ? Math.sin((f.pop / 0.35) * Math.PI) * 0.35 : 0);
    const size = (f.def.rare ? 50 : 42) * scale;

    if (f.def.rare) {
      const glow = ctx.createRadialGradient(x, y, 5, x, y, 46);
      glow.addColorStop(0, 'rgba(255,230,90,0.9)');
      glow.addColorStop(1, 'rgba(255,230,90,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 46 + Math.sin(time * 6) * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (f.state === 'pot' && !opts.noRing) {
      const R = f.def.rare ? 31 : 27;
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = STAGE_COLOR[st] || '#999';
      if (st === 'perfect') {
        ctx.shadowColor = '#7dffa0';
        ctx.shadowBlur = 10 + Math.sin(time * 10) * 4;
      }
      ctx.beginPath();
      const start = -Math.PI / 2;
      // 生：進度往上長；剛好與過熟：剩餘時間往下減
      const amt = st === 'raw' ? frac : 1 - frac;
      ctx.arc(x, y, R, start, start + Math.PI * 2 * Math.max(0.02, amt));
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (canFilter) {
      if (st === 'raw') ctx.filter = 'saturate(0.35) brightness(1.2)';
      else if (st === 'over') ctx.filter = 'sepia(0.7) brightness(0.6)';
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(f.rot || 0);
    emoji(ctx, f.def.emoji, 0, 0, size);
    ctx.restore();
    ctx.filter = 'none';

    if (f.state === 'pot' && !opts.noRing) {
      if (st === 'perfect' && Math.sin(time * 5 + f.phase) > 0.7) emoji(ctx, '✨', x + 20, y - 20, 16);
      if (st === 'over') {
        ctx.globalAlpha = 0.5;
        emoji(ctx, '💨', x - 16, y - 22 - ((time * 20 + f.phase * 10) % 10), 14);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ---------- 筷子 ----------
  function drawChopsticks(ctx, tip, anchor, color, edge) {
    const dx = anchor.x - tip.x;
    const dy = anchor.y - tip.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d;
    const uy = dy / d;
    const px = -uy;
    const py = ux;
    const L = C.chopLen;
    const ex = tip.x + ux * L;
    const ey = tip.y + uy * L;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(tip.x + px * s * 3 - px * 1.5, tip.y + py * s * 3 - py * 1.5);
      ctx.lineTo(tip.x + px * s * 3 + px * 1.5, tip.y + py * s * 3 + py * 1.5);
      ctx.lineTo(ex + px * s * 11 + px * 4, ey + py * s * 11 + py * 4);
      ctx.lineTo(ex + px * s * 11 - px * 4, ey + py * s * 11 - py * 4);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = edge;
      ctx.stroke();
    }
  }

  // ---------- 女朋友 ----------
  function mood(game) {
    if (!game) return 'happy';
    if (game.over && game.result && game.result.reason === 'anger') return 'furious';
    const a = game.anger;
    if (a >= 75) return 'furious';
    if (game.gf.pout > 0) return 'annoyed';
    if (a >= 50) return 'annoyed';
    if (a >= 25) return 'normal';
    return 'happy';
  }

  function drawGF(ctx, game, time) {
    const G = C.gf;
    const m = mood(game);
    const g = game ? game.gf : null;
    const chewing = g && (g.state === 'chew' || g.state === 'retract');
    const phone = game && game.fx.phone > 0;
    const striking = g && (g.state === 'strikeWarn' || g.state === 'strikeAim');
    const shakeX = m === 'furious' ? Math.sin(time * 40) * 1.5 : 0;
    const x = G.x + shakeX;
    const y = G.y + Math.sin(time * 2) * 2;
    const r = G.r;

    // 身體（上衣）
    ctx.fillStyle = '#ff8fb1';
    ctx.beginPath();
    ctx.moveTo(x - 85, 262);
    ctx.quadraticCurveTo(x - 80, y + r + 10, x, y + r + 6);
    ctx.quadraticCurveTo(x + 80, y + r + 10, x + 85, 262);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe0c7';
    ctx.beginPath();
    ctx.ellipse(x, y + r + 6, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 後髮
    ctx.fillStyle = '#4a2c22';
    ctx.beginPath();
    ctx.arc(x, y - 4, r * 1.14, Math.PI, 0);
    ctx.lineTo(x + r * 1.14, y + r * 1.05);
    ctx.quadraticCurveTo(x + r * 0.9, y + r * 1.25, x + r * 0.7, y + r * 0.9);
    ctx.lineTo(x - r * 0.7, y + r * 0.9);
    ctx.quadraticCurveTo(x - r * 0.9, y + r * 1.25, x - r * 1.14, y + r * 1.05);
    ctx.closePath();
    ctx.fill();

    // 臉
    ctx.fillStyle = m === 'furious' ? '#ffc3b0' : '#ffe0c7';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // 瀏海
    ctx.fillStyle = '#4a2c22';
    ctx.beginPath();
    ctx.moveTo(x - r * 1.02, y - 2);
    ctx.quadraticCurveTo(x - r * 0.9, y - r * 1.2, x, y - r * 1.05);
    ctx.quadraticCurveTo(x + r * 0.9, y - r * 1.2, x + r * 1.02, y - 2);
    ctx.quadraticCurveTo(x + r * 0.7, y - r * 0.55, x + r * 0.35, y - r * 0.5);
    ctx.quadraticCurveTo(x + r * 0.1, y - r * 0.75, x - r * 0.1, y - r * 0.45);
    ctx.quadraticCurveTo(x - r * 0.45, y - r * 0.7, x - r * 0.6, y - r * 0.4);
    ctx.quadraticCurveTo(x - r * 0.85, y - r * 0.5, x - r * 1.02, y - 2);
    ctx.fill();

    // 髮夾
    ctx.fillStyle = '#ff6fa5';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.62, y - r * 0.72, 10, 6, -0.6, 0, Math.PI * 2);
    ctx.fill();

    // 腮紅
    ctx.fillStyle = m === 'furious' ? 'rgba(255,60,60,0.45)' : 'rgba(255,120,150,0.35)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.55, y + r * 0.25, 11, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(x + r * 0.55, y + r * 0.25, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛與眉毛
    const ex = r * 0.38;
    const ey = y - r * 0.02;
    ctx.strokeStyle = '#3a2219';
    ctx.fillStyle = '#3a2219';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    const lookY = phone ? 4 : 0;
    const blink = Math.sin(time * 1.3) > 0.985;
    if (phone) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + s * ex, ey + 4, 6, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      }
    } else if (m === 'happy' || chewing) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + s * ex, ey + 3, 8, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      }
    } else if (blink) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + s * ex - 7, ey);
        ctx.lineTo(x + s * ex + 7, ey);
        ctx.stroke();
      }
    } else {
      const h = m === 'normal' ? 8 : m === 'annoyed' ? 5 : 4;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + s * ex, ey + lookY, 6, h, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + s * ex + 2, ey - 2 + lookY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3a2219';
      }
      if (m === 'annoyed' || m === 'furious') {
        const tilt = m === 'furious' ? 9 : 4;
        ctx.lineWidth = 4;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(x + s * (ex + 10), ey - 14 - tilt * 0.3);
          ctx.lineTo(x + s * (ex - 9), ey - 14 + tilt * 0.8);
          ctx.stroke();
        }
      }
    }

    // 嘴巴
    const my = y + r * 0.48;
    ctx.lineWidth = 3.5;
    if (chewing) {
      const o = 3 + Math.abs(Math.sin(time * 18)) * 5;
      ctx.fillStyle = '#c2455a';
      ctx.beginPath();
      ctx.ellipse(x, my, 8, o, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (striking) {
      ctx.beginPath();
      ctx.moveTo(x - 9, my);
      ctx.lineTo(x + 9, my - 3);
      ctx.stroke();
    } else if (m === 'happy') {
      ctx.beginPath();
      ctx.arc(x, my - 6, 12, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else if (m === 'normal') {
      ctx.beginPath();
      ctx.arc(x, my - 8, 9, 0.25 * Math.PI, 0.75 * Math.PI);
      ctx.stroke();
    } else if (m === 'annoyed') {
      ctx.beginPath();
      ctx.moveTo(x - 9, my);
      ctx.quadraticCurveTo(x, my - 5, x + 9, my);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#c2455a';
      ctx.beginPath();
      ctx.moveTo(x - 12, my + 6);
      ctx.quadraticCurveTo(x, my - 10, x + 12, my + 6);
      ctx.closePath();
      ctx.fill();
    }

    if (m === 'furious') {
      emoji(ctx, '💢', x + r * 0.85, y - r * 0.85, 30 + Math.sin(time * 12) * 3);
    } else if (m === 'annoyed') {
      emoji(ctx, '💧', x + r * 0.9, y - r * 0.4, 20);
    }
    if (phone) {
      emoji(ctx, '📱', x + 8, y + r + 2, 40);
    }
  }

  // ---------- HUD ----------
  function bar(ctx, x, y, w, h, frac, colorA, colorB, label, icon, pulse) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fill();
    const fw = Math.max(0, Math.min(1, frac)) * (w - 4);
    if (fw > 0) {
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, colorA);
      g.addColorStop(1, colorB);
      ctx.fillStyle = g;
      roundRect(ctx, x + 2, y + 2, Math.max(fw, h - 4), h - 4, (h - 4) / 2);
      ctx.fill();
    }
    if (pulse) {
      ctx.strokeStyle = `rgba(255,80,80,${0.5 + Math.sin(pulse * 12) * 0.5})`;
      ctx.lineWidth = 3;
      roundRect(ctx, x - 1, y - 1, w + 2, h + 2, h / 2 + 1);
      ctx.stroke();
    }
    emoji(ctx, icon, x - 18, y + h / 2, 24);
    text(ctx, label, x + w / 2, y + h / 2 + 1, 13, '#fff', { stroke: 'rgba(0,0,0,0.55)', strokeW: 3 });
  }

  function fmtTime(s) {
    s = Math.floor(s);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  function drawHUD(ctx, game, time) {
    ctx.fillStyle = 'rgba(80,30,10,0.55)';
    ctx.fillRect(0, 0, C.W, 54);
    // 暫停鈕
    const P = FF.LAYOUT.pause;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(P.x, P.y, P.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a0522d';
    ctx.fillRect(P.x - 7, P.y - 8, 5, 16);
    ctx.fillRect(P.x + 2, P.y - 8, 5, 16);

    text(ctx, `第 ${game.wave} 波`, 66, 28, 22, '#fff', { align: 'left' });
    text(ctx, fmtTime(game.t), 270, 28, 24, '#ffe9a8');
    text(ctx, `${game.score}`, 522, 26, 26, '#fff', { align: 'right' });
    text(ctx, '分', 522, 46, 11, '#ffd9b0', { align: 'right' });

    // 她最愛
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    roundRect(ctx, 12, 150, 112, 34, 17);
    ctx.fill();
    text(ctx, '她最愛', 50, 167, 14, '#c2456a');
    emoji(ctx, game.favorite.emoji, 100, 167, 24);

    // 生效中的效果
    const labels = [
      ['chopsticks', '🥢', '公筷'],
      ['phone', '📱', '分心'],
      ['soup', '🍲', '加湯'],
      ['spicy', '🌶️', '辣鍋'],
      ['steam', '♨️', '蒸氣'],
    ];
    let ly = 196;
    for (const [k, ic, name] of labels) {
      const v = game.fx[k];
      if (v <= 0) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      roundRect(ctx, 12, ly, 112, 26, 13);
      ctx.fill();
      emoji(ctx, ic, 28, ly + 13, 16);
      text(ctx, `${name} ${v.toFixed(1)}s`, 76, ly + 14, 13, '#fff');
      ly += 30;
    }

    // 怒氣與飽足
    const angerHigh = game.anger > 75 ? time : 0;
    bar(ctx, 140, 268, 300, 18, game.anger / 100, '#ffb3c7', '#ff2d55', `怒氣 ${Math.round(game.anger)}`, '😤', angerHigh);
    const satFrac = game.sat / game.mods.satMax;
    bar(ctx, 140, 728, 300, 18, satFrac, '#ffd36b', '#ff8a2a', `飽足 ${Math.round(game.sat)}/${game.mods.satMax}`, '🍚', satFrac < 0.25 ? time : 0);
  }

  function drawBowl(ctx, game, time) {
    const B = C.bowl;
    const s = 1 + game.bowlBounce * 0.08 * Math.sin(game.bowlBounce * 12);
    ctx.save();
    ctx.translate(B.x, B.y);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 50, 70, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // 碗身
    ctx.fillStyle = '#f4f8ff';
    ctx.beginPath();
    ctx.moveTo(-78, -8);
    ctx.quadraticCurveTo(-72, 48, 0, 50);
    ctx.quadraticCurveTo(72, 48, 78, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4f7fd1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-70, 18);
    ctx.quadraticCurveTo(0, 34, 70, 18);
    ctx.stroke();
    // 碗口
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath();
    ctx.ellipse(0, -8, 78, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbf3e1';
    ctx.beginPath();
    ctx.ellipse(0, -6, 66, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    game.bowl.forEach((e, i) => emoji(ctx, e, B.x - 30 + i * 30, B.y - 14 - (i % 2) * 4, 28));
    if (game.combo >= 2) {
      const mult = (1 + 0.1 * Math.min(game.combo, 10)).toFixed(1);
      text(ctx, `${game.combo} 連擊`, 96, B.y - 10, 22, '#ffe066', { stroke: '#7a3b12', strokeW: 5 });
      text(ctx, `分數 x${mult}`, 96, B.y + 16, 15, '#fff', { stroke: '#7a3b12', strokeW: 4 });
    }
  }

  function drawItems(ctx, game, time) {
    for (const b of FF.LAYOUT.items) {
      const it = FF.ITEMS.find(i => i.id === b.id);
      const n = game.save.items[b.id] || 0;
      const active = game.fx[b.id] > 0;
      ctx.fillStyle = active ? '#ffe066' : n > 0 ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = active ? '#ff9f1c' : 'rgba(120,60,20,0.6)';
      ctx.stroke();
      if (active && it.dur) {
        ctx.strokeStyle = '#ff5a1f';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + 4, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * game.fx[b.id]) / it.dur);
        ctx.stroke();
      }
      ctx.globalAlpha = n > 0 || active ? 1 : 0.45;
      emoji(ctx, it.icon, b.x, b.y - 2, 30);
      ctx.globalAlpha = 1;
      ctx.fillStyle = n > 0 ? '#e8414f' : '#888';
      ctx.beginPath();
      ctx.arc(b.x + 23, b.y - 22, 12, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, `${n}`, b.x + 23, b.y - 21, 14, '#fff');
      text(ctx, it.name, b.x, b.y + b.r + 11, 12, '#ffe9cf', { stroke: 'rgba(0,0,0,0.5)', strokeW: 3 });
    }
  }

  function drawBubble(ctx, game) {
    const b = game.bubble;
    if (!b) return;
    const appear = Math.min(1, (b.max - b.timer) * 8);
    const fade = Math.min(1, b.timer * 4);
    ctx.globalAlpha = fade;
    ctx.font = `bold 16px ${TEXT_FONT}`;
    // 換行
    const maxW = 170;
    const lines = [];
    let cur = '';
    for (const ch of b.text) {
      if (ctx.measureText(cur + ch).width > maxW) {
        lines.push(cur);
        cur = ch;
      } else cur += ch;
    }
    if (cur) lines.push(cur);
    const w = Math.min(maxW, Math.max(...lines.map(l => ctx.measureText(l).width))) + 24;
    const h = lines.length * 21 + 16;
    const x = 196 - w;
    const y = 62 + (1 - appear) * 10;
    ctx.fillStyle = '#fff';
    roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w - 8, y + h * 0.4);
    ctx.lineTo(x + w + 14, y + h * 0.55);
    ctx.lineTo(x + w - 8, y + h * 0.75);
    ctx.fill();
    lines.forEach((l, i) => text(ctx, l, x + w / 2, y + 18 + i * 21, 16, '#5a2a3a'));
    ctx.globalAlpha = 1;
  }

  function drawSteam(ctx, game, time) {
    const v = game.fx.steam;
    if (v <= 0) return;
    const P = C.pot;
    const k = Math.min(1, v, (game.fxMax.steam - v) * 2);
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4 + time * (0.15 + (i % 3) * 0.07);
      const rr = (i % 4) * 45 + 20;
      const x = P.x + Math.cos(a) * rr;
      const y = P.y + Math.sin(a * 1.2) * rr * 0.9;
      const R = 80 + (i % 3) * 25;
      const g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, `rgba(255,255,255,${0.75 * k})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawStrikeWarning(ctx, game, time) {
    const c = game.player.carry;
    if (!c || !c.strike || c.strike.phase !== 'warn') return;
    const f = c.food;
    const blink = Math.sin(time * 30) > 0;
    ctx.strokeStyle = blink ? '#ff2d2d' : '#ffdd00';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 36 + Math.sin(time * 30) * 4, 0, Math.PI * 2);
    ctx.stroke();
    emoji(ctx, '❗', f.x - 40, f.y - 40, 34);
    if (game.strikesSeen <= 3 && !c.flinch) {
      text(ctx, '快點一下閃開！', f.x, f.y + 52, 22, '#fff', { stroke: '#d10000', strokeW: 6 });
    } else if (c.flinch) {
      text(ctx, '手抖了閃不掉！', f.x, f.y + 52, 18, '#ddd', { stroke: '#333', strokeW: 5 });
    }
  }

  function drawBanner(ctx, game) {
    const b = game.banner;
    if (!b) return;
    const inK = Math.min(1, b.t * 4);
    const outK = Math.min(1, (b.life - b.t) * 3);
    const k = Math.min(inK, outK);
    ctx.globalAlpha = k;
    const y = 470;
    ctx.fillStyle = 'rgba(60,20,5,0.7)';
    const lines = b.sub.split('\n');
    const h = 70 + lines.length * 26;
    ctx.fillRect(0, y - 50, C.W, h);
    const sc = 0.6 + 0.4 * inK;
    ctx.save();
    ctx.translate(270, y - 6);
    ctx.scale(sc, sc);
    text(ctx, b.title, 0, 0, 44, '#ffe066', { stroke: '#7a2d00', strokeW: 8 });
    ctx.restore();
    lines.forEach((l, i) => text(ctx, l, 270, y + 36 + i * 26, 19, '#fff'));
    ctx.globalAlpha = 1;
  }

  function drawFloaters(ctx, game) {
    for (const f of game.floaters) {
      const k = f.t / f.life;
      ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
      const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.5 : 1.1 - Math.min(0.1, (k - 0.15));
      ctx.save();
      ctx.translate(f.x, f.y - k * 50);
      ctx.scale(pop, pop);
      text(ctx, f.text, 0, 0, f.size, f.color, { stroke: 'rgba(40,10,0,0.75)', strokeW: 5 });
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles(ctx, game) {
    for (const p of game.particles) {
      const k = 1 - p.t / p.life;
      ctx.globalAlpha = Math.max(0, k);
      if (p.emoji) {
        emoji(ctx, p.emoji, p.x, p.y, p.size);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + k * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---------- 主繪製 ----------
  function drawGame(ctx, game, time) {
    ctx.save();
    if (game.shake > 0) {
      ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
    }
    drawRoom(ctx);
    drawGF(ctx, game, time);
    drawTable(ctx);
    drawPot(ctx, time, game.fx.spicy > 0, game.fx.soup);

    // 女友瞄準 / 指定 的提示
    const g = game.gf;
    if ((g.state === 'reach' || g.state === 'hover') && g.target && g.target.state === 'pot') {
      const f = g.target;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -time * 30;
      ctx.strokeStyle = 'rgba(255,111,165,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (game.claim) {
      const f = game.foods.find(ff => ff.id === game.claim.id);
      if (f && f.state === 'pot') {
        ctx.strokeStyle = '#ff3d8b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 40 + Math.sin(time * 8) * 3, 0, Math.PI * 2);
        ctx.stroke();
        emoji(ctx, '💗', f.x + 28, f.y - 30, 22);
      }
    }

    for (const f of game.foods) {
      if (f.state === 'pot') drawFood(ctx, game, f, time);
    }
    drawWisps(ctx, time);
    drawSteam(ctx, game, time);

    drawBowl(ctx, game, time);

    // 夾在筷子上的食物
    const p = game.player;
    if (p.carry) drawFood(ctx, game, p.carry.food, time, { noRing: true });
    if (g.state === 'retract' && g.food) drawFood(ctx, game, g.food, time, { noRing: true });

    drawChopsticks(ctx, g.tip, C.gfAnchor, '#f29bb8', '#b4466b');
    drawChopsticks(ctx, p.tip, C.playerAnchor, '#d9a066', '#7a4a1f');
    if (game.fx.chopsticks > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(time * 12) * 0.3;
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.tip.x, p.tip.y, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const w of game.shockwaves) {
      const k = w.t / 0.35;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#b9ffd6';
      ctx.lineWidth = 8 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(w.x, w.y, 20 + k * 110, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    drawStrikeWarning(ctx, game, time);
    drawParticles(ctx, game);
    drawFloaters(ctx, game);
    drawHUD(ctx, game, time);
    drawBubble(ctx, game);
    drawItems(ctx, game, time);
    drawBanner(ctx, game);
    ctx.restore();

    if (game.flash > 0) {
      const v = ctx.createRadialGradient(270, 480, 200, 270, 480, 600);
      v.addColorStop(0, 'rgba(255,0,0,0)');
      v.addColorStop(1, `rgba(255,0,0,${0.45 * game.flash})`);
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, C.W, C.H);
    }
    if (game.dodgeFlash > 0) {
      ctx.fillStyle = `rgba(220,255,235,${0.35 * game.dodgeFlash})`;
      ctx.fillRect(0, 0, C.W, C.H);
    }
    if (game.over) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.5, (1.2 - game.overTimer) * 0.5)})`;
      ctx.fillRect(0, 0, C.W, C.H);
    }
  }

  // 選單背景：一鍋滾著的火鍋
  const demoFoods = [];
  function drawMenuBg(ctx, time) {
    if (!demoFoods.length) {
      const P = C.pot;
      FF.FOODS.concat(FF.RARE_FOODS.slice(0, 1)).forEach((def, i) => {
        const a = (i / 9) * Math.PI * 2;
        demoFoods.push({ def, a, r: 70 + (i % 3) * 40, x: P.x, y: P.y, phase: i, rot: 0, pop: 0, state: 'menu' });
      });
    }
    drawRoom(ctx);
    drawGF(ctx, null, time);
    drawTable(ctx);
    drawPot(ctx, time, false, 0);
    for (const f of demoFoods) {
      const a = f.a + time * 0.15;
      f.x = C.pot.x + Math.cos(a) * f.r;
      f.y = C.pot.y + Math.sin(a) * f.r + Math.sin(time * 2 + f.phase) * 3;
      drawFood(ctx, null, f, time, { noRing: true });
    }
    drawWisps(ctx, time);
  }

  return { drawGame, drawMenuBg, fmtTime };
})();
