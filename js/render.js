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
  const TABLES = [['#b9733f', '#8a4f28'], ['#9c6b4a', '#6e4a30'], ['#c08552', '#8f5a2e'], ['#8d6e4f', '#5f4733']];
  function drawTable(ctx, tableNo = 1) {
    const tc = TABLES[(tableNo - 1) % TABLES.length];
    const g = ctx.createLinearGradient(0, 255, 0, C.H);
    g.addColorStop(0, tc[0]);
    g.addColorStop(1, tc[1]);
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

  function soupGradient(ctx, cols) {
    const P = C.pot;
    const g = ctx.createRadialGradient(P.x - 40, P.y - 50, 10, P.x, P.y, P.r);
    g.addColorStop(0, cols[0]);
    g.addColorStop(0.7, cols[1]);
    g.addColorStop(1, cols[2]);
    return g;
  }

  function drawPot(ctx, time, spicy, soupT, broth) {
    const P = C.pot;
    const b = broth || FF.BROTHS[0];
    const colsR = spicy ? b.spicySoup : b.soup;
    const colsL = b.split ? (spicy ? b.spicySoupLeft : b.soupLeft) : colsR;
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
    // 湯（鴛鴦鍋左右兩種顏色）
    ctx.fillStyle = soupGradient(ctx, colsR);
    ctx.beginPath();
    ctx.arc(P.x, P.y, P.r, 0, Math.PI * 2);
    ctx.fill();
    if (b.split) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(P.x - P.r - 2, P.y - P.r - 2, P.r + 2, P.r * 2 + 4);
      ctx.clip();
      ctx.fillStyle = soupGradient(ctx, colsL);
      ctx.beginPath();
      ctx.arc(P.x, P.y, P.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
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
      ctx.strokeStyle = bx < P.x ? colsL[3] : colsR[3];
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
    } else if (b.id === 'mala' || b.split) {
      // 麻辣湯面漂著辣椒和花椒（鴛鴦鍋只在左半邊）
      for (let i = 0; i < 4; i++) {
        const a = time * 0.25 + i * 1.7;
        let cx = P.x + Math.cos(a) * (P.r - 45);
        if (b.split) cx = P.x - 40 - Math.abs(Math.cos(a)) * (P.r - 90);
        ctx.globalAlpha = 0.85;
        emoji(ctx, i % 2 ? '🌶️' : '🟤', cx, P.y + Math.sin(a * 1.2) * (P.r - 55), i % 2 ? 16 : 8);
        ctx.globalAlpha = 1;
      }
    } else if (b.id === 'milk') {
      // 牛奶鍋的奶泡紋路
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(P.x + Math.cos(time * 0.3 + i * 2) * 40, P.y + Math.sin(time * 0.3 + i * 2) * 40, 50 + i * 35, i, i + 2.2);
        ctx.stroke();
      }
    }
    if (b.split) {
      // 中間的隔板
      const g = ctx.createLinearGradient(P.x - 6, 0, P.x + 6, 0);
      g.addColorStop(0, '#7d8790');
      g.addColorStop(0.5, '#eef2f5');
      g.addColorStop(1, '#6c7780');
      ctx.fillStyle = g;
      ctx.fillRect(P.x - 6, P.y - P.r, 12, P.r * 2);
      ctx.strokeStyle = 'rgba(40,50,60,0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(P.x - 6, P.y - P.r, 12, P.r * 2);
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

  // 後髮：依髮型不同
  function drawBackHair(ctx, look, x, y, r, time) {
    if (FF.LookDraw.backHair(ctx, look, x, y, r, time)) return;
    ctx.fillStyle = look.hair;
    const st = look.style;
    if (st === 'twin') {
      // 雙馬尾：兩條垂在臉旁邊、會輕輕晃
      for (const s of [-1, 1]) {
        const sw = Math.sin(time * 2.2 + s) * 3;
        ctx.beginPath();
        ctx.moveTo(x + s * r * 0.95, y - r * 0.55);
        ctx.quadraticCurveTo(x + s * r * 1.75 + sw, y + r * 0.2, x + s * r * 1.35 + sw, y + r * 1.45);
        ctx.quadraticCurveTo(x + s * r * 1.15, y + r * 0.6, x + s * r * 0.85, y - r * 0.1);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (st === 'buns') {
      // 丸子頭
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + s * r * 0.72, y - r * 0.92, r * 0.36, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (st === 'short') {
      // 高馬尾，從頭後面翹出來
      const sw = Math.sin(time * 3) * 0.08;
      ctx.save();
      ctx.translate(x + r * 0.55, y - r * 0.95);
      ctx.rotate(0.9 + sw);
      ctx.beginPath();
      ctx.ellipse(r * 0.45, 0, r * 0.62, r * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(x, y - 4, r * 1.14, Math.PI, 0);
    if (st === 'long' || st === 'twin') {
      ctx.lineTo(x + r * 1.14, y + r * 1.05);
      ctx.quadraticCurveTo(x + r * 0.9, y + r * 1.25, x + r * 0.7, y + r * 0.9);
      ctx.lineTo(x - r * 0.7, y + r * 0.9);
      ctx.quadraticCurveTo(x - r * 0.9, y + r * 1.25, x - r * 1.14, y + r * 1.05);
    } else {
      // 短髮／包頭：只到耳下
      const end = st === 'short' ? 0.25 : 0.55;
      ctx.lineTo(x + r * 1.12, y + r * end);
      ctx.quadraticCurveTo(x + r * 0.95, y + r * (end + 0.2), x + r * 0.75, y + r * end);
      ctx.lineTo(x - r * 0.75, y + r * end);
      ctx.quadraticCurveTo(x - r * 0.95, y + r * (end + 0.2), x - r * 1.12, y + r * end);
    }
    ctx.closePath();
    ctx.fill();
  }

  // 男友的後髮：短髮，只在頭頂和耳旁露出
  function drawMaleBack(ctx, look, x, y, r, time) {
    ctx.fillStyle = look.hair;
    const st = look.style;
    const top = st === 'buzz' ? 1.07 : st === 'spiky' ? 1.12 : 1.14;
    ctx.beginPath();
    ctx.arc(x, y - 4, r * top, Math.PI, 0);
    const end = st === 'buzz' ? -0.05 : 0.18;
    ctx.lineTo(x + r * 1.06, y + r * end);
    ctx.lineTo(x - r * 1.06, y + r * end);
    ctx.closePath();
    ctx.fill();
    FF.LookDraw.maleBackExtra(ctx, look, x, y, r, time);
    if (st === 'spiky') {
      // 刺刺頭：頭頂幾根尖尖的，會微微晃
      const sw = Math.sin(time * 3) * 2;
      for (let i = -3; i <= 3; i++) {
        const a = -Math.PI / 2 + i * 0.36;
        const bx = x + Math.cos(a) * r * 1.1;
        const by = y - 4 + Math.sin(a) * r * 1.1;
        ctx.beginPath();
        ctx.moveTo(bx - Math.cos(a + 1.57) * 9, by - Math.sin(a + 1.57) * 9);
        ctx.lineTo(bx + Math.cos(a) * 20 + sw * i * 0.3, by + Math.sin(a) * 20);
        ctx.lineTo(bx + Math.cos(a + 1.57) * 9, by + Math.sin(a + 1.57) * 9);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // 男友的瀏海
  function drawMaleBangs(ctx, look, x, y, r) {
    ctx.fillStyle = look.hair;
    const st = look.style;
    if (FF.LookDraw.maleBangs(ctx, look, x, y, r)) return;
    ctx.beginPath();
    if (st === 'buzz') {
      // 圓寸：只有一道細細的髮際線
      ctx.moveTo(x - r * 1.0, y - r * 0.5);
      ctx.quadraticCurveTo(x, y - r * 1.12, x + r * 1.0, y - r * 0.5);
      ctx.quadraticCurveTo(x, y - r * 0.82, x - r * 1.0, y - r * 0.5);
    } else if (st === 'spiky') {
      // 往前翹的幾撮
      ctx.moveTo(x - r * 1.02, y - 4);
      ctx.lineTo(x - r * 0.95, y - r * 0.62);
      ctx.lineTo(x - r * 0.62, y - r * 0.36);
      ctx.lineTo(x - r * 0.38, y - r * 0.66);
      ctx.lineTo(x - r * 0.08, y - r * 0.34);
      ctx.lineTo(x + r * 0.2, y - r * 0.68);
      ctx.lineTo(x + r * 0.5, y - r * 0.4);
      ctx.lineTo(x + r * 0.78, y - r * 0.64);
      ctx.lineTo(x + r * 1.02, y - 4);
      ctx.quadraticCurveTo(x, y - r * 1.25, x - r * 1.02, y - 4);
    } else {
      // crew／crop：平整的短瀏海，中間有一點點分線
      const low = st === 'crop' ? 0.5 : 0.42;
      ctx.moveTo(x - r * 1.02, y - 2);
      ctx.quadraticCurveTo(x - r * 0.9, y - r * 1.2, x, y - r * 1.06);
      ctx.quadraticCurveTo(x + r * 0.9, y - r * 1.2, x + r * 1.02, y - 2);
      ctx.lineTo(x + r * 0.86, y - r * low);
      ctx.lineTo(x + r * 0.5, y - r * (low + 0.1));
      ctx.lineTo(x + r * 0.15, y - r * low);
      ctx.lineTo(x - r * 0.2, y - r * (low + 0.12));
      ctx.lineTo(x - r * 0.6, y - r * low);
      ctx.lineTo(x - r * 0.88, y - r * (low + 0.04));
      ctx.closePath();
    }
    ctx.fill();
  }

  // 男友的圍巾（傲嬌模式）：繞在脖子上，尾巴垂在胸前
  function drawScarf(ctx, look, x, y, r, time) {
    ctx.fillStyle = look.accColor;
    ctx.beginPath();
    ctx.ellipse(x, y + r + 4, 38, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    const sw = Math.sin(time * 2.4) * 3;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + r + 8);
    ctx.lineTo(x + 30 + sw, y + r + 8);
    ctx.lineTo(x + 36 + sw, y + r + 50);
    ctx.lineTo(x + 14 + sw, y + r + 46);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 14 + sw, y + r + 34);
    ctx.lineTo(x + 35 + sw, y + r + 37);
    ctx.stroke();
  }

  // 頭上的配件
  function drawHairAcc(ctx, look, x, y, r) {
    ctx.fillStyle = look.accColor;
    if (look.acc === 'ribbon') {
      // 雙馬尾上的蝴蝶結
      for (const s of [-1, 1]) {
        const bx = x + s * r * 0.98;
        const by = y - r * 0.55;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - 13, by - 9);
        ctx.lineTo(bx - 13, by + 9);
        ctx.closePath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + 13, by - 9);
        ctx.lineTo(bx + 13, by + 9);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (look.acc === 'headband') {
      // 綁在額頭的頭帶，中間一顆紅太陽
      ctx.strokeStyle = look.accColor;
      ctx.lineWidth = 9;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(x, y + r * 0.12, r * 1.0, Math.PI * 1.13, Math.PI * 1.87);
      ctx.stroke();
      ctx.fillStyle = '#e8414f';
      ctx.beginPath();
      ctx.arc(x, y - r * 0.88, 5, 0, Math.PI * 2);
      ctx.fill();
      // 頭帶尾巴
      ctx.fillStyle = look.accColor;
      ctx.beginPath();
      ctx.moveTo(x + r * 0.95, y - r * 0.35);
      ctx.lineTo(x + r * 1.4, y - r * 0.1);
      ctx.lineTo(x + r * 1.3, y + r * 0.05);
      ctx.lineTo(x + r * 0.9, y - r * 0.22);
      ctx.fill();
    } else if (look.acc === 'clip') {
      ctx.beginPath();
      ctx.ellipse(x + r * 0.62, y - r * 0.72, 10, 6, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // opts（預覽、成績圖頭像用）：gender 'f'|'m'、follow 強制用模式外觀、noPhoto 不用照片、mood 心情、expr 指定表情
  //   expr：look 分心／scared 驚嚇／phone 滑手機／chew 嚼嚼／strike 出筷／ult 大絕招／love／yuck／full 餵食的三種反應
  function drawGF(ctx, game, time, personaOverride, opts) {
    const G = C.gf;
    const persona = personaOverride || (game && game.persona) || FF.PERSONAS[0];
    const gender = (opts && opts.gender) || FF.G.partner();
    const male = gender === 'm';
    const ap = FF.Look.apFor(persona, gender, opts); // 外觀：自訂外觀，或對象是男朋友就用模式的男生版
    const ex0 = opts && opts.expr;
    const m = opts && opts.mood ? opts.mood : mood(game);
    const g = game ? game.gf : null;
    const chewing = ex0 === 'chew' || (g && (g.state === 'chew' || g.state === 'retract'));
    const phone = ex0 === 'phone' || (game && game.fx.phone > 0);
    const look = ex0 === 'look' || (game && game.fx.look > 0 && !phone);
    const scared = ex0 === 'scared' || (game && game.crash && game.crash.phase !== 'moving');
    const striking = ex0 === 'strike' || (g && (g.state === 'strikeWarn' || g.state === 'strikeAim'));
    const photoImg = !(opts && (opts.noPhoto || opts.follow)) && FF.Photo.active(gender) ? FF.Photo.img(gender) : null;
    const shakeX = m === 'furious' ? Math.sin(time * 40) * 1.5 : 0;
    const x = G.x + shakeX;
    const y = G.y + Math.sin(time * 2) * 2;
    const r = G.r;
    const fed = ex0 === 'love' || ex0 === 'yuck' || ex0 === 'full' ? ex0 : g && g.fedFx ? g.fedFx.kind : null;
    const ult = ex0 === 'ult' ? { phase: 'charge' } : game && game.ult;
    const skin = ap.skin || '#ffe0c7';
    const fxState = { m, scared: !!scared, look: !!look, phone: !!phone, chewing: !!chewing, fed, ult: !!(ult && ult.phase !== 'striking'), striking: !!striking };

    // 大絕招氣場
    if (ult && ult.phase !== 'striking') {
      const pulse = 0.5 + 0.5 * Math.sin(time * 14);
      const aura = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2.2);
      aura.addColorStop(0, `rgba(255,40,60,${0.35 + 0.25 * pulse})`);
      aura.addColorStop(1, 'rgba(255,40,60,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 身體（上衣）
    const sh = ap.male ? 100 : 85; // 男生肩膀比較寬
    ctx.fillStyle = ap.shirt;
    ctx.beginPath();
    ctx.moveTo(x - sh, 262);
    ctx.quadraticCurveTo(x - sh + 5, y + r + 10, x, y + r + 6);
    ctx.quadraticCurveTo(x + sh - 5, y + r + 10, x + sh, 262);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(x, y + r + 6, ap.male ? 21 : 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    if (ap.male && ap.acc !== 'scarf') {
      // T 恤圓領
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(x, y + r + 8, 24, 12, 0, 0.05 * Math.PI, 0.95 * Math.PI);
      ctx.stroke();
    }
    FF.LookDraw.outfit(ctx, ap, x, y, r, sh);
    if (ap.acc === 'bib') {
      // 吃貨的圍兜兜
      ctx.fillStyle = ap.accColor;
      ctx.beginPath();
      ctx.moveTo(x - 30, y + r + 8);
      ctx.quadraticCurveTo(x, y + r + 16, x + 30, y + r + 8);
      ctx.lineTo(x + 22, 262);
      ctx.lineTo(x - 22, 262);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff6b6b';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x - 12 + i * 12, y + r + 28 + (i % 2) * 6, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (ap.acc === 'scarf') drawScarf(ctx, ap, x, y, r, time);
    if (ap.male) drawMaleBack(ctx, ap, x, y, r, time);
    else drawBackHair(ctx, ap, x, y, r, time);

    // 臉
    ctx.fillStyle = m === 'furious' ? (ap.skin ? FF.Look.mix(skin, '#ff9a80', 0.35) : '#ffc3b0') : skin;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (photoImg) FF.LookDraw.photoFace(ctx, photoImg, x, y, r, fxState, time, ap);

    // 瀏海
    ctx.fillStyle = ap.hair;
    if (ap.male) drawMaleBangs(ctx, ap, x, y, r);
    else {
    ctx.beginPath();
    ctx.moveTo(x - r * 1.02, y - 2);
    ctx.quadraticCurveTo(x - r * 0.9, y - r * 1.2, x, y - r * 1.05);
    ctx.quadraticCurveTo(x + r * 0.9, y - r * 1.2, x + r * 1.02, y - 2);
    ctx.quadraticCurveTo(x + r * 0.7, y - r * 0.55, x + r * 0.35, y - r * 0.5);
    ctx.quadraticCurveTo(x + r * 0.1, y - r * 0.75, x - r * 0.1, y - r * 0.45);
    ctx.quadraticCurveTo(x - r * 0.45, y - r * 0.7, x - r * 0.6, y - r * 0.4);
    ctx.quadraticCurveTo(x - r * 0.85, y - r * 0.5, x - r * 1.02, y - 2);
    ctx.fill();
    }

    drawHairAcc(ctx, ap, x, y, r);

    // 腮紅、眼睛、眉毛、嘴巴（用照片當臉時不畫，表情改由照片上的疊加效果呈現）
    if (!photoImg) {
    if (ap.blush !== false) {
    ctx.fillStyle = m === 'furious' ? 'rgba(255,60,60,0.45)' : ap.male ? 'rgba(255,120,120,0.2)' : 'rgba(255,120,150,0.35)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.55, y + r * 0.25, 11, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(x + r * 0.55, y + r * 0.25, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    }

    // 眼睛與眉毛
    const ex = r * 0.38;
    const ey = y - r * 0.02;
    ctx.strokeStyle = '#3a2219';
    ctx.fillStyle = '#3a2219';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    const lookY = phone ? 4 : 0;
    const customBrows = ap.brows && ap.brows !== 'auto';
    const blink = Math.sin(time * 1.3) > 0.985;
    if (fed && !scared) {
      for (const s of [-1, 1]) {
        const cx = x + s * ex;
        if (fed === 'love') {
          // 愛心眼
          ctx.fillStyle = '#ff3d7f';
          ctx.beginPath();
          ctx.moveTo(cx, ey + 7);
          ctx.bezierCurveTo(cx - 13, ey - 2, cx - 6, ey - 12, cx, ey - 4);
          ctx.bezierCurveTo(cx + 6, ey - 12, cx + 13, ey - 2, cx, ey + 7);
          ctx.fill();
        } else if (fed === 'yuck') {
          // >  <
          ctx.beginPath();
          ctx.moveTo(cx - s * 7, ey - 6);
          ctx.lineTo(cx + s * 5, ey);
          ctx.lineTo(cx - s * 7, ey + 6);
          ctx.stroke();
        } else {
          // 半瞇眼（沒感覺／吃飽了）
          ctx.beginPath();
          ctx.moveTo(cx - 8, ey + 1);
          ctx.lineTo(cx + 8, ey + 1);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx, ey + 1, 7, 0, Math.PI);
          ctx.stroke();
        }
      }
      ctx.fillStyle = '#3a2219';
    } else if (scared || look) {
      const ox = scared ? Math.sin(time * 30) * 1.5 : 3;
      const oy = scared ? 0 : -3;
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + s * ex, ey, scared ? 10 : 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#3a2219';
        ctx.beginPath();
        ctx.arc(x + s * ex + ox, ey + oy, scared ? 3 : 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (phone) {
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
      if (ap.eyes && ap.eyes !== 'round') FF.LookDraw.eyes(ctx, ap.eyes, x, ex, ey, h, lookY);
      else for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + s * ex, ey + lookY, 6, h, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + s * ex + 2, ey - 2 + lookY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3a2219';
      }
      if ((m === 'annoyed' || m === 'furious') && !customBrows) {
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

    // 男友的眉毛：粗一點、平一點（生氣時上面已經畫過斜眉）
    if (customBrows) FF.LookDraw.brows(ctx, ap.brows, ap.male ? FF.Look.darken(ap.hair, 0.55) : '#3a2219', x, ex, ey, m, scared);
    else if (ap.male && m !== 'annoyed' && m !== 'furious') {
      ctx.strokeStyle = ap.hair;
      ctx.lineWidth = 5;
      const by = scared ? ey - 21 : ey - 15;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + s * (ex + 9), by + (scared ? 0 : 1));
        ctx.lineTo(x + s * (ex - 9), by - (scared ? 3 : 0));
        ctx.stroke();
      }
      ctx.strokeStyle = '#3a2219';
    }

    // 嘴巴
    const my = y + r * 0.48;
    ctx.lineWidth = 3.5;
    if (fed === 'yuck' && !scared) {
      ctx.beginPath();
      ctx.moveTo(x - 12, my + 2);
      for (let i = 1; i <= 6; i++) ctx.lineTo(x - 12 + i * 4, my + 2 + (i % 2 ? -4 : 3));
      ctx.stroke();
    } else if (scared) {
      ctx.fillStyle = '#c2455a';
      ctx.beginPath();
      ctx.ellipse(x, my + 2, 10, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (look) {
      ctx.fillStyle = '#c2455a';
      ctx.beginPath();
      ctx.ellipse(x + 2, my, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (chewing) {
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
    } // !photoImg
    if (photoImg) FF.LookDraw.photoFx(ctx, x, y, r, fxState, time, ap);
    FF.LookDraw.acc(ctx, ap, x, y, r, fxState);

    if (scared) {
      emoji(ctx, '😱', x + r * 0.95, y - r * 0.8, 28);
    } else if (fed === 'yuck') {
      emoji(ctx, '🤢', x + r * 0.95, y - r * 0.8, 26);
    } else if (fed === 'love') {
      emoji(ctx, '💕', x + r * 0.95, y - r * 0.85, 26 + Math.sin(time * 10) * 3);
    } else if (ult && ult.phase !== 'striking') {
      emoji(ctx, '🔥', x + r * 0.95, y - r * 0.85, 30 + Math.sin(time * 16) * 4);
    } else if (look) {
      emoji(ctx, '👀', x + r * 0.95, y - r * 0.85, 24);
    } else if (m === 'furious') {
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
    const cs = game.challengeStatus();
    if (cs && cs.left !== null) {
      // 挑戰限時：中間改顯示倒數
      const hurry = cs.left <= 10;
      text(ctx, `⏰ ${fmtTime(Math.ceil(cs.left))}`, 270, 28, 24, hurry && Math.sin(time * 10) > 0 ? '#ff6b6b' : '#ffe9a8');
    } else {
      text(ctx, fmtTime(game.t), 270, 28, 24, '#ffe9a8');
    }
    if (cs) drawChallengeGoal(ctx, game, cs);
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
      ['look', '👀', '她看外面'],
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

  // 紀念日挑戰的目標進度（畫面右上，窗戶上緣）
  function drawChallengeGoal(ctx, game, cs) {
    const ch = game.challenge;
    ctx.font = `bold 13px ${TEXT_FONT}`;
    // 太長就拆兩行，避免擋到她的臉
    let lines = [cs.text];
    if (ctx.measureText(cs.text).width > 150) lines = cs.text.split('　');
    const tw = Math.max(...lines.map(l => ctx.measureText(l).width));
    const w = Math.min(204, tw + 50);
    const h = lines.length * 16 + 18;
    const x = C.W - 8 - w;
    const y = 60;
    ctx.fillStyle = 'rgba(90,20,40,0.82)';
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    emoji(ctx, ch.icon, x + 16, y + h / 2 - 2, 18);
    lines.forEach((l, i) => text(ctx, l, x + 31, y + 12 + i * 16, 13, '#fff', { align: 'left' }));
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(ctx, x + 31, y + h - 8, w - 41, 4, 2);
    ctx.fill();
    ctx.fillStyle = '#ffe066';
    roundRect(ctx, x + 31, y + h - 8, (w - 41) * cs.frac, 4, 2);
    ctx.fill();
  }

  // 成就解鎖通知
  function drawNotices(ctx, game) {
    const n = game.notices && game.notices.find(x => x.t >= 0);
    if (!n) return;
    const k = Math.min(1, n.t * 5, (n.life - n.t) * 4);
    const y = 300 - (1 - Math.min(1, n.t * 5)) * 30;
    ctx.globalAlpha = Math.max(0, k);
    const label = `${n.a.icon} 成就解鎖：${n.a.name}`;
    const sub = `獲得稱號「${n.a.title}」${n.a.reward ? `　🎫 +${n.a.reward}` : ''}`;
    ctx.font = `bold 18px ${TEXT_FONT}`;
    const w = Math.min(C.W - 30, Math.max(ctx.measureText(label).width, ctx.measureText(sub).width * 0.8) + 40);
    ctx.fillStyle = 'rgba(60,30,0,0.88)';
    roundRect(ctx, 270 - w / 2, y, w, 56, 16);
    ctx.fill();
    ctx.strokeStyle = '#ffd45c';
    ctx.lineWidth = 3;
    ctx.stroke();
    text(ctx, label, 270, y + 19, 18, '#ffe066');
    text(ctx, sub, 270, y + 40, 14, '#fff');
    ctx.globalAlpha = 1;
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
    if (game.comp) {
      // 競技模式（對決、每日同題）：能力統一、不能用道具
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      roundRect(ctx, 50, 890, 440, 44, 22);
      ctx.fill();
      const lab = game.comp.kind === 'daily' ? (game.comp.practice ? '🗓️ 每日同題（練習・不計分）' : '🗓️ 每日同題（正式成績）') : '⚔️ 對決';
      text(ctx, `${lab}：能力統一、不能用道具`, 270, 912, 15, '#ffe9cf');
      return;
    }
    if (game.challenge) {
      // 挑戰模式不能用道具
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      roundRect(ctx, 80, 890, 380, 44, 22);
      ctx.fill();
      text(ctx, `${game.challenge.icon} 紀念日挑戰：不能用道具，靠實力！`, 270, 912, 15, '#ffe9cf');
      return;
    }
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
    for (const ch of FF.G.units(b.text)) {
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
    // 對象的名字標籤（有取名字才有）：掛在泡泡左上角
    const nm = FF.G.name();
    if (nm) {
      ctx.font = `bold 12px ${TEXT_FONT}`;
      ctx.__notr = true;
      const tw = Math.min(90, ctx.measureText(nm).width + 16);
      ctx.fillStyle = '#ff6fa5';
      roundRect(ctx, x + 8, y - 12, tw, 19, 9.5);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      text(ctx, nm, x + 8 + tw / 2, y - 2, 12, '#fff', { stroke: 'rgba(120,20,60,0.5)', strokeW: 2 });
      ctx.__notr = false;
    }
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
    if (c && c.strike && c.strike.combo && c.strike.phase !== 'warn') drawComboPips(ctx, c, time);
    if (!c || !c.strike || c.strike.phase !== 'warn') return;
    if (c.strike.combo) drawComboPips(ctx, c, time);
    const f = c.food;
    const blink = Math.sin(time * 30) > 0;
    ctx.strokeStyle = blink ? '#ff2d2d' : '#ffdd00';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 36 + Math.sin(time * 30) * 4, 0, Math.PI * 2);
    ctx.stroke();
    emoji(ctx, '❗', f.x - 40, f.y - 40, 34);
    if (c.strike.combo) {
      const s = c.strike;
      text(ctx, c.flinch ? '手抖了閃不掉！' : `第 ${s.idx + 1}/${s.hits} 下！點！`, f.x, f.y + 52, c.flinch ? 18 : 24, c.flinch ? '#ddd' : '#fff', { stroke: c.flinch ? '#333' : '#d10000', strokeW: 6 });
    } else if (game.strikesSeen <= 3 && !c.flinch) {
      text(ctx, '快點一下閃開！', f.x, f.y + 52, 22, '#fff', { stroke: '#d10000', strokeW: 6 });
    } else if (c.flinch) {
      text(ctx, '手抖了閃不掉！', f.x, f.y + 52, 18, '#ddd', { stroke: '#333', strokeW: 5 });
    }
  }

  // 連打進度：每一下一顆圓點
  function drawComboPips(ctx, c, time) {
    const s = c.strike;
    if (s.phase === 'dodged' && s.idx >= s.hits) return;
    const f = c.food;
    const n = s.hits;
    for (let i = 0; i < n; i++) {
      const px = f.x - (n - 1) * 13 + i * 26;
      const py = f.y + 82;
      ctx.beginPath();
      ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.fillStyle = i < s.idx ? '#3ddc6a' : i === s.idx ? (Math.sin(time * 20) > 0 ? '#ff2d2d' : '#ffdd00') : 'rgba(255,255,255,0.6)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(60,10,0,0.7)';
      ctx.stroke();
    }
    if (s.phase === 'gap') text(ctx, '還沒完！等下一個 ❗', f.x, f.y + 52, 18, '#ffe066', { stroke: '#7a2d00', strokeW: 5 });
  }

  // 大絕招：招式名稱橫幅、掃蕩標記、她嘴邊飛過去的食物
  function drawUlt(ctx, game, time) {
    const u = game.ult;
    if (!u) return;
    if (u.type === 'sweep') {
      // 標記要被掃走的食物（依序編號）
      u.targets.forEach((f, i) => {
        if (f.state !== 'pot') return;
        const R = 34 + Math.sin(time * 16 + i) * 3;
        ctx.strokeStyle = u.cur === f ? '#ffffff' : '#ff2d55';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 6]);
        ctx.lineDashOffset = time * 60;
        ctx.beginPath();
        ctx.arc(f.x, f.y, R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ff2d55';
        ctx.beginPath();
        ctx.arc(f.x + 26, f.y - 26, 11, 0, Math.PI * 2);
        ctx.fill();
        text(ctx, `${(u.nums && u.nums.get(f)) || i + 1}`, f.x + 26, f.y - 25, 14, '#fff');
      });
      for (const fl of u.flying) drawFood(ctx, game, fl.food, time, { noRing: true });
    }
    const showBanner = u.phase === 'charge' || u.phase === 'windup' || (u.phase === 'sweep' && u.t < 0.5);
    if (showBanner) {
      const total = u.type === 'sweep' ? FF.ULT.sweep.charge : FF.ULT.combo.windup;
      const tIn = u.phase === 'sweep' ? total : u.t;
      const k = Math.min(1, tIn * 5);
      const y = 336;
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = 'rgba(120,0,20,0.85)';
      ctx.beginPath();
      ctx.moveTo(-10, y - 36);
      ctx.lineTo(C.W + 10, y - 42);
      ctx.lineTo(C.W + 10, y + 30);
      ctx.lineTo(-10, y + 40);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffdd00';
      ctx.fillRect(0, y + 36 - 3, C.W, 3);
      ctx.globalAlpha = 1;
      const sc = 1.6 - 0.6 * k;
      ctx.translate(270, y - 10);
      ctx.scale(sc, sc);
      text(ctx, `💢 大絕招・${u.title}！`, 0, 0, 34, '#ffe066', { stroke: '#5a0010', strokeW: 8 });
      ctx.restore();
      text(ctx, u.sub, 270, y + 20, 15, '#fff', { stroke: 'rgba(60,0,10,0.8)', strokeW: 4 });
      // 蓄力條
      if (u.phase !== 'sweep') {
        const left = Math.max(0, 1 - u.t / total);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        roundRect(ctx, 150, y + 44, 240, 8, 4);
        ctx.fill();
        ctx.fillStyle = '#ffdd00';
        roundRect(ctx, 150, y + 44, 240 * left, 8, 4);
        ctx.fill();
      }
    }
    if (u.type === 'combo' && u.phase === 'armed') {
      const left = Math.max(0, 1 - u.t / FF.ULT.combo.wait);
      const y = 318;
      ctx.fillStyle = 'rgba(120,0,20,0.75)';
      roundRect(ctx, 110, y - 18, 320, 36, 18);
      ctx.fill();
      text(ctx, `🥢 她在等你夾！下一塊連打 ${u.hits} 下`, 270, y, 16, '#ffe066');
      ctx.fillStyle = '#ffdd00';
      roundRect(ctx, 130, y + 12, 280 * left, 4, 2);
      ctx.fill();
    }
  }

  // 夾著食物時，提示可以點她的臉餵她
  function drawFeedHint(ctx, game, time) {
    const p = game.player;
    if (p.state !== 'carry' || !p.carry || p.carry.feed) return;
    if (game.stats.fed >= 3 || (game.anger < 40 && !game.ult)) return;
    const G = C.gf;
    const a = 0.75 + 0.25 * Math.sin(time * 8);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(255,111,165,0.92)';
    roundRect(ctx, G.x + 62, G.y + 22, 112, 30, 15);
    ctx.fill();
    text(ctx, '👆點臉餵她', G.x + 118, G.y + 38, 15, '#fff');
    ctx.globalAlpha = 1;
    ctx.strokeStyle = `rgba(255,111,165,${0.4 + 0.3 * Math.sin(time * 8)})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(G.x, G.y + 4, G.r + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
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
    // 太長的副標逐字換行，避免超出畫面
    ctx.font = `bold 19px ${TEXT_FONT}`;
    const lines = [];
    for (const raw of b.sub.split('\n')) {
      let cur = '';
      for (const ch of FF.G.units(raw)) {
        // 標點不放行首（寧可讓上一行稍微超出一個字）
        if (ctx.measureText(cur + ch).width > C.W - 40 && cur && !'，。、；：！？）」』…'.includes(ch)) {
          lines.push(cur);
          cur = ch;
        } else cur += ch;
      }
      lines.push(cur);
    }
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
    FF.Scenes.drawBackground(ctx, game.venue, time, game);
    drawGF(ctx, game, time);
    drawTable(ctx, game.tableNo);
    drawPot(ctx, time, game.fx.spicy > 0, game.fx.soup, game.broth);

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

    if (game.ult) {
      ctx.globalAlpha = 0.55 + Math.sin(time * 20) * 0.3;
      ctx.fillStyle = '#ff2d55';
      ctx.beginPath();
      ctx.arc(g.tip.x, g.tip.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    drawChopsticks(ctx, g.tip, C.gfAnchor, game.ult ? '#ff5a7a' : '#f29bb8', game.ult ? '#8a0020' : '#b4466b');
    FF.ChopDraw.draw(ctx, FF.Chops.equipped(), p.tip, C.playerAnchor, time);
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
    drawUlt(ctx, game, time);
    drawFeedHint(ctx, game, time);
    drawParticles(ctx, game);
    drawFloaters(ctx, game);
    drawHUD(ctx, game, time);
    drawBubble(ctx, game);
    drawItems(ctx, game, time);
    FF.Scenes.drawEvents(ctx, game, time);
    drawBanner(ctx, game);
    drawNotices(ctx, game);
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
    const venue = FF.VENUES.find(v => v.id === FF.Save.data.venue) || FF.VENUES[0];
    FF.Scenes.drawBackground(ctx, venue, time, null);
    drawGF(ctx, null, time, FF.personaById(FF.Save.data.gfType));
    drawTable(ctx);
    drawPot(ctx, time, false, 0, FF.brothById(FF.Save.data.broth));
    for (const f of demoFoods) {
      const a = f.a + time * 0.15;
      f.x = C.pot.x + Math.cos(a) * f.r;
      f.y = C.pot.y + Math.sin(a) * f.r + Math.sin(time * 2 + f.phase) * 3;
      drawFood(ctx, null, f, time, { noRing: true });
    }
    drawWisps(ctx, time);
  }

  return { drawGame, drawMenuBg, fmtTime, drawGF, text, roundRect };
})();
