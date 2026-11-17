// 對象外觀與玩家筷子的 canvas 畫法（新增的髮型、眼睛、眉毛、配件、上衣、節慶服、照片臉，以及筷子造型）
// render.js 的 drawGF 與玩家筷子繪製會呼叫這裡；沒有自訂外觀時不會走到這裡的新程式碼，畫面跟原本一樣。
window.FF = window.FF || {};

FF.LookDraw = (() => {
  const TAU = Math.PI * 2;
  const dk = (hex, f) => FF.Look.darken(hex, f);

  function heart(ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.9);
    ctx.bezierCurveTo(cx - s * 1.5, cy - s * 0.1, cx - s * 0.7, cy - s * 1.2, cx, cy - s * 0.4);
    ctx.bezierCurveTo(cx + s * 0.7, cy - s * 1.2, cx + s * 1.5, cy - s * 0.1, cx, cy + s * 0.9);
    ctx.fill();
  }
  function bodyPath(ctx, x, y, r, sh) {
    ctx.beginPath();
    ctx.moveTo(x - sh, 262);
    ctx.quadraticCurveTo(x - sh + 5, y + r + 10, x, y + r + 6);
    ctx.quadraticCurveTo(x + sh - 5, y + r + 10, x + sh, 262);
    ctx.closePath();
  }

  // ---------- 髮型 ----------
  // 女生新髮型的後髮（鮑伯、麻花辮、大波浪）；回傳 true＝已經畫好，不用走原本的程式
  function backHair(ctx, look, x, y, r, time) {
    const st = look.style;
    if (st !== 'bob' && st !== 'braid' && st !== 'wave') return false;
    ctx.fillStyle = look.hair;
    if (st === 'braid') {
      // 側邊麻花辮：垂在右肩，一節一節、尾巴會輕輕晃
      const sw = Math.sin(time * 2.2) * 3;
      let bx = x + r * 0.78;
      let by = y + r * 0.45;
      for (let i = 0; i < 6; i++) {
        const k = i / 5;
        const cx = bx + Math.sin(i * 1.3) * 3 + sw * k;
        const cy = by + i * 17;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 13 - k * 4, 11, i % 2 ? 0.4 : -0.4, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#ff6fa5';
      ctx.beginPath();
      ctx.arc(bx + sw + Math.sin(6.5) * 3, by + 5 * 17 + 12, 5.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = look.hair;
    }
    ctx.beginPath();
    ctx.arc(x, y - 4, r * 1.14, Math.PI, 0);
    if (st === 'wave') {
      ctx.lineTo(x + r * 1.14, y + r * 1.05);
      ctx.quadraticCurveTo(x + r * 0.9, y + r * 1.25, x + r * 0.7, y + r * 0.9);
      ctx.lineTo(x - r * 0.7, y + r * 0.9);
      ctx.quadraticCurveTo(x - r * 0.9, y + r * 1.25, x - r * 1.14, y + r * 1.05);
      ctx.closePath();
      ctx.fill();
      // 大波浪：兩側一圈一圈的捲
      for (const s of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(x + s * r * (1.1 + (i % 2) * 0.1), y + r * (0.15 + i * 0.3), r * 0.22, 0, TAU);
          ctx.fill();
        }
      }
    } else if (st === 'bob') {
      ctx.lineTo(x + r * 1.16, y + r * 0.62);
      ctx.quadraticCurveTo(x + r * 0.95, y + r * 0.85, x + r * 0.7, y + r * 0.62);
      ctx.lineTo(x - r * 0.7, y + r * 0.62);
      ctx.quadraticCurveTo(x - r * 0.95, y + r * 0.85, x - r * 1.16, y + r * 0.62);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.lineTo(x + r * 1.12, y + r * 0.3);
      ctx.quadraticCurveTo(x + r * 0.95, y + r * 0.5, x + r * 0.75, y + r * 0.3);
      ctx.lineTo(x - r * 0.75, y + r * 0.3);
      ctx.quadraticCurveTo(x - r * 0.95, y + r * 0.5, x - r * 1.12, y + r * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    return true;
  }

  // 男生新髮型的後髮補充（原本的 drawMaleBack 先畫基本的一圈短髮，這裡再加東西）
  function maleBackExtra(ctx, look, x, y, r, time) {
    ctx.fillStyle = look.hair;
    if (look.style === 'manbun') {
      ctx.beginPath();
      ctx.arc(x, y - r * 1.28, r * 0.3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = dk(look.hair, 0.7);
      ctx.fillRect(x - r * 0.3, y - r * 1.07, r * 0.6, 4);
    } else if (look.style === 'curly') {
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r * 1.08, y - 4 + Math.sin(a) * r * 1.08, r * 0.3, 0, TAU);
        ctx.fill();
      }
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + s * r * 1.08, y + r * 0.1, r * 0.26, 0, TAU);
        ctx.fill();
      }
    }
  }

  // 男生新髮型的瀏海；回傳 true＝已經畫好
  function maleBangs(ctx, look, x, y, r) {
    const st = look.style;
    if (st === 'side') {
      // 旁分：左邊露額頭，右邊一大片瀏海斜斜掃過去
      ctx.beginPath();
      ctx.moveTo(x - r * 1.02, y - 2);
      ctx.quadraticCurveTo(x - r * 0.9, y - r * 1.2, x, y - r * 1.06);
      ctx.quadraticCurveTo(x + r * 0.9, y - r * 1.2, x + r * 1.02, y - 2);
      ctx.lineTo(x + r * 0.92, y - r * 0.38);
      ctx.quadraticCurveTo(x + r * 0.3, y - r * 0.72, x - r * 0.3, y - r * 0.98);
      ctx.quadraticCurveTo(x - r * 0.75, y - r * 0.8, x - r * 0.96, y - r * 0.3);
      ctx.closePath();
      ctx.fill();
      return true;
    }
    if (st === 'curly') {
      ctx.beginPath();
      ctx.moveTo(x - r * 1.02, y - 2);
      ctx.quadraticCurveTo(x - r * 0.9, y - r * 1.2, x, y - r * 1.06);
      ctx.quadraticCurveTo(x + r * 0.9, y - r * 1.2, x + r * 1.02, y - 2);
      ctx.lineTo(x + r * 0.8, y - r * 0.62);
      ctx.lineTo(x - r * 0.8, y - r * 0.62);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(x - r * 0.75 + i * r * 0.3, y - r * 0.6 + (i % 2) * 4, r * 0.17, 0, TAU);
        ctx.fill();
      }
      return true;
    }
    return false;
  }

  // ---------- 上衣款式與節慶服的裝飾 ----------
  function outfit(ctx, ap, x, y, r, sh) {
    if (!ap.custom) return;
    const top = y + r + 6;
    const o = ap.outfit;
    const f = ap.fest;
    ctx.save();
    bodyPath(ctx, x, y, r, sh);
    ctx.clip();
    if (f === 'none' || !f) {
      if (o === 'stripe') {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        for (let yy = top + 6; yy < 262; yy += 11) ctx.fillRect(x - sh, yy, sh * 2, 5);
      } else if (o === 'heart') {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (let i = 0; i < 9; i++) heart(ctx, x - sh + 14 + i * ((sh * 2 - 28) / 8), top + 18 + (i % 3) * 11, 4.5);
      } else if (o === 'overall') {
        ctx.fillStyle = '#4a78b8';
        for (const s of [-1, 1]) ctx.fillRect(x + s * sh * 0.42 - 6, top, 12, 262 - top);
        ctx.fillRect(x - sh * 0.42, 238, sh * 0.84, 30);
        ctx.fillStyle = '#ffd24a';
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(x + s * sh * 0.42, 238, 3.5, 0, TAU);
          ctx.fill();
        }
      } else if (o === 'hoodie') {
        ctx.fillStyle = dk(ap.shirt, 0.82);
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x - 36, 241, 72, 24, 8) : ctx.rect(x - 36, 241, 72, 24);
        ctx.fill();
      }
    } else if (f === 'xmas') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 3, top, 6, 262 - top);
      ctx.fillStyle = '#fff';
      for (const yy of [top + 18, top + 32]) {
        ctx.beginPath();
        ctx.arc(x, yy, 3.5, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#16813a';
      ctx.fillRect(x - sh, 250, sh * 2, 5);
    } else if (f === 'cny') {
      ctx.fillStyle = '#f5c542';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x, top + 14 + i * 12, 3.6, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = '#f5c542';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - sh * 0.9, 256);
      ctx.lineTo(x + sh * 0.9, 256);
      ctx.stroke();
    } else if (f === 'halloween') {
      ctx.fillStyle = '#2a1a2e';
      for (const s of [-1, 1]) {
        const bx = x + s * 46;
        const by = 244;
        ctx.beginPath();
        ctx.ellipse(bx, by, 4, 5, 0, 0, TAU);
        ctx.moveTo(bx, by - 2);
        ctx.quadraticCurveTo(bx + s * 10, by - 12, bx + s * 17, by - 2);
        ctx.quadraticCurveTo(bx + s * 12, by - 3, bx + s * 10, by + 4);
        ctx.quadraticCurveTo(bx + s * 5, by - 1, bx, by + 5);
        ctx.fill();
        ctx.moveTo(bx, by - 2);
        ctx.quadraticCurveTo(bx - s * 10, by - 12, bx - s * 17, by - 2);
        ctx.quadraticCurveTo(bx - s * 12, by - 3, bx - s * 10, by + 4);
        ctx.quadraticCurveTo(bx - s * 5, by - 1, bx, by + 5);
        ctx.fill();
      }
    } else if (f === 'party') {
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.moveTo(x - sh, top + 10);
      ctx.lineTo(x - sh, top + 24);
      ctx.lineTo(x + sh, 262);
      ctx.lineTo(x + sh, 248);
      ctx.closePath();
      ctx.fill();
      const cs = ['#ff5a7a', '#fff', '#7a5cd6', '#ffe066', '#3fae6a'];
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = cs[i % cs.length];
        ctx.fillRect(x - sh + 8 + ((i * 37) % (sh * 2 - 16)), top + 4 + ((i * 53) % Math.max(10, 262 - top - 6)), 4, 4);
      }
    }
    ctx.restore();
    // 領口（要畫在身體外面一點）
    ctx.lineJoin = 'round';
    if (f === 'xmas') {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.ellipse(x, top + 2, 29, 12, 0, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath();
      ctx.arc(x, top + 16, 5, 0, TAU);
      ctx.fill();
    } else if (f === 'cny') {
      ctx.strokeStyle = '#f5c542';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(x, top + 1, 26, 11, 0, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#f5c542';
      ctx.font = 'bold 17px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.__notr = true;
      ctx.fillText('福', x - 42, 244);
      ctx.__notr = false;
    } else if (f === 'halloween') {
      ctx.fillStyle = '#2a1a2e';
      ctx.beginPath();
      ctx.moveTo(x - 28, top - 2);
      for (let i = 0; i <= 8; i++) ctx.lineTo(x - 28 + i * 7, top - 2 + (i % 2 ? 11 : 3));
      ctx.lineTo(x + 28, top - 6);
      ctx.closePath();
      ctx.fill();
    } else if (!f || f === 'none') {
      if (o === 'hoodie') {
        ctx.strokeStyle = dk(ap.shirt, 0.82);
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.ellipse(x, top + 1, 26, 11, 0, 0, Math.PI);
        ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(x + s * 9, top + 10);
          ctx.lineTo(x + s * 11, top + 28);
          ctx.stroke();
        }
      } else if (o === 'collar') {
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1.5;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(x + s * 17, top - 3);
          ctx.lineTo(x + s * 2, top + 16);
          ctx.lineTo(x + s * 32, top + 13);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.arc(x, top + 24 + i * 11, 2.2, 0, TAU);
          ctx.fill();
        }
      }
    }
  }

  // ---------- 眼睛（只換「平常」的眼睛；開心瞇瞇眼、愛心眼、驚嚇等表情照原本的畫）----------
  function eyes(ctx, kind, x, ex, ey, h, lookY) {
    for (const s of [-1, 1]) {
      const cx = x + s * ex;
      const cy = ey + lookY;
      if (kind === 'big') {
        ctx.beginPath();
        ctx.ellipse(cx, cy, 8.5, h + 3.5, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx + 3, cy - 3.5, 3.2, 0, TAU);
        ctx.arc(cx - 3, cy + 3, 1.6, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#3a2219';
      } else if (kind === 'sleepy') {
        ctx.beginPath();
        ctx.ellipse(cx, cy + 2, 6, Math.max(2.5, h * 0.55), 0, 0, TAU);
        ctx.fill();
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(cx - 9, cy - Math.max(0, h * 0.55 - 3));
        ctx.lineTo(cx + 9, cy - Math.max(0, h * 0.55 - 3));
        ctx.stroke();
      } else if (kind === 'cat') {
        ctx.beginPath();
        ctx.ellipse(cx, cy, 6.5, h * 0.85, 0, 0, TAU);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx + s * 6, cy - 1);
        ctx.lineTo(cx + s * 13, cy - 6);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx + 2, cy - 2, 1.8, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#3a2219';
        ctx.lineWidth = 3.5;
      } else if (kind === 'dot') {
        ctx.beginPath();
        ctx.arc(cx, cy, 4 + (h > 6 ? 1 : 0), 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx + 1.5, cy - 1.5, 1.3, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#3a2219';
      }
    }
  }

  // ---------- 眉毛 ----------
  function brows(ctx, kind, color, x, ex, ey, m, scared) {
    const tilt = m === 'furious' ? 9 : m === 'annoyed' ? 4.5 : 0;
    const lift = scared ? 8 : m === 'happy' ? 2 : 0;
    const by = ey - 15 - lift;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = kind === 'thin' ? 2.5 : kind === 'thick' ? 6.5 : kind === 'flat' ? 5 : 4;
    for (const s of [-1, 1]) {
      const ox = x + s * (ex + 10);
      const ix = x + s * (ex - 9);
      const oy = by - tilt * 0.35 + (scared ? 3 : 0);
      const iy = by + tilt * 0.85 - (scared ? 3 : 0);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      if (kind === 'arch') ctx.quadraticCurveTo((ox + ix) / 2 + s * 1, Math.min(oy, iy) - 7, ix, iy);
      else if (kind === 'flat') ctx.lineTo(ix, (oy + iy) / 2 + (tilt ? 1 : 0) + (tilt ? 0 : 0));
      else ctx.lineTo(ix, iy);
      ctx.stroke();
    }
  }

  // ---------- 配件與節慶帽 ----------
  function acc(ctx, ap, x, y, r, st) {
    if (!ap.custom) return;
    const a = ap.acc;
    const col = ap.accColor;
    const fest = ap.fest && ap.fest !== 'none' ? ap.fest : '';
    const ex = r * 0.38;
    const ey = y - r * 0.02;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (a === 'glasses') {
      ctx.strokeStyle = col === '#ffffff' ? '#3a2a22' : col;
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + s * ex, ey, 15, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(x - ex + 15, ey - 2);
      ctx.quadraticCurveTo(x, ey - 8, x + ex - 15, ey - 2);
      ctx.stroke();
    } else if (a === 'shades') {
      ctx.fillStyle = '#16161c';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + s * (ex - 17), ey - 9);
        ctx.lineTo(x + s * (ex + 17), ey - 9);
        ctx.quadraticCurveTo(x + s * (ex + 17), ey + 17, x + s * ex, ey + 15);
        ctx.quadraticCurveTo(x + s * (ex - 17), ey + 17, x + s * (ex - 17), ey - 9);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.moveTo(x + s * (ex - 11), ey - 6);
        ctx.lineTo(x + s * (ex - 3), ey - 6);
        ctx.lineTo(x + s * (ex - 9), ey + 4);
        ctx.fill();
        ctx.fillStyle = '#16161c';
      }
      ctx.strokeStyle = '#16161c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - ex + 17, ey - 8);
      ctx.lineTo(x + ex - 17, ey - 8);
      ctx.stroke();
    } else if (a === 'mask') {
      const down = st.chewing || st.fed || st.scared || st.look || st.ult || st.striking || st.m === 'furious';
      ctx.strokeStyle = 'rgba(80,80,80,0.55)';
      ctx.lineWidth = 2;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + s * r * 0.82, down ? y + r * 0.95 : y + r * 0.18);
        ctx.quadraticCurveTo(x + s * r * 1.12, y + r * 0.3, x + s * r * 1.02, y + r * 0.02);
        ctx.stroke();
      }
      ctx.fillStyle = col === '#ffffff' ? '#f4f8fb' : col;
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      if (!down) {
        ctx.moveTo(x - r * 0.84, y + r * 0.16);
        ctx.quadraticCurveTo(x, y + r * 0.06, x + r * 0.84, y + r * 0.16);
        ctx.quadraticCurveTo(x + r * 0.78, y + r * 0.85, x, y + r * 1.0);
        ctx.quadraticCurveTo(x - r * 0.78, y + r * 0.85, x - r * 0.84, y + r * 0.16);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.moveTo(x - r * 0.8, y + r * (0.16 + i * 0.2));
          ctx.quadraticCurveTo(x, y + r * (0.2 + i * 0.2), x + r * 0.8, y + r * (0.16 + i * 0.2));
          ctx.stroke();
        }
      } else {
        // 拉到下巴：表情露出來
        ctx.ellipse(x, y + r * 1.02, r * 0.7, 9, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    } else if (a === 'bow') {
      ctx.fillStyle = col;
      const bx = x + r * 0.45;
      const by = y - r * 1.05;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + s * 18, by - 22, bx + s * 30, by - 6);
        ctx.quadraticCurveTo(bx + s * 28, by + 12, bx, by);
        ctx.fill();
      }
      ctx.fillStyle = dk(col, 0.8);
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, TAU);
      ctx.fill();
    } else if (a === 'catears') {
      ctx.strokeStyle = col;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, y - 4, r * 1.1, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
      for (const s of [-1, 1]) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(x + s * r * 0.35, y - r * 1.1);
        ctx.lineTo(x + s * r * 0.62, y - r * 1.62);
        ctx.lineTo(x + s * r * 0.95, y - r * 0.82);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffb6c9';
        ctx.beginPath();
        ctx.moveTo(x + s * r * 0.5, y - r * 1.08);
        ctx.lineTo(x + s * r * 0.64, y - r * 1.4);
        ctx.lineTo(x + s * r * 0.82, y - r * 0.92);
        ctx.closePath();
        ctx.fill();
      }
    } else if (a === 'flower') {
      const fx = x - r * 0.72;
      const fy = y - r * 0.82;
      ctx.fillStyle = col;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(fx + Math.cos((i / 5) * TAU) * 8, fy + Math.sin((i / 5) * TAU) * 8, 6.5, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath();
      ctx.arc(fx, fy, 5, 0, TAU);
      ctx.fill();
    } else if (a === 'cap' && !fest) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y - 4, r * 1.16, Math.PI, 0);
      ctx.lineTo(x + r * 1.0, y - r * 0.56);
      ctx.lineTo(x - r * 1.0, y - r * 0.56);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = dk(col, 0.72);
      ctx.beginPath();
      ctx.ellipse(x, y - r * 0.52, r * 1.12, 9, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y - r * 1.2, 4.5, 0, TAU);
      ctx.fill();
    } else if (a === 'beanie' && !fest) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y - 4, r * 1.18, Math.PI, 0);
      ctx.lineTo(x + r * 1.1, y - r * 0.55);
      ctx.lineTo(x - r * 1.1, y - r * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = dk(col, 0.78);
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x - r * 1.14, y - r * 0.72, r * 2.28, 15, 6) : ctx.rect(x - r * 1.14, y - r * 0.72, r * 2.28, 15);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      for (let i = -4; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * r * 0.25, y - r * 0.72);
        ctx.lineTo(x + i * r * 0.25, y - r * 0.72 + 15);
        ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y - r * 1.34, 9, 0, TAU);
      ctx.fill();
    }

    // 節慶帽
    if (fest === 'xmas') {
      ctx.fillStyle = '#d8262f';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.98, y - r * 0.62);
      ctx.quadraticCurveTo(x - r * 0.9, y - r * 1.6, x + r * 0.95, y - r * 1.38);
      ctx.quadraticCurveTo(x + r * 0.75, y - r * 1.0, x + r * 0.98, y - r * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(x, y - r * 0.6, r * 1.08, 9, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + r * 0.95, y - r * 1.38, 9, 0, TAU);
      ctx.fill();
    } else if (fest === 'cny') {
      ctx.fillStyle = '#c4161c';
      ctx.beginPath();
      ctx.arc(x, y - r * 0.62, r * 0.78, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f5c542';
      ctx.fillRect(x - r * 0.8, y - r * 0.66, r * 1.6, 7);
      ctx.beginPath();
      ctx.arc(x, y - r * 1.4, 6, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#f5c542';
      ctx.lineWidth = 2;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + s * r * 0.78, y - r * 0.6);
        ctx.lineTo(x + s * r * 0.9, y - r * 0.2);
        ctx.stroke();
        ctx.fillStyle = '#e8414f';
        ctx.beginPath();
        ctx.arc(x + s * r * 0.9, y - r * 0.15, 5, 0, TAU);
        ctx.fill();
      }
    } else if (fest === 'halloween') {
      ctx.fillStyle = '#2a1a2e';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.6, y - r * 0.72);
      ctx.quadraticCurveTo(x - r * 0.2, y - r * 1.3, x + r * 0.5, y - r * 1.85);
      ctx.quadraticCurveTo(x + r * 0.55, y - r * 1.3, x + r * 0.62, y - r * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x, y - r * 0.7, r * 1.32, 10, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#8a4fd6';
      ctx.fillRect(x - r * 0.6, y - r * 0.9, r * 1.2, 9);
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(x - 6, y - r * 0.9 + 1, 12, 7);
    } else if (fest === 'party') {
      ctx.save();
      ctx.translate(x + r * 0.2, y - r * 0.9);
      ctx.rotate(0.22);
      const cols = ['#ff5a7a', '#ffe066', '#4cc3e8'];
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, 0);
      ctx.lineTo(0, -r * 1.15);
      ctx.lineTo(r * 0.55, 0);
      ctx.closePath();
      ctx.fillStyle = '#ff9acb';
      ctx.fill();
      ctx.clip();
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = cols[i % 3];
        ctx.fillRect(-r * 0.6, -r * 0.25 - i * r * 0.28, r * 1.2, r * 0.13);
      }
      ctx.restore();
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.arc(x + r * 0.2 + Math.sin(0.22) * -r * 1.15, y - r * 0.9 - Math.cos(0.22) * r * 1.15, 7, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 照片臉 ----------
  // 底層：火焰邊框（大絕招）＋照片本體（圓形）＋表情用的色調
  function photoFace(ctx, img, x, y, r, st, time, ap) {
    if (st.ult) {
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * TAU;
        const fl = 10 + Math.sin(time * 14 + i * 1.7) * 6 + (i % 2) * 5;
        ctx.fillStyle = i % 2 ? '#ffb020' : '#ff4a1c';
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a - 0.1) * (r - 2), y + Math.sin(a - 0.1) * (r - 2));
        ctx.lineTo(x + Math.cos(a) * (r + fl), y + Math.sin(a) * (r + fl));
        ctx.lineTo(x + Math.cos(a + 0.1) * (r - 2), y + Math.sin(a + 0.1) * (r - 2));
        ctx.fill();
      }
    }
    const turn = st.look ? 5 : 0;
    const sx = st.look ? 0.93 : 1 + (st.striking ? 0.03 : 0);
    const sy = st.chewing ? 1 + Math.sin(time * 18) * 0.04 : st.phone ? 0.97 : 1 + (st.striking ? 0.03 : 0);
    const shake = st.scared ? Math.sin(time * 30) * 1.8 : 0;
    ctx.save();
    ctx.translate(x + turn + shake, y + (st.phone ? 3 : 0));
    ctx.scale(sx, sy);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.clip();
    ctx.fillStyle = ap && ap.skin ? ap.skin : '#ffe0c7';
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.drawImage(img, -r, -r, r * 2, r * 2);
    let tint = null;
    if (st.fed === 'yuck') tint = 'rgba(120,200,80,0.32)';
    else if (st.scared) tint = 'rgba(255,255,255,0.28)';
    else if (st.m === 'furious' || st.ult) tint = `rgba(255,30,30,${0.26 + Math.sin(time * 12) * 0.06})`;
    else if (st.m === 'annoyed') tint = 'rgba(255,60,60,0.1)';
    else if (st.fed === 'love') tint = 'rgba(255,110,160,0.22)';
    if (tint) {
      ctx.fillStyle = tint;
      ctx.fillRect(-r, -r, r * 2, r * 2);
    }
    ctx.restore();
    ctx.strokeStyle = ap && ap.skin ? ap.skin : '#ffe0c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + turn + shake, y + (st.phone ? 3 : 0), r * sx, 0, TAU);
    ctx.stroke();
  }

  // 上層（髮型之上）：腮紅、青筋、汗滴、愛心
  function photoFx(ctx, x, y, r, st, time, ap) {
    ctx.save();
    ctx.lineCap = 'round';
    if (ap && ap.blush !== false && (st.m === 'happy' || st.m === 'normal' || st.chewing || st.fed === 'love')) {
      ctx.fillStyle = 'rgba(255,110,140,0.32)';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.55, y + r * 0.3, 11, 7, 0, 0, TAU);
      ctx.ellipse(x + r * 0.55, y + r * 0.3, 11, 7, 0, 0, TAU);
      ctx.fill();
    }
    if (st.m === 'furious' || st.ult || st.striking) {
      // 青筋：四條短線圍成的井字
      const vx = x - r * 0.52;
      const vy = y - r * 0.55;
      const p = 1 + Math.sin(time * 12) * 0.12;
      ctx.strokeStyle = '#e0242c';
      ctx.lineWidth = 3.2;
      for (const [dx1, dy1, dx2, dy2] of [[-4, -9, -3, 9], [4, -9, 5, 9], [-10, -3, 10, -4], [-10, 4, 10, 5]]) {
        ctx.beginPath();
        ctx.moveTo(vx + dx1 * p, vy + dy1 * p);
        ctx.lineTo(vx + dx2 * p, vy + dy2 * p);
        ctx.stroke();
      }
    }
    if (st.scared || st.m === 'annoyed' || st.phone) {
      const n = st.scared ? 3 : 1;
      ctx.fillStyle = '#6ec6ff';
      ctx.strokeStyle = '#2f86c8';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < n; i++) {
        const dx = [r * 0.75, -r * 0.8, r * 0.85][i];
        const dy = (i === 0 ? -r * 0.3 : i === 1 ? -r * 0.55 : r * 0.05) + ((time * 30 + i * 9) % 12);
        ctx.beginPath();
        ctx.moveTo(x + dx, y + dy - 9);
        ctx.quadraticCurveTo(x + dx + 7, y + dy + 2, x + dx, y + dy + 6);
        ctx.quadraticCurveTo(x + dx - 7, y + dy + 2, x + dx, y + dy - 9);
        ctx.fill();
        ctx.stroke();
      }
    }
    if (st.fed === 'love') {
      ctx.fillStyle = '#ff3d7f';
      for (let i = 0; i < 3; i++) heart(ctx, x + (i - 1) * r * 0.75, y - r * 0.55 - ((time * 22 + i * 7) % 16), 5 + (i % 2) * 2);
    }
    ctx.restore();
  }

  return { backHair, maleBackExtra, maleBangs, outfit, eyes, brows, acc, photoFace, photoFx, heart };
})();

// ---------- 玩家的筷子造型 ----------
FF.ChopDraw = (() => {
  const TAU = Math.PI * 2;

  function poly(ctx, Ls, w0, w1) {
    ctx.beginPath();
    ctx.moveTo(0, -w0 / 2);
    ctx.lineTo(Ls, -w1 / 2);
    ctx.lineTo(Ls, w1 / 2);
    ctx.lineTo(0, w0 / 2);
    ctx.closePath();
  }
  const W = (Ls, x) => 3 + 5 * (x / Ls);
  function grad(ctx, stops, h = 5) {
    const g = ctx.createLinearGradient(0, -h, 0, h);
    stops.forEach(([k, c]) => g.addColorStop(k, c));
    return g;
  }
  function band(ctx, Ls, x0, x1, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x0, -W(Ls, x0) / 2);
    ctx.lineTo(x1, -W(Ls, x1) / 2);
    ctx.lineTo(x1, W(Ls, x1) / 2);
    ctx.lineTo(x0, W(Ls, x0) / 2);
    ctx.closePath();
    ctx.fill();
  }
  function shine(ctx, Ls, x0, x1, a) {
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x0, -W(Ls, x0) * 0.22);
    ctx.lineTo(x1, -W(Ls, x1) * 0.22);
    ctx.stroke();
  }

  // 每個造型畫「一支」，局部座標：x 軸從筷尖(0)往握把方向，y 軸是寬度；s 是左右（-1／1），inner 朝向另一支的那一側
  const STICKS = {
    plain(ctx, Ls) {
      poly(ctx, Ls, 3, 8);
      ctx.fillStyle = '#d9a066';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#7a4a1f';
      ctx.stroke();
    },
    steel(ctx, Ls) {
      poly(ctx, Ls, 3, 8);
      ctx.fillStyle = grad(ctx, [[0, '#f4f7fa'], [0.5, '#a3adb8'], [1, '#626e7b']]);
      ctx.fill();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = '#46505b';
      ctx.stroke();
      shine(ctx, Ls, 8, Ls - 8, 0.8);
      band(ctx, Ls, 0, 16, '#6f7a86');
      ctx.fillStyle = '#46505b';
      for (let x = Ls * 0.7; x < Ls - 5; x += 9) ctx.fillRect(x, -W(Ls, x) / 2, 2, W(Ls, x));
    },
    lacquer(ctx, Ls) {
      poly(ctx, Ls, 3, 8);
      ctx.fillStyle = grad(ctx, [[0, '#e0483f'], [0.6, '#c4302b'], [1, '#8f1c1c']]);
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = '#4a0c0c';
      ctx.stroke();
      band(ctx, Ls, 0, 24, '#1c1414');
      for (const x of [30, 36, Ls * 0.55, Ls * 0.9]) band(ctx, Ls, x, x + 3.5, '#f2c230');
      shine(ctx, Ls, 40, Ls - 10, 0.35);
    },
    spoon(ctx, Ls, s, inner) {
      poly(ctx, Ls, 3, 8);
      ctx.fillStyle = grad(ctx, [[0, '#f2f4f7'], [1, '#8d98a4']]);
      ctx.fill();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = '#55606c';
      ctx.stroke();
      // 湯匙頭
      ctx.fillStyle = '#d9dee4';
      ctx.beginPath();
      ctx.ellipse(10, 0, 17, 10.5, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#aeb6bf';
      ctx.beginPath();
      ctx.ellipse(10, 0, 12, 6.5, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.ellipse(5, -3, 4, 2, 0, 0, TAU);
      ctx.fill();
    },
    fork(ctx, Ls) {
      poly(ctx, Ls, 3, 8);
      ctx.fillStyle = grad(ctx, [[0, '#f2f4f7'], [1, '#8d98a4']]);
      ctx.fill();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = '#55606c';
      ctx.stroke();
      ctx.fillStyle = '#e4e8ec';
      ctx.beginPath();
      ctx.moveTo(26, -6);
      ctx.lineTo(12, -12);
      ctx.lineTo(12, 12);
      ctx.lineTo(26, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      for (const k of [-8, 0, 8]) {
        ctx.beginPath();
        ctx.moveTo(14, k - 2.2);
        ctx.lineTo(-10, k * 0.8);
        ctx.lineTo(14, k + 2.2);
        ctx.closePath();
        ctx.fillStyle = '#e4e8ec';
        ctx.fill();
        ctx.stroke();
      }
    },
    tongs(ctx, Ls, s, inner) {
      poly(ctx, Ls, 3, 8);
      ctx.fillStyle = grad(ctx, [[0, '#dfe4ea'], [1, '#5f6b78']]);
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = '#3f4954';
      ctx.stroke();
      // 夾口：鋸齒
      ctx.fillStyle = '#9aa5b1';
      ctx.beginPath();
      ctx.moveTo(0, -3 + inner * 0);
      ctx.lineTo(0, 3);
      ctx.lineTo(26, 6 + 4);
      ctx.lineTo(26, -6 - 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#3f4954';
      ctx.lineWidth = 1.5;
      for (let x = 3; x < 25; x += 4) {
        ctx.beginPath();
        ctx.moveTo(x, inner * (3 + x * 0.25));
        ctx.lineTo(x + 2, inner * (7 + x * 0.25));
        ctx.stroke();
      }
      shine(ctx, Ls, 30, Ls - 10, 0.6);
      band(ctx, Ls, Ls * 0.82, Ls * 0.9, '#2b2f36');
    },
    saber(ctx, Ls, s, inner, time) {
      const bl = Ls * 0.8;
      const col = s < 0 ? '#44e0ff' : '#ff4d9a';
      const pulse = 0.85 + Math.sin(time * 9 + s) * 0.15;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.16 * pulse;
      ctx.lineWidth = 20;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bl, 0); ctx.stroke();
      ctx.globalAlpha = 0.3 * pulse;
      ctx.lineWidth = 11;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bl, 0); ctx.stroke();
      ctx.restore();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4.2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bl, 0); ctx.stroke();
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 6.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bl, 0); ctx.stroke();
      ctx.globalAlpha = 1;
      // 握把
      band(ctx, Ls, bl, Ls, '#8d98a4');
      band(ctx, Ls, bl + 2, bl + 5, '#2b2f36');
      for (let x = bl + 10; x < Ls - 3; x += 7) band(ctx, Ls, x, x + 3, '#2b2f36');
      ctx.fillStyle = '#ff5050';
      ctx.fillRect(bl + 6, -1.2, 3, 2.4);
    },
    gold(ctx, Ls, s, inner, time) {
      poly(ctx, Ls, 3, 8);
      ctx.fillStyle = grad(ctx, [[0, '#fff3b0'], [0.45, '#f2c230'], [1, '#a8730b']]);
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = '#7a4f06';
      ctx.stroke();
      shine(ctx, Ls, 6, Ls - 6, 0.85);
      for (const x of [Ls * 0.3, Ls * 0.6]) band(ctx, Ls, x, x + 2.5, '#fff3b0');
      // 閃光掃過
      const sx = ((time * 90 + (s > 0 ? 60 : 0)) % (Ls + 60)) - 30;
      if (sx > 0 && sx < Ls) {
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx - 6, 0); ctx.lineTo(sx + 6, 0);
        ctx.moveTo(sx, -6); ctx.lineTo(sx, 6);
        ctx.stroke();
      }
    },
    scallion(ctx, Ls) {
      const wt = x => W(Ls, x) + 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -wt(0) / 2);
      ctx.lineTo(Ls, -wt(Ls) / 2);
      ctx.quadraticCurveTo(Ls + 8, 0, Ls, wt(Ls) / 2);
      ctx.lineTo(0, wt(0) / 2);
      ctx.closePath();
      ctx.fillStyle = grad(ctx, [[0, '#7bd465'], [1, '#2f8a3a']]);
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#1f5f28';
      ctx.stroke();
      // 蔥白
      ctx.beginPath();
      ctx.moveTo(0, -wt(0) / 2);
      ctx.lineTo(Ls * 0.24, -wt(Ls * 0.24) / 2);
      ctx.lineTo(Ls * 0.24, wt(Ls * 0.24) / 2);
      ctx.lineTo(0, wt(0) / 2);
      ctx.closePath();
      ctx.fillStyle = grad(ctx, [[0, '#ffffff'], [1, '#d8ecc4']]);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#8bc27a';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Ls * 0.24, -wt(Ls * 0.24) / 2); ctx.lineTo(Ls * 0.24, wt(Ls * 0.24) / 2); ctx.stroke();
      // 蔥鬚
      ctx.strokeStyle = '#e9e2c8';
      ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * 0.5);
        ctx.quadraticCurveTo(-5, i * 1.6, -9, i * 2.4);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(20,90,30,0.45)';
      ctx.beginPath(); ctx.moveTo(Ls * 0.3, 0); ctx.lineTo(Ls - 4, 0); ctx.stroke();
    },
    rainbow(ctx, Ls, s, inner, time) {
      const N = 24;
      for (let k = 0; k < N; k++) {
        const x0 = (k / N) * Ls;
        const x1 = ((k + 1) / N) * Ls + 0.8;
        ctx.fillStyle = `hsl(${(k * 17 + time * 90) % 360},92%,60%)`;
        ctx.beginPath();
        ctx.moveTo(x0, -W(Ls, x0) / 2);
        ctx.lineTo(x1, -W(Ls, x1) / 2);
        ctx.lineTo(x1, W(Ls, x1) / 2);
        ctx.lineTo(x0, W(Ls, x0) / 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(70,30,90,0.7)';
      poly(ctx, Ls, 3, 8);
      ctx.stroke();
      shine(ctx, Ls, 6, Ls - 6, 0.55);
    },
  };

  // 畫一雙筷子：tip 筷尖、anchor 握把方向（跟原本的 drawChopsticks 同一組幾何）
  function draw(ctx, id, tip, anchor, time, len) {
    const dx = anchor.x - tip.x;
    const dy = anchor.y - tip.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d;
    const uy = dy / d;
    const px = -uy;
    const py = ux;
    const L = len || FF.CONFIG.chopLen;
    const fn = STICKS[id] || STICKS.plain;
    const ends = [];
    for (const s of [-1, 1]) {
      const sx = tip.x + px * s * 3;
      const sy = tip.y + py * s * 3;
      const ex = tip.x + ux * L + px * s * 11;
      const ey = tip.y + uy * L + py * s * 11;
      const Ls = Math.hypot(ex - sx, ey - sy);
      ends.push([ex, ey]);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(Math.atan2(ey - sy, ex - sx));
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 1;
      try { fn(ctx, Ls, s, -s, time || 0); } finally { ctx.restore(); }
    }
    if (id === 'tongs') {
      // 夾子尾端的彈簧環
      const cx = tip.x + ux * (L + 34);
      const cy = tip.y + uy * (L + 34);
      ctx.strokeStyle = '#3f4954';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(ends[0][0], ends[0][1]);
      ctx.quadraticCurveTo(cx, cy, ends[1][0], ends[1][1]);
      ctx.stroke();
      ctx.strokeStyle = '#aab4bf';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  // 小預覽（筷子櫃的列表）：筷尖在左下，往右上延伸；w×h 是畫布大小
  function thumb(ctx, id, w, h, time) {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    draw(ctx, id, { x: w * 0.1, y: h * 0.82 }, { x: w * 2, y: -h * 1.3 }, time, w * 1.05);
    ctx.restore();
  }

  return { draw, thumb, ids: Object.keys(STICKS) };
})();
