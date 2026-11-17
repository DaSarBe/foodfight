// 分享成績圖：用 canvas 畫一張直式成績圖，優先用 Web Share API 分享圖片檔，不支援就下載 PNG
window.FF = window.FF || {};

FF.Share = (() => {
  const W = 720;
  const H = 1280;
  const URL_TEXT = 'https://dasarbe.github.io/foodfight/';
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const TEXT_FONT = '"PingFang TC","Noto Sans TC","Microsoft JhengHei","WenQuanYi Zen Hei",sans-serif';

  function font(size, weight = 'bold') {
    return `${weight} ${size}px ${TEXT_FONT}`;
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

  // 逐字換行；超過 maxLines 就把最後一行截斷加「…」
  function wrap(ctx, str, maxW, maxLines) {
    const lines = [];
    let cur = '';
    for (const ch of FF.G.units(str)) {
      if (ctx.measureText(cur + ch).width > maxW && cur) {
        lines.push(cur);
        cur = ch;
      } else cur += ch;
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
      lines.length = maxLines;
      let last = lines[maxLines - 1];
      while (last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
      lines[maxLines - 1] = last + '…';
    }
    return lines;
  }

  // 在寬度內放得下的最大字級
  function fit(ctx, str, maxW, size, min = 14, weight = 'bold') {
    let s = size;
    ctx.font = font(s, weight);
    while (s > min && ctx.measureText(str).width > maxW) {
      s -= 1;
      ctx.font = font(s, weight);
    }
    return s;
  }

  function txt(ctx, str, x, y, size, color, { align = 'center', weight = 'bold', stroke = null, strokeW = 6, maxW = 0 } = {}) {
    const s = maxW ? fit(ctx, str, maxW, size, 12, weight) : size;
    ctx.font = font(s, weight);
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

  function emo(ctx, ch, x, y, size) {
    ctx.font = `${size}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, x, y);
  }

  function render(r) {
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d');
    const ch = r.challenge;

    // 背景
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#ffb36b');
    bg.addColorStop(0.5, '#ff7a59');
    bg.addColorStop(1, '#b8341f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.12;
    const deco = ['🍲', '🥢', '🦐', '🥩', '🌽', '🍥', '🧆', '🦀'];
    for (let i = 0; i < 40; i++) emo(ctx, deco[i % deco.length], (i % 5) * 160 + ((Math.floor(i / 5) % 2) * 80) + 20, Math.floor(i / 5) * 165 + 40, 54);
    ctx.globalAlpha = 1;

    // 標題
    txt(ctx, '🍲 搶火鍋大作戰', W / 2, 92, 60, '#fff', { stroke: '#8a2a12', strokeW: 10 });
    const cp = r.comp;
    const sub = ch ? `${ch.icon} 紀念日挑戰：${ch.name}`
      : cp ? (cp.kind === 'daily' ? `🗓️ 每日同題 ${cp.dateKey}${cp.official ? '' : '（練習）'}・競技模式` : (r.duel ? `⚔️ 對決${r.duel.result === 'win' ? '・我贏了' : r.duel.result === 'lose' ? '・我輸了' : '・平手'}・競技模式` : '⚔️ 對決・競技模式'))
        : '跟女朋友的火鍋攻防戰';
    txt(ctx, sub, W / 2, 156, 30, '#fff3d6', { stroke: 'rgba(120,30,10,0.6)', strokeW: 6, maxW: W - 120 });

    // 白色卡片
    const cx = 44;
    const cy = 196;
    const cw = W - 88;
    const chh = 960;
    ctx.fillStyle = 'rgba(80,20,5,0.25)';
    roundRect(ctx, cx + 6, cy + 10, cw, chh, 36);
    ctx.fill();
    ctx.fillStyle = '#fff7ec';
    roundRect(ctx, cx, cy, cw, chh, 36);
    ctx.fill();
    ctx.strokeStyle = '#ffd6a8';
    ctx.lineWidth = 6;
    ctx.stroke();

    // 評級徽章
    const g = r.grade;
    const bx = cx + 130;
    const by = cy + 140;
    const grad = ctx.createRadialGradient(bx - 30, by - 30, 10, bx, by, 96);
    grad.addColorStop(0, '#ffffffaa');
    grad.addColorStop(0.35, g.color);
    grad.addColorStop(1, g.color);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.arc(bx, by + 8, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 6;
    ctx.stroke();
    txt(ctx, g.grade, bx, by + 4, g.grade.length > 1 ? 80 : 110, '#fff', { stroke: 'rgba(0,0,0,0.25)', strokeW: 8 });

    // 評價文字
    const tx = cx + 252;
    const tw = cw - 270;
    txt(ctx, ch ? '紀念日挑戰結果' : '{name}給你的男友評價', tx, cy + 70, 26, '#a0704f', { align: 'left', weight: 'normal', maxW: tw });
    txt(ctx, g.title, tx, cy + 122, 48, '#c2412b', { align: 'left', maxW: tw });
    ctx.font = `40px ${TEXT_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffb020';
    ctx.fillText('★'.repeat(g.stars), tx, cy + 180);
    ctx.fillStyle = '#ead9c6';
    ctx.fillText('★'.repeat(5 - g.stars), tx + ctx.measureText('★'.repeat(g.stars)).width, cy + 180);
    // 稱號（太長就縮小，再不行就截斷）
    let title = `🏷️ ${r.titleName || FF.DEFAULT_TITLE}`;
    const ts = fit(ctx, title, tw - 36, 28, 18);
    ctx.font = font(ts);
    while (ctx.measureText(title).width > tw - 36 && title.length > 4) title = title.slice(0, -2) + '…';
    const pw = Math.min(tw, ctx.measureText(title).width + 36);
    ctx.fillStyle = '#ffe2c2';
    roundRect(ctx, tx, cy + 214, pw, 48, 24);
    ctx.fill();
    txt(ctx, title, tx + pw / 2, cy + 239, ts, '#7a3b12');

    // 她的評語（對話框）
    const sy = cy + 300;
    const sw = cw - 60;
    ctx.font = font(32);
    let size = 32;
    let lines = wrap(ctx, g.comment, sw - 130, 4);
    if (lines.length >= 4) {
      size = 28;
      ctx.font = font(size);
      lines = wrap(ctx, g.comment, sw - 130, 4);
    }
    const sh = Math.max(130, lines.length * (size + 12) + 44);
    ctx.fillStyle = '#ffe9f0';
    roundRect(ctx, cx + 30, sy, sw, sh, 28);
    ctx.fill();
    // 她的臉：用遊戲裡實際的畫法（自訂外觀）；照片預設不放，勾選「成績圖使用照片」才用
    try {
      FF.UILook.avatar(ctx, cx + 92, sy + 62, 52, { mood: r.reason === 'win' ? 'happy' : r.reason === 'anger' ? 'furious' : r.reason === 'hunger' ? 'normal' : 'annoyed', noPhoto: !r.sharePhoto });
    } catch (e) {
      emo(ctx, r.reason === 'win' ? '🥰' : r.reason === 'anger' ? '😤' : r.reason === 'hunger' ? '😋' : '🙄', cx + 92, sy + 62, 64);
    }
    lines.forEach((l, i) => txt(ctx, l, cx + 150, sy + 22 + (size + 12) / 2 + i * (size + 12), size, '#9a2f55', { align: 'left' }));

    // 數據
    const ry = sy + sh + 30;
    const boxW = (cw - 60 - 32) / 3;
    const stats = [
      ['🏅 分數', String(r.score)],
      ['⏱ 時間', FF.Render.fmtTime(r.time)],
      ch ? ['🎯 結果', ch.win ? '過關！' : '失敗'] : ['🌊 波數', `第 ${r.wave} 波`],
    ];
    stats.forEach(([label, val], i) => {
      const x = cx + 30 + i * (boxW + 16);
      ctx.fillStyle = '#fff';
      roundRect(ctx, x, ry, boxW, 130, 22);
      ctx.fill();
      ctx.strokeStyle = '#f0d2b0';
      ctx.lineWidth = 3;
      ctx.stroke();
      txt(ctx, label, x + boxW / 2, ry + 36, 24, '#a0704f', { weight: 'normal', maxW: boxW - 16 });
      txt(ctx, val, x + boxW / 2, ry + 88, 44, '#c2412b', { maxW: boxW - 20 });
    });

    // 場地／她的模式／鍋底
    const iy = ry + 160;
    const info = [
      `📍 場地：${r.venue.icon} ${r.venue.name}`,
      `💕 她今天：${r.persona.icon} ${r.persona.name}`,
      `🍲 鍋底：${r.broth.icon} ${r.broth.name}`,
    ];
    info.forEach((s, i) => txt(ctx, s, cx + 44, iy + i * 46, 28, '#7a4a2a', { align: 'left', maxW: cw - 88 }));

    // 一句短評
    const qy = iy + 3 * 46 + 10;
    const quip = (r.quips && r.quips.find(q => !q.startsWith('🎯') && !q.startsWith('📋'))) || (r.quips && r.quips[0]) || '';
    ctx.font = font(26, 'normal');
    const qMax = Math.max(1, Math.min(2, Math.floor((cy + chh - 30 - qy) / 38)));
    const ql = wrap(ctx, quip, cw - 88, qMax);
    ctx.strokeStyle = '#f0c9a0';
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 40, qy - 8);
    ctx.lineTo(cx + cw - 40, qy - 8);
    ctx.stroke();
    ctx.setLineDash([]);
    ql.forEach((l, i) => txt(ctx, l, cx + 44, qy + 30 + i * 38, 26, '#8a5a3a', { align: 'left', weight: 'normal' }));

    // 本局亮點（卡片底部）
    const st = r.stats || {};
    const hl = [['✨', '完美夾取', st.perfect || 0], ['💨', '閃過筷子', st.dodges || 0], ['🥄', '餵她', st.fed || 0]];
    const hy = cy + chh - 48;
    const hw = (cw - 60) / 3;
    // 短評優先；評語很長時空間不夠就不畫亮點（最後一行短評的下緣要在亮點框上面）
    const quipBottom = qy + 30 + (ql.length - 1) * 38 + 18;
    if (quipBottom < hy - 28 - 6) {
      ctx.fillStyle = '#fff3e4';
      roundRect(ctx, cx + 30, hy - 28, cw - 60, 56, 18);
      ctx.fill();
      hl.forEach(([ic, label, v], i) => txt(ctx, `${ic} ${label} ${v}`, cx + 30 + hw * i + hw / 2, hy, 22, '#a0502a', { maxW: hw - 12 }));
    }

    // 網址
    txt(ctx, '你也來跟她搶火鍋 👇', W / 2, H - 82, 28, '#fff3d6', { stroke: 'rgba(90,20,5,0.5)', strokeW: 5 });
    txt(ctx, URL_TEXT, W / 2, H - 38, 30, '#fff', { stroke: 'rgba(90,20,5,0.6)', strokeW: 6, maxW: W - 60 });
    return cv;
  }

  // 每日同題成績圖（從每日頁分享時用；沒有一局的完整結算資料，只畫配置與成績）
  function renderDaily(key, rec) {
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d');
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#ffb36b');
    bg.addColorStop(0.5, '#ff7a59');
    bg.addColorStop(1, '#b8341f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.12;
    const deco = ['🍲', '🥢', '🦐', '🥩', '🌽', '🍥', '🧆', '🦀'];
    for (let i = 0; i < 40; i++) emo(ctx, deco[i % deco.length], (i % 5) * 160 + ((Math.floor(i / 5) % 2) * 80) + 20, Math.floor(i / 5) * 165 + 40, 54);
    ctx.globalAlpha = 1;
    txt(ctx, '🍲 搶火鍋大作戰', W / 2, 92, 60, '#fff', { stroke: '#8a2a12', strokeW: 10 });
    txt(ctx, `🗓️ 每日同題 ${key}`, W / 2, 156, 32, '#fff3d6', { stroke: 'rgba(120,30,10,0.6)', strokeW: 6 });
    const cx = 44, cy = 210, cw = W - 88, chh = 900;
    ctx.fillStyle = 'rgba(80,20,5,0.25)';
    roundRect(ctx, cx + 6, cy + 10, cw, chh, 36);
    ctx.fill();
    ctx.fillStyle = '#fff7ec';
    roundRect(ctx, cx, cy, cw, chh, 36);
    ctx.fill();
    const cfg = FF.Daily.config(key);
    const v = FF.VENUES.find(x => x.id === cfg.venue);
    const p = FF.personaById(cfg.persona);
    const b = FF.brothById(cfg.broth);
    txt(ctx, '今日正式成績', W / 2, cy + 80, 34, '#a0704f', { weight: 'normal' });
    txt(ctx, `${rec.score} 分`, W / 2, cy + 190, 130, '#c2412b', { stroke: '#fff', strokeW: 10, maxW: cw - 60 });
    [['⏱ 存活', FF.Render.fmtTime(rec.time)], ['🌊 波數', `第 ${rec.wave} 波`], ['🔥 連續', `${FF.Daily.streak()} 天`]].forEach(([l, val], i) => {
      const bw = (cw - 60 - 32) / 3;
      const x = cx + 30 + i * (bw + 16);
      ctx.fillStyle = '#fff';
      roundRect(ctx, x, cy + 300, bw, 130, 22);
      ctx.fill();
      ctx.strokeStyle = '#f0d2b0';
      ctx.lineWidth = 3;
      ctx.stroke();
      txt(ctx, l, x + bw / 2, cy + 336, 24, '#a0704f', { weight: 'normal', maxW: bw - 16 });
      txt(ctx, val, x + bw / 2, cy + 388, 40, '#c2412b', { maxW: bw - 20 });
    });
    const blocks = Array.from({ length: Math.min(10, rec.wave) }, (_, i) => (i < 2 ? '🟨' : i < 5 ? '🟧' : '🟥')).join('');
    txt(ctx, blocks + (rec.reason === 'anger' ? ' 😤' : rec.reason === 'hunger' ? ' 😵' : ' 🙄'), W / 2, cy + 500, 44, '#7a3b12', { maxW: cw - 60 });
    [`📍 ${v.icon} ${v.name}`, `💕 她今天：${p.icon} ${p.name}`, `🍲 鍋底：${b.icon} ${b.name}`].forEach((sx, i) => txt(ctx, sx, cx + 60, cy + 600 + i * 56, 32, '#7a4a2a', { align: 'left', maxW: cw - 100 }));
    txt(ctx, '全世界同一局，你能比我高分嗎？', W / 2, cy + 820, 30, '#9a2f55');
    txt(ctx, '你也來跟她搶火鍋 👇', W / 2, H - 82, 28, '#fff3d6', { stroke: 'rgba(90,20,5,0.5)', strokeW: 5 });
    txt(ctx, URL_TEXT, W / 2, H - 38, 30, '#fff', { stroke: 'rgba(90,20,5,0.6)', strokeW: 6, maxW: W - 60 });
    return cv;
  }

  function toBlob(cv) {
    return new Promise(res => {
      if (cv.toBlob) cv.toBlob(b => res(b), 'image/png');
      else res(null);
    });
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // 回傳 'shared'、'downloaded'、'cancel' 或 'error'
  async function share(blob, r) {
    if (!blob) return 'error';
    const name = 'foodfight-score.png';
    let text = r.challenge
      ? `我在「搶火鍋大作戰」紀念日挑戰「${r.challenge.name}」${r.challenge.win ? '過關了！' : '輸給她了…'} ${URL_TEXT}`
      : `我在「搶火鍋大作戰」拿到 ${r.grade.grade} 級「${r.grade.title}」，撐了 ${FF.Render.fmtTime(r.time)}！${URL_TEXT}`;
    if (r.comp && r.comp.kind === 'daily' && r.comp.official) text = FF.Daily.shareText(r.comp.dateKey, { score: r.score, time: r.time, wave: r.wave, reason: r.reason });
    else if (r.comp) {
      const d = FF.Duel.fromResult(r);
      text = FF.Duel.shareText(r, d);
    }
    try {
      const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: '搶火鍋大作戰', text });
        return 'shared';
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancel';
      // 其他錯誤就退回下載
    }
    try {
      download(blob, name);
      return 'downloaded';
    } catch (e) {
      return 'error';
    }
  }

  return { render, renderDaily, toBlob, share, download, URL: URL_TEXT };
})();
