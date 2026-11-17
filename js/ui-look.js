// DOM 介面（v4）：打扮對象（捏臉、服裝、名字、照片當臉）與筷子櫃
window.FF = window.FF || {};

FF.UILook = (() => {
  const $ = id => document.getElementById(id);
  const S = () => FF.Save.data;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let H = null;
  let g = 'f';          // 打扮頁正在編輯哪一邊（'f' 女朋友／'m' 男朋友）
  let expr = 'happy';
  let raf = 0;
  let backTo = 'menu';
  let selChop = null;   // 筷子櫃選中預覽的款式
  const GL = { f: '女朋友', m: '男朋友' };

  // 表情預覽：[id, 圖示, 名稱, drawGF 的 opts]
  const EXPRS = [
    ['happy', '😊', '開心', { mood: 'happy' }],
    ['normal', '😐', '普通', { mood: 'normal' }],
    ['annoyed', '😒', '不爽', { mood: 'annoyed' }],
    ['furious', '😠', '生氣', { mood: 'furious' }],
    ['look', '👀', '分心', { mood: 'normal', expr: 'look' }],
    ['scared', '😱', '驚嚇', { mood: 'normal', expr: 'scared' }],
    ['chew', '😋', '嚼嚼', { mood: 'normal', expr: 'chew' }],
    ['love', '🥰', '餵食', { mood: 'happy', expr: 'love' }],
    ['ult', '🔥', '大絕招', { mood: 'furious', expr: 'ult' }],
  ];
  const PW = 220;
  const PH = 230;

  // 完成成就的提示（打扮、取名字、買筷子都可能解鎖成就）
  function watch(fn) {
    const before = S().achievements.length;
    const r = fn();
    FF.Progress.recheck();
    const got = S().achievements.slice(before).map(id => FF.ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean);
    if (got.length) {
      setTimeout(() => {
        H.toast(`🏆 成就解鎖：${got.map(a => a.name).join('、')}${got.some(a => a.reward) ? `（🎫 +${got.reduce((n, a) => n + a.reward, 0)}）` : ''}`);
        FF.Audio.play('rare');
      }, 700);
    }
    return r;
  }

  // ---------- 畫臉（預覽、戰帖卡、成績圖都用同一個繪製函式）----------
  function paintFace(ctx, o, time) {
    ctx.save();
    ctx.fillStyle = o.bg || '#ffe9cf';
    ctx.fillRect(0, 0, PW, PH);
    ctx.translate(-160, -34);
    ctx.beginPath();
    ctx.rect(160, 34, PW, PH);
    ctx.clip();
    const persona = o.persona || FF.personaById(S().gfType);
    FF.Render.drawGF(ctx, null, time, persona, { gender: o.gender, mood: o.mood, expr: o.expr, noPhoto: o.noPhoto, follow: o.follow, look: o.look });
    ctx.restore();
  }

  // 一張靜態頭像（canvas 元素）。照片可能還在解碼，所以稍後補畫兩次
  function portrait(o) {
    const cv = document.createElement('canvas');
    cv.width = PW * 2;
    cv.height = PH * 2;
    cv.className = 'portrait';
    cv.style.width = (o.size || 96) / 16 + 'em';
    const draw = () => {
      const c = cv.getContext('2d');
      c.setTransform(2, 0, 0, 2, 0, 0);
      paintFace(c, o, 0.3);
      if (o.name) {
        c.font = 'bold 15px sans-serif';
        c.__notr = true;
        const w = Math.min(120, c.measureText(o.name).width + 20);
        c.fillStyle = '#ff6fa5';
        FF.Render.roundRect(c, PW / 2 - w / 2, PH - 26, w, 20, 10);
        c.fill();
        c.fillStyle = '#fff';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(o.name, PW / 2, PH - 16);
        c.__notr = false;
      }
    };
    draw();
    if (FF.Photo.active(o.gender || FF.G.partner()) === false && FF.Photo.has(o.gender || FF.G.partner())) setTimeout(draw, 250);
    return cv;
  }

  // 成績圖用的圓形頭像：畫在 (x, y)，半徑 rad
  function avatar(ctx, x, y, rad, o) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.clip();
    const k = (rad * 2) / 160;
    ctx.translate(x - 270 * k, y - 142 * k);
    ctx.scale(k, k);
    ctx.fillStyle = '#ffd9e6';
    ctx.fillRect(150, 40, 240, 240);
    FF.Render.drawGF(ctx, null, 0.3, FF.personaById(S().gfType), { gender: FF.G.partner(), mood: o.mood, noPhoto: o.noPhoto });
    ctx.restore();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ---------- 打扮頁 ----------
  let prevCtx = null;
  function renderTop() {
    const top = $('dress-top');
    top.innerHTML = `
      <div class="who-row dress-who"><span>編輯</span>
        <button class="seg ${g === 'f' ? 'on' : ''}" data-g="f">👧 女朋友</button><button class="seg ${g === 'm' ? 'on' : ''}" data-g="m">👦 男朋友</button></div>
      <div class="dress-prev">
        <canvas id="dress-cv" width="${PW * 2}" height="${PH * 2}"></canvas>
        <div class="expr-grid" id="expr-grid">${EXPRS.map(e => `<button class="expr ${e[0] === expr ? 'on' : ''}" data-e="${e[0]}"><i>${e[1]}</i><span>${e[2]}</span></button>`).join('')}</div>
      </div>`;
    prevCtx = $('dress-cv').getContext('2d');
    top.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => {
      FF.Audio.play('click');
      g = b.dataset.g;
      renderTop();
      renderBody();
    }));
    top.querySelectorAll('[data-e]').forEach(b => b.addEventListener('click', () => {
      expr = b.dataset.e;
      top.querySelectorAll('.expr').forEach(x => x.classList.toggle('on', x.dataset.e === expr));
    }));
  }

  const sec = (title, inner, cls = '') => `<div class="dsec ${cls}"><h4>${title}</h4>${inner}</div>`;
  const opts = (key, list, cur) => `<div class="dopts">${list.map(o => `<button class="opt ${o.id === cur ? 'on' : ''}" data-k="${key}" data-v="${esc(o.id)}">${o.icon ? o.icon + ' ' : ''}${o.name}</button>`).join('')}</div>`;
  const sws = (key, list, cur) => `<div class="dsw">${list.map(o => `<button class="sw ${o.id === cur ? 'on' : ''}" data-k="${key}" data-v="${o.id}" style="background:${o.id}" title="${o.name}" aria-label="${o.name}"></button>`).join('')}</div>`;

  function renderBody() {
    const L = FF.Look.get(g);
    const ls = FF.LOOK.lists(g);
    const p = FF.personaById(S().gfType);
    const dim = L.on ? '' : 'dim';
    const nm = FF.Look.nameOf(g);
    const hasPhoto = FF.Photo.has(g);
    const body = $('dress-body');
    body.innerHTML = `
      <div class="dsec">
        <div class="dopts two">
          <button class="opt ${!L.on ? 'on' : ''}" data-mode="follow">🎭 跟著模式</button>
          <button class="opt ${L.on ? 'on' : ''}" data-mode="custom">✨ 自訂外觀</button>
        </div>
        <p class="venue-tip">${L.on ? `自訂中：所有模式（日常、吃貨、傲嬌、戰鬥）都會套用這套外觀，台詞和打法不變。${GL[g]}和${GL[g === 'f' ? 'm' : 'f']}各存一套。` : `目前外觀跟著模式走（現在是「${esc(p.name)}」的經典造型）。點下面任何一個選項，就會切到自訂外觀。`}</p>
      </div>
      <div class="dsec">
        <h4>🏷️ 名字（最多 ${FF.Name.MAX} 個字）</h4>
        <div class="set-nick"><input id="dress-name" type="text" maxlength="12" value="${esc(nm)}" placeholder="例如：小美，空白就叫「${g === 'm' ? '他' : '她'}」" autocomplete="off">
          <button class="btn small" id="dress-name-save">儲存</button></div>
        <p class="venue-tip" id="dress-name-msg">名字會出現在對話泡泡、結算評價、成績圖和戰帖上。（這不是排行榜暱稱）</p>
      </div>
      <div class="${dim}">
      ${sec('💇 髮型', opts('style', ls.style, L.style))}
      ${sec('🎨 髮色', sws('hair', ls.hair, L.hair))}
      ${sec('🧑 膚色', sws('skin', ls.skin, L.skin))}
      ${sec('👀 眼睛', opts('eyes', ls.eyes, L.eyes))}
      ${sec('🤨 眉毛', opts('brows', ls.brows, L.brows))}
      ${sec('😳 腮紅', `<div class="dopts two"><button class="opt ${L.blush ? 'on' : ''}" data-k="blush" data-v="1">有</button><button class="opt ${!L.blush ? 'on' : ''}" data-k="blush" data-v="0">沒有</button></div>`)}
      ${sec('🕶️ 配件', opts('acc', ls.acc, L.acc) + (L.acc !== 'none' && L.acc !== 'shades' ? `<p class="dlabel">配件顏色</p>${sws('accColor', ls.accColor, L.accColor)}` : ''))}
      ${sec('👕 上衣款式', opts('outfit', ls.outfit, L.outfit))}
      ${sec('🌈 上衣顏色', sws('shirt', ls.shirt, L.shirt) + (L.fest !== 'none' ? '<p class="venue-tip">穿著節慶服時，上衣顏色由節慶服決定。</p>' : ''))}
      ${sec('🎄 節慶服', opts('fest', ls.fest, L.fest))}
      </div>
      <div class="btn-row two dress-acts">
        <button class="btn small" id="dress-rand">🎲 隨機</button>
        <button class="btn small" id="dress-reset">↩️ 恢復預設</button>
      </div>
      <div class="dsec photo-sec">
        <h4>📷 用照片當臉</h4>
        <p class="venue-tip">拍一張（或選一張）臉，遊戲裡就會變成${GL[g]}的真臉，生氣會發紅、驚嚇會冒汗。<b>照片只存在你的手機，不會上傳雲端、不會放進戰帖</b>，連火鍋店老闆都看不到。</p>
        <div class="photo-row">
          ${hasPhoto ? `<img class="photo-thumb" id="photo-thumb" alt="目前的照片" src="${esc(FF.Photo.raw(g))}">` : '<div class="photo-thumb empty"><span>🫥</span></div>'}
          <div class="photo-btns">
            <button class="btn small" id="photo-cam">📷 拍照</button>
            <button class="btn small" id="photo-pick">🖼️ 選照片</button>
            ${hasPhoto ? '<button class="btn small danger" id="photo-del">🗑️ 移除照片</button>' : ''}
          </div>
        </div>
        ${hasPhoto ? `<button class="toggle photo-toggle ${L.photo ? '' : 'off'}" id="photo-toggle"><span>使用照片當臉</span><b>${L.photo ? '開' : '關'}</b></button>` : ''}
        <p class="venue-tip" id="photo-msg"></p>
      </div>`;
    wireBody(body);
  }

  function seedFromPersona() {
    const L = FF.Look.get(g);
    const d = FF.LOOK.defaults(g);
    const same = Object.keys(d).every(k => k === 'on' || k === 'photo' || L[k] === d[k]);
    if (!same || L.on) return;
    const p = FF.personaById(S().gfType);
    const ap = (g === 'm' && p.lookM) || p.look;
    Object.assign(L, FF.LOOK.sanitize({ ...L, style: ap.style, hair: ap.hair, shirt: ap.shirt, acc: ap.acc, accColor: ap.accColor, on: false }, g), { on: false });
  }

  function wireBody(body) {
    const rerender = () => H.keepScroll(renderBody);
    body.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
      FF.Audio.play('click');
      if (b.dataset.mode === 'custom') seedFromPersona();
      FF.Look.setMode(g, b.dataset.mode === 'custom');
      rerender();
    }));
    body.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
      FF.Audio.play('click');
      let v = b.dataset.v;
      if (b.dataset.k === 'blush') v = v === '1';
      seedFromPersona();
      const turnedOn = watch(() => FF.Look.patch(g, { [b.dataset.k]: v }));
      if (turnedOn) H.toast('已切到自訂外觀 ✨');
      rerender();
    }));
    $('dress-rand').addEventListener('click', () => {
      FF.Audio.play('click');
      watch(() => FF.Look.randomize(g));
      H.toast('🎲 骰到這套！不喜歡就再骰一次');
      rerender();
    });
    $('dress-reset').addEventListener('click', () => {
      FF.Audio.play('click');
      FF.Look.reset(g);
      H.toast('已恢復預設（跟著模式）');
      rerender();
    });
    const save = () => {
      const r = watch(() => FF.Look.setName(g, $('dress-name').value));
      const msg = $('dress-name-msg');
      if (!r.ok) {
        msg.textContent = r.msg;
        FF.Audio.play('error');
        return;
      }
      $('dress-name').value = r.name;
      msg.textContent = r.name ? `好！以後她就叫「${r.name}」了，要對她好一點。`.replace('她', g === 'm' ? '他' : '她') : `空白＝用預設稱呼（${g === 'm' ? '他' : '她'}）。`;
      H.toast(r.name ? `🏷️ 取名：${r.name}` : '名字已清除');
    };
    $('dress-name-save').addEventListener('click', save);
    $('dress-name').addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
    // 照片
    $('photo-cam').addEventListener('click', () => $('photo-file-cam').click());
    $('photo-pick').addEventListener('click', () => $('photo-file').click());
    const del = $('photo-del');
    if (del) del.addEventListener('click', () => {
      FF.Photo.remove(g);
      FF.Look.get(g).photo = false;
      FF.Save.persist();
      H.toast('照片已移除，換回畫的臉');
      rerender();
    });
    const tg = $('photo-toggle');
    if (tg) tg.addEventListener('click', () => {
      const L = FF.Look.get(g);
      L.photo = !L.photo;
      FF.Save.persist();
      rerender();
    });
  }

  // ---------- 照片：讀檔、裁切 ----------
  async function loadSource(file) {
    let bmp = null;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { bmp = null; }
    if (!bmp) {
      bmp = await new Promise((res, rej) => {
        const u = URL.createObjectURL(file);
        const im = new Image();
        im.onload = () => { URL.revokeObjectURL(u); res(im); };
        im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('img')); };
        im.src = u;
      });
    }
    const w = bmp.width || bmp.naturalWidth;
    const h = bmp.height || bmp.naturalHeight;
    if (!w || !h) throw new Error('empty');
    const k = Math.min(1, 1024 / Math.max(w, h));
    const src = document.createElement('canvas');
    src.width = Math.max(1, Math.round(w * k));
    src.height = Math.max(1, Math.round(h * k));
    src.getContext('2d').drawImage(bmp, 0, 0, src.width, src.height);
    if (bmp.close) bmp.close();
    return src;
  }

  const CV = 260;
  function openCropper(src) {
    const st = { cx: src.width / 2, cy: src.height / 2, z: 1 };
    const base = CV / Math.min(src.width, src.height);
    const sc = () => base * st.z;
    const clamp = () => {
      const hw = CV / 2 / sc();
      st.cx = Math.min(src.width - hw, Math.max(hw, st.cx));
      st.cy = Math.min(src.height - hw, Math.max(hw, st.cy));
    };
    const dlg = FF.UIX.dialog({
      title: '✂️ 裁切臉',
      html: `<p class="venue-tip">拖曳移動、雙指或滑桿縮放，圓圈裡的就是${GL[g]}的臉。</p>
        <canvas id="crop-cv" class="crop-cv" width="${CV}" height="${CV}"></canvas>
        <input id="crop-zoom" class="crop-zoom" type="range" min="1" max="4" step="0.01" value="1" aria-label="縮放">`,
      buttons: [
        {
          text: '確定，就是這張臉', cls: 'primary', fn: () => {
            const url = encode(src, st, base);
            if (!url) { H.toast('照片太大存不下，換一張小一點的吧'); return false; }
            if (!FF.Photo.set(g, url)) {
              H.toast('手機的儲存空間不夠，照片沒存成功（可以先清掉一些東西）');
              return false;
            }
            FF.Look.get(g).photo = true;
            FF.Save.persist();
            H.toast('📷 換臉成功！');
          },
        },
        { text: '算了', fn: () => {} },
      ],
    });
    const cv = dlg.querySelector('#crop-cv');
    const zoom = dlg.querySelector('#crop-zoom');
    const c = cv.getContext('2d');
    const draw = () => {
      clamp();
      c.clearRect(0, 0, CV, CV);
      c.fillStyle = '#222';
      c.fillRect(0, 0, CV, CV);
      c.save();
      c.translate(CV / 2, CV / 2);
      c.scale(sc(), sc());
      c.translate(-st.cx, -st.cy);
      c.drawImage(src, 0, 0);
      c.restore();
      c.fillStyle = 'rgba(0,0,0,0.55)';
      c.beginPath();
      c.rect(0, 0, CV, CV);
      c.arc(CV / 2, CV / 2, CV / 2 - 6, 0, Math.PI * 2, true);
      c.fill('evenodd');
      c.strokeStyle = '#fff';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(CV / 2, CV / 2, CV / 2 - 6, 0, Math.PI * 2);
      c.stroke();
    };
    const setZ = z => { st.z = Math.min(4, Math.max(1, z)); zoom.value = st.z; draw(); };
    zoom.addEventListener('input', () => setZ(parseFloat(zoom.value)));
    const ptrs = new Map();
    let pinch = 0;
    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      pinch = 0;
    });
    cv.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId);
      if (!p) return;
      const rect = cv.getBoundingClientRect();
      const k = CV / rect.width; // 螢幕像素 → 畫布像素
      if (ptrs.size === 1) {
        st.cx -= ((e.clientX - p.x) * k) / sc();
        st.cy -= ((e.clientY - p.y) * k) / sc();
        p.x = e.clientX;
        p.y = e.clientY;
        draw();
      } else if (ptrs.size === 2) {
        p.x = e.clientX;
        p.y = e.clientY;
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) setZ(st.z * (d / pinch));
        pinch = d;
      }
    });
    const up = e => { ptrs.delete(e.pointerId); pinch = 0; };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); setZ(st.z * Math.exp(-e.deltaY * 0.002)); }, { passive: false });
    draw();
    cv._crop = { st, setZ, draw };
  }

  // 輸出 JPEG：先 256x256、品質 0.8，太大就降品質、再縮小
  function encode(src, st, base) {
    let url = '';
    for (const size of [256, 224, 192, 160]) {
      const out = document.createElement('canvas');
      out.width = out.height = size;
      const c = out.getContext('2d');
      c.fillStyle = '#fff';
      c.fillRect(0, 0, size, size);
      const s = base * st.z * (size / CV);
      c.translate(size / 2, size / 2);
      c.scale(s, s);
      c.translate(-st.cx, -st.cy);
      c.drawImage(src, 0, 0);
      for (const q of [0.8, 0.7, 0.6, 0.5]) {
        url = out.toDataURL('image/jpeg', q);
        if (url.length * 0.75 < 40000) return url;
      }
    }
    return url.length < 85000 ? url : '';
  }

  async function onFile(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    const msg = $('photo-msg');
    try {
      const src = await loadSource(file);
      openCropper(src);
    } catch (e) {
      if (msg) msg.textContent = '這張圖讀不出來（可能不是照片，或太大）。換一張試試吧！';
      H.toast('這張圖打不開，換一張吧');
    }
  }

  // ---------- 動畫迴圈 ----------
  let t0 = 0;
  function tick(now) {
    raf = 0;
    const cur = FF.UI.current;
    if (cur !== 'dress' && cur !== 'chopcase') return;
    const time = now / 1000;
    if (cur === 'dress' && prevCtx) {
      const e = EXPRS.find(x => x[0] === expr) || EXPRS[0];
      prevCtx.setTransform(2, 0, 0, 2, 0, 0);
      paintFace(prevCtx, Object.assign({ gender: g }, e[3]), time);
    } else if (cur === 'chopcase') {
      drawChopPreview(time);
    }
    raf = requestAnimationFrame(tick);
  }
  function loop() {
    if (!raf) raf = requestAnimationFrame(tick);
  }

  // ---------- 筷子櫃 ----------
  let pcv = null;
  const thumbs = [];
  function drawChopPreview(time) {
    if (!pcv) return;
    const c = pcv.getContext('2d');
    c.setTransform(2, 0, 0, 2, 0, 0);
    const w = 300;
    const h = 170;
    const bg = c.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#d89a5a');
    bg.addColorStop(1, '#a8672f');
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    c.font = '46px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#000';
    c.fillText('🥩', 120 + Math.sin(time * 2) * 3, 60 + Math.cos(time * 2) * 2);
    FF.ChopDraw.draw(c, selChop, { x: 120 + Math.sin(time * 2) * 3, y: 60 + Math.cos(time * 2) * 2 }, { x: 420, y: 520 }, time, 190);
    thumbs.forEach(([cv, id]) => {
      const tc = cv.getContext('2d');
      tc.setTransform(2, 0, 0, 2, 0, 0);
      FF.ChopDraw.thumb(tc, id, 64, 64, time);
    });
  }

  function renderChops() {
    const s = S();
    $('chops-tickets').textContent = s.tickets;
    if (!selChop) selChop = FF.Chops.equipped();
    const prev = $('chops-prev');
    if (!prev.firstChild) {
      prev.innerHTML = '<canvas id="chops-cv" class="chops-cv" width="600" height="340"></canvas>';
    }
    pcv = $('chops-cv');
    const list = $('chops-list');
    list.innerHTML = '';
    thumbs.length = 0;
    FF.CHOPS.forEach(c => {
      const st = FF.Chops.status(c);
      const row = document.createElement('div');
      row.className = 'row venue' + (selChop === c.id ? ' selected' : '') + (st.owned ? '' : ' locked-soft');
      let right;
      let cond = '';
      if (st.owned) right = st.equipped ? '<div class="pick">✅ 使用中</div>' : '<button class="buy free" data-act="equip">裝備</button>';
      else if (c.price) right = `<button class="buy" data-act="buy" ${s.tickets < c.price ? 'disabled' : ''}>🎫 ${c.price}</button>`;
      else right = '<div class="pick lock">🔒 成就</div>';
      if (!st.owned && st.cond) cond = `<div class="desc cond">🔓 解鎖條件：成就「${st.cond.name}」（${st.cond.desc}）</div>`;
      row.innerHTML = `<canvas class="chop-thumb" width="128" height="128"></canvas>
        <div class="info"><div class="name">${c.icon} ${c.name}</div><div class="desc">${c.desc}</div>${cond}</div>${right}`;
      thumbs.push([row.querySelector('canvas'), c.id]);
      row.addEventListener('click', () => { selChop = c.id; H.keepScroll(renderChops); });
      row.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        if (b.dataset.act === 'buy') {
          if (watch(() => FF.Chops.buy(c.id))) {
            FF.Chops.equip(c.id);
            FF.Audio.play('coin');
            H.toast(`🎉 買了「${c.name}」，已裝備！`);
          } else FF.Audio.play('error');
        } else {
          FF.Chops.equip(c.id);
          FF.Audio.play('click');
          H.toast(`已裝備「${c.name}」`);
        }
        selChop = c.id;
        H.keepScroll(renderChops);
      }));
      list.appendChild(row);
    });
  }

  function onShow(name) {
    if (name === 'dress') {
      g = FF.G.partner();
      renderTop();
      renderBody();
      loop();
    } else if (name === 'chopcase') {
      selChop = FF.Chops.equipped();
      renderChops();
      loop();
    } else if (name === 'menu') {
      $('menu-chops').textContent = `${FF.Chops.ownedCount()}/${FF.CHOPS.length} 款`;
      const nm = FF.G.name();
      $('menu-dress').textContent = nm ? `${nm}的造型` : '捏臉・服裝・取名字';
      $('menu-dress').setAttribute('data-notr', '');
    }
  }

  function init(helpers) {
    H = helpers;
    const click = (id, fn) => $(id).addEventListener('click', () => { FF.Audio.unlock(); FF.Audio.play('click'); fn(); });
    click('btn-dress', () => { backTo = 'menu'; H.show('dress'); });
    click('btn-dress-back', () => H.show(backTo));
    click('btn-chops', () => H.show('chopcase'));
    click('btn-chops-back', () => H.show('menu'));
    click('btn-shop-chops', () => H.show('chopcase'));
    // 隱藏的檔案輸入（放在 #dress 外面也可以；這裡建立一次）
    for (const [id, cap] of [['photo-file-cam', true], ['photo-file', false]]) {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      if (cap) inp.setAttribute('capture', 'user');
      inp.id = id;
      inp.className = 'hidden';
      inp.addEventListener('change', () => onFile(inp));
      $('dress').appendChild(inp);
    }
  }

  return { init, onShow, portrait, avatar, paintFace, _loadSource: loadSource, setBack(v) { backTo = v; } };
})();
