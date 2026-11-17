// DOM 介面（v3 新功能）：每日同題、戰帖對決、排行榜、雲端存檔、對象性別、加到主畫面、通用對話框
window.FF = window.FF || {};

FF.UIX = (() => {
  const $ = id => document.getElementById(id);
  const esc = FF.Duel.esc;
  const S = () => FF.Save.data;
  let H = null; // { toast, show, app }
  let dlgPrev = 'menu';
  let rankKind = 'daily';
  let lastComp = null; // 最近一局競技局的開局配置（「再戰一次」用）
  let lastDuelCode = null;

  const fmtDate = key => `${key.slice(5, 7)}/${key.slice(8, 10)}`;
  const cfgLine = c => {
    const v = FF.VENUES.find(x => x.id === c.venue);
    const p = FF.personaById(c.persona);
    const b = FF.brothById(c.broth);
    return `${v.icon} ${v.name}・${p.icon} ${p.name}・${b.icon} ${b.short}`;
  };
  const fmtLeft = ms => {
    const m = Math.max(0, Math.floor(ms / 60000));
    return `${Math.floor(m / 60)} 小時 ${m % 60} 分`;
  };
  const cloudOff = () => FF.Cloud.mode === 'off' || FF.Cloud.state.phase === 'error';

  // ---------- 通用對話框 ----------
  // buttons：[{ text, cls, fn }]；fn 回傳 false 代表不要關閉。內容 html 裡的暱稱請自己包 <b data-notr>
  function dialog({ title, html, buttons = [], back }) {
    if (FF.UI.current !== 'dialog') dlgPrev = FF.UI.current || 'menu';
    if (back) dlgPrev = back;
    $('dlg-title').textContent = title;
    $('dlg-body').innerHTML = html || '';
    const box = $('dlg-btns');
    box.innerHTML = '';
    buttons.forEach(b => {
      const el = document.createElement('button');
      el.className = 'btn ' + (b.cls || '');
      el.textContent = b.text;
      el.addEventListener('click', async () => {
        FF.Audio.unlock();
        FF.Audio.play('click');
        const r = b.fn ? await b.fn() : undefined;
        if (r !== false) closeDialog();
      });
      box.appendChild(el);
    });
    H.show('dialog');
    $('dlg-body').scrollTop = 0;
    return $('dlg-body');
  }
  function closeDialog() {
    if (FF.UI.current === 'dialog') H.show(dlgPrev);
  }

  // ---------- 對象與自己（性別）----------
  function genderControls(root) {
    const s = S();
    const partner = FF.G.partner();
    const me = FF.G.me();
    const opt = (cls, val, label, on) => `<button class="seg ${on ? 'on' : ''}" data-${cls}="${val}">${label}</button>`;
    root.innerHTML = `<div data-notr>
      <div class="who-row"><span>你的對象是</span>
        ${opt('partner', 'f', '👧 女朋友', partner === 'f')}${opt('partner', 'm', '👦 男朋友', partner === 'm')}</div>
      <div class="who-row"><span>你自己是</span>
        ${opt('me', 'm', '男友', me === 'm')}${opt('me', 'f', '女友', me === 'f')}</div>
      <p class="venue-tip">${s.me === 'auto' ? '「你自己」預設跟對象相反，點另一個就會固定下來。' : '你自己的稱呼已固定。'}
        ${s.me === 'auto' ? '' : '<button class="linkish" data-me="auto">恢復預設（跟對象相反）</button>'}</p>
    </div>`;
    root.querySelectorAll('[data-partner]').forEach(b => b.addEventListener('click', () => {
      FF.Audio.play('click');
      FF.G.setPartner(b.dataset.partner);
      H.toast(b.dataset.partner === 'm' ? '今天的對象是男朋友 👦' : '今天的對象是女朋友 👧');
      refreshGender();
    }));
    root.querySelectorAll('[data-me]').forEach(b => b.addEventListener('click', () => {
      FF.Audio.play('click');
      FF.G.setMe(b.dataset.me);
      refreshGender();
    }));
  }
  function refreshGender() {
    if (FF.UI.current === 'setup') FF.UIPanels.renderSetup();
    else if (FF.UI.current === 'settings') genderControls($('set-gender'));
  }

  // 「對象」分頁：控制項＋四種模式的預覽（男友版／女友版造型一目了然）
  function renderWho(list) {
    const wrap = document.createElement('div');
    wrap.className = 'who-wrap';
    const box = document.createElement('div');
    genderControls(box);
    wrap.appendChild(box);
    const dress = document.createElement('button');
    dress.className = 'btn small dress-go';
    dress.innerHTML = '🎨 打扮對象・取名字・用照片當臉';
    dress.addEventListener('click', () => { FF.Audio.play('click'); FF.UILook.setBack('setup'); H.show('dress'); });
    wrap.appendChild(dress);
    const hint = document.createElement('p');
    hint.className = 'venue-tip';
    hint.textContent = '下面是四種模式的經典造型。想要自己捏臉，到「打扮對象」，自訂後所有模式都會套用。';
    wrap.appendChild(hint);
    const prev = document.createElement('div');
    prev.className = 'who-prev';
    FF.PERSONAS.forEach(p => {
      const cell = document.createElement('div');
      cell.className = 'who-cell';
      const cv = document.createElement('canvas');
      cv.width = 220;
      cv.height = 196;
      const c = cv.getContext('2d');
      c.fillStyle = '#ffe9cf';
      c.fillRect(0, 0, 220, 196);
      c.save();
      c.translate(-160, -66);
      c.beginPath();
      c.rect(160, 66, 220, 196);
      c.clip();
      FF.Render.drawGF(c, null, 0.3, p, { follow: true, noPhoto: true });
      c.restore();
      cell.appendChild(cv);
      const lab = document.createElement('span');
      lab.textContent = `${p.icon} ${p.name}`;
      cell.appendChild(lab);
      prev.appendChild(cell);
    });
    wrap.appendChild(prev);
    list.appendChild(wrap);
  }

  // ---------- 暱稱 ----------
  function saveNick(raw) {
    const r = FF.Duel.cleanNick(raw);
    if (!r.ok) return r;
    S().nick = r.nick;
    FF.Save.persist();
    return r;
  }
  function nickDialog(after) {
    const body = dialog({
      title: '✏️ 取個暱稱',
      html: `<p>排行榜和戰帖會顯示它，最多 ${FF.Duel.NICK_MAX} 個字。請不要用太狂野的字，店員會臉紅。</p>
        <input id="dlg-nick" class="dlg-input" type="text" maxlength="${FF.Duel.NICK_MAX}" placeholder="例如：夾肉師傅" value="" data-notr autocomplete="off">
        <p class="dlg-err" id="dlg-nick-err" data-notr></p>`,
      buttons: [
        {
          text: '儲存', cls: 'primary', fn: () => {
            const r = saveNick($('dlg-nick').value);
            if (!r.ok) { $('dlg-nick-err').textContent = r.msg; return false; }
            H.toast(`暱稱：${r.nick}`);
            if (after) setTimeout(after, 0);
          },
        },
        { text: '取消', fn: () => {} },
      ],
    });
    $('dlg-nick').value = S().nick || '';
    return body;
  }

  // ---------- 主選單 ----------
  function renderMenu() {
    const s = S();
    const w = FF.G.words();
    $('menu-partner').textContent = `${w.icon} ${FF.G.name() || (FF.G.partner() === 'm' ? '男朋友' : '女朋友')}`;
    const key = FF.Daily.today();
    const cfg = FF.Daily.config(key);
    const rec = FF.Daily.official(key);
    $('dc-date').textContent = fmtDate(key);
    $('dc-cfg').textContent = cfgLine(cfg);
    const st = FF.Daily.streak();
    $('dc-stat').textContent = rec
      ? `今日成績 ${rec.score} 分・${FF.Render.fmtTime(rec.time)}${st > 1 ? `・🔥 連續 ${st} 天` : ''}`
      : `今天還沒挑戰！全世界同一局${st ? `・🔥 連續 ${st} 天` : ''}`;
    $('dot-daily').classList.toggle('hidden', !!rec || s.runs < 1);
    const off = FF.Cloud.mode === 'off';
    $('menu-rank').textContent = off ? '尚未開放' : '每日・每週';
    $('btn-rank').classList.toggle('soft-off', off);
    const u = FF.Cloud.user;
    $('menu-account').textContent = off ? '尚未開放' : u && !u.anon ? '已登入' : '備份・換機';
    $('btn-account').classList.toggle('soft-off', off);
    $('dot-account').classList.toggle('hidden', !FF.Cloud.conflict);
    $('btn-install').classList.toggle('hidden', FF.PWA.standalone());
  }

  // ---------- 設定 ----------
  function renderSettings() {
    genderControls($('set-gender'));
    $('set-nick').value = S().nick || '';
    $('set-nick-msg').textContent = '';
    $('btn-set-install').classList.toggle('hidden', FF.PWA.standalone());
    $('btn-set-fs').classList.toggle('hidden', FF.PWA.standalone() || !FF.PWA.fsEnabled());
  }

  // ---------- 每日同題 ----------
  function renderDaily() {
    const key = FF.Daily.today();
    const cfg = FF.Daily.config(key);
    const rec = FF.Daily.official(key);
    const practice = S().dc.practice.date === key ? S().dc.practice.n : 0;
    $('daily-streak').textContent = FF.Daily.streak();
    const v = FF.VENUES.find(x => x.id === cfg.venue);
    const p = FF.personaById(cfg.persona);
    const b = FF.brothById(cfg.broth);
    const locked = [];
    if (S().best.wave < v.unlockWave) locked.push('場地');
    if (!S().unlockedGf.includes(p.id)) locked.push('她的模式');
    if (!S().unlockedBroth.includes(b.id)) locked.push('鍋底');
    const body = $('daily-body');
    body.innerHTML = `
      <div class="dly-card">
        <div class="dly-date">📅 ${key}（台灣時間）</div>
        <div class="dly-left">距離換日還有 <b>${fmtLeft(FF.Daily.msLeft())}</b></div>
        <div class="dly-cfg">
          <div><span>場地</span><b>${v.icon} ${v.name}</b></div>
          <div><span>她的模式</span><b>${p.icon} ${p.name}</b></div>
          <div><span>鍋底</span><b>${b.icon} ${b.name}</b></div>
          <div><span>對象</span><b data-notr>${FF.G.words().icon} ${FF.G.partner() === 'm' ? '男朋友' : '女朋友'}</b></div>
        </div>
        ${locked.length ? `<p class="venue-tip">🔓 今天的${locked.join('、')}你還沒解鎖，但這局可以先玩（只限今天這局）。</p>` : ''}
      </div>
      <div class="dly-card ${rec ? 'done' : ''}">
        ${rec
    ? `<div class="dly-title">✅ 今日正式成績</div>
           <div class="dly-score">${rec.score}<small> 分</small></div>
           <div class="dly-sub">⏱ ${FF.Render.fmtTime(rec.time)}　🌊 第 ${rec.wave} 波　🔥 連續 ${FF.Daily.streak()} 天</div>
           <div class="dly-sub">${rec.sub ? '🥇 已上傳排行榜' : cloudOff() ? '排行榜尚未開放' : '還沒上傳排行榜'}${practice ? `　🏋️ 今天練習了 ${practice} 局` : ''}</div>`
    : `<div class="dly-title">🔥 今天還沒挑戰</div>
           <div class="dly-sub">每人每天只有<b>第一局</b>算正式成績，之後可以練習但不計分。想清楚再開動！</div>`}
      </div>
      <div class="dly-rules">
        <b>⚔️ 競技模式</b>：所有能力固定 Lv.${FF.COMPETE.level}、不能用道具，不受你商店升級影響。飯票比一般局少，也不計入最高紀錄與場地解鎖。
      </div>
      <button class="btn primary" id="dly-go">${rec ? '🏋️ 練習一局（不計分）' : '🔥 開始今日挑戰'}</button>
      <div class="btn-row two">
        <button class="btn small" id="dly-share" ${rec ? '' : 'disabled'}>📤 分享今日成績</button>
        <button class="btn small" id="dly-duel" ${rec ? '' : 'disabled'}>⚔️ 用成績下戰帖</button>
      </div>
      <button class="btn small" id="dly-rank">🥇 看今日排行榜</button>`;
    $('dly-go').addEventListener('click', () => {
      FF.Audio.play('click');
      if (!rec) {
        dialog({
          title: '要開始了嗎？',
          html: '<p>今天<b>只有第一局算正式成績</b>，開打後中途結帳也算一局喔！</p>',
          back: 'daily',
          buttons: [
            { text: '開動！', cls: 'primary', fn: () => H.app.requestStart({ compete: FF.Daily.compOpts() }) },
            { text: '再想想', fn: () => {} },
          ],
        });
      } else H.app.requestStart({ compete: FF.Daily.compOpts() });
    });
    $('dly-share').addEventListener('click', () => shareDaily(key, rec));
    $('dly-duel').addEventListener('click', () => {
      sendDuelDialog({
        seed: cfg.seed, venue: cfg.venue, persona: cfg.persona, broth: cfg.broth, partner: FF.G.partner(), nick: S().nick,
        score: rec.score, time: rec.time, fromDaily: true,
      }, { score: rec.score, time: rec.time, label: cfgLine(cfg) });
    });
    $('dly-rank').addEventListener('click', () => { rankKind = 'daily'; H.show('rank'); });
  }

  // 每日成績：Wordle 式文字＋成績圖。可以直接分享（支援就連圖片一起），也能只複製文字或存圖
  async function shareDaily(key, rec) {
    const text = FF.Daily.shareText(key, rec);
    let blob = null;
    try { blob = await FF.Share.toBlob(FF.Share.renderDaily(key, rec)); } catch (e) { /* 圖產生失敗就只分享文字 */ }
    const url = blob ? URL.createObjectURL(blob) : '';
    dialog({
      title: '📤 分享今日成績',
      html: `${url ? `<img class="share-prev" src="${url}" alt="今日成績圖">` : ''}<pre class="dly-text" data-notr>${esc(text)}</pre>`,
      back: 'daily',
      buttons: [
        {
          text: '📤 分享', cls: 'primary', fn: async () => {
            try {
              const file = blob && new File([blob], 'foodfight-daily.png', { type: 'image/png' });
              if (file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] }) && !FF.UIX.noWebShare) {
                await navigator.share({ files: [file], title: '搶火鍋大作戰・每日同題', text });
                return false;
              }
            } catch (e) { if (e && e.name === 'AbortError') return false; }
            await shareOrCopy({ title: '搶火鍋大作戰・每日同題', text });
            return false;
          },
        },
        { text: '📋 複製文字', fn: async () => { try { await navigator.clipboard.writeText(text); H.toast('📋 已複製，貼給朋友吧！'); } catch (e) { H.toast('請長按文字複製'); } return false; } },
        ...(blob ? [{ text: '🖼️ 存成圖片', fn: () => { FF.Share.download(blob, 'foodfight-daily.png'); H.toast('📥 成績圖已下載'); return false; } }] : []),
        { text: '關閉', fn: () => { if (url) setTimeout(() => URL.revokeObjectURL(url), 2000); } },
      ],
    });
  }

  // 用 Web Share 分享文字／連結，不支援就複製到剪貼簿
  async function shareOrCopy({ title, text, url }) {
    const full = url && !text.includes(url) ? `${text}\n${url}` : text;
    try {
      if (navigator.share && !FF.UIX.noWebShare) {
        await navigator.share({ title, text: url ? text : full, ...(url ? { url } : {}) });
        return 'shared';
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancel';
    }
    try {
      await navigator.clipboard.writeText(full);
      H.toast('📋 已複製，貼給朋友吧！');
      return 'copied';
    } catch (e) {
      // 剪貼簿被擋：丟到對話框讓玩家手動複製
      dialog({
        title: '手動複製',
        html: `<textarea class="dlg-input" rows="5" readonly data-notr id="dlg-copy">${esc(full)}</textarea>`,
        buttons: [{ text: '好', cls: 'primary', fn: () => {} }],
      });
      const ta = $('dlg-copy');
      ta.focus();
      ta.select();
      return 'manual';
    }
  }

  // ---------- 戰帖 ----------
  function duelCardHtml(d, note) {
    const v = FF.VENUES.find(x => x.id === d.venue);
    const p = FF.personaById(d.persona);
    const b = FF.brothById(d.broth);
    const lock = [];
    if (S().best.wave < v.unlockWave) lock.push(`${v.icon} ${v.name}`);
    if (!S().unlockedGf.includes(p.id)) lock.push(`${p.icon} ${p.name}`);
    if (!S().unlockedBroth.includes(b.id)) lock.push(`${b.icon} ${b.name}`);
    const nick = d.nick || '神祕客';
    return `<div class="duel-card"><div class="duel-face" id="duel-face"></div>
      <div class="duel-from"><b data-notr>${esc(nick)}</b> 向你下了戰帖！</div>
      <div class="duel-score">${d.score}<small> 分</small></div>
      <div class="duel-sub">⏱ ${FF.Render.fmtTime(d.time)}${d.fromDaily ? '　🗓️ 每日同題的配置' : ''}</div>
      <div class="duel-cfg">
        <span>${v.icon} ${v.name}</span><span>${p.icon} ${p.name}</span><span>${b.icon} ${b.name}</span>
        <span data-notr>${d.pname ? esc(d.pname) : d.partner === 'm' ? '👦 男朋友' : '👧 女朋友'}</span>
      </div>
      <ul class="duel-notes">
        <li>⚔️ 競技模式：能力統一 Lv.${FF.COMPETE.level}、不能用道具，同一個種子，公平對決。</li>
        ${lock.length ? `<li>🔓 你還沒解鎖的 ${lock.join('、')} 這局可以先玩（只限這局）。</li>` : ''}
        <li>🎫 飯票比一般局少，也不計入你的最高紀錄。</li>
        ${note ? `<li>${note}</li>` : ''}
      </ul>
    </div>`;
  }

  function showDuelCard(d) {
    const dlg = dialog({
      title: '⚔️ 收到戰帖',
      html: duelCardHtml(d),
      back: 'menu',
      buttons: [
        { text: '接受挑戰！', cls: 'primary', fn: () => H.app.requestStart({ compete: FF.Duel.compOpts(d) }) },
        { text: '算了，我怕', fn: () => {} },
      ],
    });
    // 戰帖卡上的對象臉：用你自己的自訂外觀畫（戰帖不帶外觀），名字用對方帶來的
    const face = dlg.querySelector('#duel-face');
    if (face && FF.UILook) face.appendChild(FF.UILook.portrait({ gender: d.partner, mood: 'furious', size: 84, noPhoto: true, name: d.pname || '' }));
  }

  function openDuelInput() {
    dialog({
      title: '⚔️ 貼上戰帖',
      html: `<p>把朋友傳給你的戰帖連結（或後面那串碼）貼在這裡：</p>
        <textarea id="dlg-duel" class="dlg-input" rows="3" placeholder="https://dasarbe.github.io/foodfight/?duel=…" data-notr></textarea>
        <p class="dlg-err" id="dlg-duel-err" data-notr></p>`,
      back: 'menu',
      buttons: [
        {
          text: '打開戰帖', cls: 'primary', fn: () => {
            const r = FF.Duel.decode($('dlg-duel').value);
            if (!r.ok) { $('dlg-duel-err').textContent = r.msg; return false; }
            setTimeout(() => showDuelCard(r.data), 0);
          },
        },
        { text: '取消', fn: () => {} },
      ],
    });
  }

  // 啟動時網址帶 ?duel=碼：解析成功就顯示戰帖卡，失敗給幽默提示（不能當掉）
  function handleUrlDuel() {
    let raw = null;
    try {
      raw = new URLSearchParams(location.search).get('duel');
    } catch (e) { /* ignore */ }
    if (raw == null) return;
    try {
      const u = new URL(location.href);
      u.searchParams.delete('duel');
      history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
    } catch (e) { /* ignore */ }
    const r = FF.Duel.decode(raw);
    if (r.ok) {
      lastDuelCode = raw;
      showDuelCard(r.data);
    } else {
      dialog({
        title: '😵 戰帖看不懂',
        html: `<p>${esc(r.msg)}</p><p class="venue-tip">想自己開一局的話，直接按「開動！」就好。</p>`,
        back: 'menu',
        buttons: [{ text: '好吧', cls: 'primary', fn: () => {} }],
      });
    }
  }

  // 產生戰帖連結並分享
  function sendDuelDialog(d, brief) {
    const pnameOf = FF.Look.nameOf(d.partner === 'm' ? 'm' : 'f');
    let code = FF.Duel.encode(d);
    let url = FF.Duel.link(code);
    const nm = (S().nick || '').trim();
    const text = FF.G.t(`🍲 搶火鍋大作戰・對決戰帖\n${nm ? nm + ' 在' : '我在'}「${brief.label}」拿了 ${brief.score} 分，撐了 ${FF.Render.fmtTime(brief.time)}！\n敢跟我決鬥嗎？👇`);
    dialog({
      title: '⚔️ 下戰帖',
      html: `<p>把這個連結傳給朋友，他打開就會玩到<b>一模一樣的一局</b>（同種子、同配置、能力統一）。</p>
        <input id="dlg-link" class="dlg-input" readonly value="${esc(url)}" data-notr>
        <p class="venue-tip">戰帖碼內含：種子、場地、模式、鍋底、對象性別、你的暱稱（${nm ? esc(nm) : '沒設定'}）、分數與時間。</p>
        ${pnameOf ? `<label class="chk"><input type="checkbox" id="dlg-pname"> 帶上對象的名字「<b data-notr>${esc(pnameOf)}</b>」（對方會在戰帖卡看到）</label>` : ''}`,
      buttons: [
        { text: '📤 分享連結', cls: 'primary', fn: async () => { await shareOrCopy({ title: '搶火鍋大作戰・對決戰帖', text, url }); return false; } },
        { text: '📋 複製連結', fn: async () => { try { await navigator.clipboard.writeText(url); H.toast('📋 已複製連結'); } catch (e) { $('dlg-link').select(); H.toast('請長按連結複製'); } return false; } },
        { text: '關閉', fn: () => {} },
      ],
    });
    const body = $('dlg-link');
    body.addEventListener('focus', () => body.select());
    const pn = $('dlg-pname');
    if (pn) pn.addEventListener('change', () => {
      code = FF.Duel.encode(Object.assign({}, d, { pname: pn.checked ? pnameOf : '' }));
      url = FF.Duel.link(code);
      body.value = url;
    });
    return { code, url, text };
  }

  // 結算畫面的「下戰帖／回嗆」
  function sendDuelFromResult(r) {
    const c = r.comp;
    if (!c) {
      // 一般局有升級和道具，不公平：先打一局競技局
      dialog({
        title: '⚔️ 想下戰帖？',
        html: `<p>對決用的是<b>統一能力、不能用道具</b>的競技模式，剛剛這局有升級和道具，不能拿來比。</p>
          <p>要用同樣的場地、模式、鍋底，現在先打一局競技局，再把成績傳給朋友嗎？</p>`,
        back: 'result',
        buttons: [
          { text: '好，開打！', cls: 'primary', fn: () => H.app.requestStart({ compete: { kind: 'duel', seed: FF.Rng.randomSeed(), venue: r.venue.id, persona: r.persona.id, broth: r.broth.id, partner: FF.G.partner() } }) },
          { text: '算了', fn: () => {} },
        ],
      });
      return;
    }
    const code = FF.Duel.fromResult(r);
    sendDuelDialog({
      seed: r.seed, venue: r.venue.id, persona: r.persona.id, broth: r.broth.id, partner: c.partner, nick: S().nick,
      score: r.score, time: r.time, fromDaily: c.kind === 'daily',
    }, { score: r.score, time: r.time, label: cfgLine({ venue: r.venue.id, persona: r.persona.id, broth: r.broth.id }) });
    return code;
  }

  // ---------- 結算畫面的競技區塊 ----------
  function decorateResult(r) {
    const box = $('res-comp');
    const again = $('btn-again');
    const send = $('btn-duel-send');
    send.classList.remove('hidden');
    if (!r.comp) {
      box.classList.add('hidden');
      send.textContent = '⚔️ 下戰帖給朋友';
      return;
    }
    const c = r.comp;
    lastComp = {
      kind: c.kind, seed: c.seed, venue: c.venue, persona: c.persona, broth: c.broth, partner: c.partner,
      challenger: c.challenger, dateKey: c.dateKey,
    };
    let html = '';
    if (r.duel) {
      const d = r.duel;
      html += `<div class="vs vs-${d.result}">
        <div class="vs-side"><small>你</small><b>${r.score}</b></div>
        <div class="vs-mid">${d.result === 'win' ? '🏆' : d.result === 'lose' ? '😭' : '🤝'}</div>
        <div class="vs-side"><small data-notr>${esc(d.nick)}</small><b>${d.theirs.score}</b></div>
      </div>
      <p class="vs-taunt">${FF.Duel.fill(d.taunt, d.nick)}</p>
      <p class="venue-tip">${d.diff > 0 ? `贏了 ${d.diff} 分` : d.diff < 0 ? `差了 ${-d.diff} 分` : '同分'}（${FF.Render.fmtTime(r.time)} vs ${FF.Render.fmtTime(d.theirs.time)}）・${esc(d.say)}</p>`;
    }
    if (c.kind === 'daily') {
      html += c.official
        ? `<div class="comp-line ok">🗓️ 今日正式成績已記錄：<b>${r.score}</b> 分　🔥 連續 ${c.streak} 天</div>
           <div class="comp-line" id="res-cloud"></div>`
        : '<div class="comp-line warn">🏋️ 練習局：今天的正式成績已經有了，這局不計分。</div>';
    }
    html += `<div class="comp-line sub">⚔️ ${c.kind === 'daily' ? '每日同題' : '對決'}（競技模式）：能力統一 Lv.${FF.COMPETE.level}、不能用道具；飯票較少、不計入最高紀錄與場地解鎖。</div>`;
    box.innerHTML = html;
    box.classList.remove('hidden');
    $('res-title').textContent = r.duel ? r.duel.title : r.title;
    // 主按鈕
    if (c.kind === 'daily') {
      again.textContent = '🏋️ 再練習一局（不計分）';
      again.dataset.comp = 'daily';
      send.textContent = '⚔️ 用成績下戰帖';
      if (c.official) maybeUpload(c.dateKey);
    } else {
      again.textContent = '🔁 再戰一次（同一局）';
      again.dataset.comp = 'duel';
      send.textContent = r.duel ? '⚔️ 回嗆！' : '⚔️ 下戰帖給朋友';
    }
  }

  // ---------- 排行榜上傳 ----------
  async function submitOfficial(key) {
    const rec = FF.Daily.official(key);
    if (!rec) return { ok: false, error: 'norec' };
    if (rec.sub) return { ok: true, already: true };
    if (!S().nick) return { ok: false, error: 'nonick' };
    const cfg = FF.Daily.config(key);
    const r = await FF.Cloud.submitDaily(key, {
      score: rec.score, time: rec.time, wave: rec.wave, nick: S().nick, persona: cfg.persona, venue: cfg.venue, broth: cfg.broth,
    });
    if (r.ok) {
      rec.sub = true;
      S().cloud.used = true;
      FF.Save.persist();
    }
    return r;
  }
  const upMsg = r => (r.ok
    ? `🥇 已上傳每日排行榜${r.rank ? `，目前第 ${r.rank} 名` : ''}！`
    : r.error === 'nonick' ? '設定暱稱就能上榜 →'
      : r.error === 'implausible' ? '這個成績看起來不太合理，沒有上傳。'
        : r.error === 'off' || r.error === 'unavailable' ? '排行榜暫時連不上，稍後到排行榜頁再試。'
          : r.msg || '上傳失敗了，稍後到排行榜頁再試。');

  async function maybeUpload(key) {
    const line = $('res-cloud');
    if (!line || FF.Cloud.mode === 'off') return; // 沒設定雲端：整行不顯示
    const rec = FF.Daily.official(key);
    if (rec.sub) { line.textContent = '🥇 已在排行榜上'; return; }
    if (S().cloud.used && S().nick) {
      line.textContent = '⏳ 正在上傳排行榜…';
      const r = await FF.Cloud.ensure().then(() => submitOfficial(key));
      if (!$('res-cloud')) return;
      $('res-cloud').textContent = upMsg(r);
      return;
    }
    // 第一次：由玩家決定要不要上榜（會建立匿名帳號並公開暱稱與成績）
    line.innerHTML = '<button class="btn small" id="btn-res-up">🥇 上傳到今日排行榜</button>';
    $('btn-res-up').addEventListener('click', () => {
      FF.Audio.play('click');
      const go = async () => {
        $('res-cloud').textContent = '⏳ 上傳中…';
        S().cloud.used = true;
        FF.Save.persist();
        const r = await submitOfficial(key);
        $('res-cloud').textContent = upMsg(r);
      };
      if (!S().nick) nickDialog(() => { H.show('result'); go(); });
      else go();
    });
  }

  // ---------- 排行榜頁 ----------
  async function renderRank() {
    document.querySelectorAll('#rank .tab').forEach(b => b.classList.toggle('on', b.dataset.rk === rankKind));
    const list = $('rank-list');
    const me = $('rank-me');
    const subBtn = $('btn-rank-submit');
    const key = rankKind === 'daily' ? FF.Daily.today() : FF.Daily.weekKey();
    me.innerHTML = '';
    $('btn-rank-nick').textContent = S().nick ? `✏️ ${S().nick}` : '✏️ 暱稱';
    $('rank-tip').textContent = rankKind === 'daily'
      ? `今日同題（${FF.Daily.today()}）：只有第一局的正式成績上榜，前 50 名。`
      : `本週累計（${key}）：把這週每天的正式成績加總，天天打才會爬上去。前 50 名。`;
    const rec = FF.Daily.official();
    subBtn.disabled = !rec || rec.sub || FF.Cloud.mode === 'off';
    subBtn.textContent = !rec ? '⬆️ 今天還沒有正式成績' : rec.sub ? '✅ 今日成績已上傳' : '⬆️ 上傳今日成績';
    if (FF.Cloud.mode === 'off') {
      list.innerHTML = `<div class="empty-card"><div class="big">🥇</div><h3>排行榜尚未開放</h3>
        <p>遊戲管理員還沒接上雲端，所以先沒有排行榜。你的每日成績照樣記在這台裝置上，等開放了再上榜也不遲！</p></div>`;
      return;
    }
    list.innerHTML = '<div class="empty-card"><div class="big">⏳</div><p>正在跟服務員打聽排名…</p></div>';
    const token = ++rankToken;
    const r = await FF.Cloud.board(rankKind, key, 50);
    if (token !== rankToken) return;
    if (!r.ok) {
      list.innerHTML = `<div class="empty-card"><div class="big">🔌</div><h3>排行榜暫時連不上</h3><p>可能是網路不穩，或雲端還沒準備好。玩遊戲不受影響，晚點再試試。</p></div>`;
      return;
    }
    if (!r.entries.length) {
      list.innerHTML = '<div class="empty-card"><div class="big">🦗</div><p>還沒有人上榜，你就是第一個吃火鍋的人！</p></div>';
    } else {
      list.innerHTML = r.entries.map(e => {
        const medal = e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank;
        const sub = rankKind === 'daily' ? `${FF.Render.fmtTime(e.time)}・第 ${e.wave} 波` : `${e.days} 天・單日最佳 ${e.best}`;
        return `<div class="rk-row ${e.me ? 'me' : ''}"><span class="rk-no">${medal}</span>
          <span class="rk-nick"><b data-notr>${esc(e.nick)}</b><small>${sub}</small></span><span class="rk-score">${e.score}</span></div>`;
      }).join('');
    }
    if (r.me) {
      const inTop = r.entries.some(e => e.me);
      me.innerHTML = `<div class="rk-row me"><span class="rk-no">${r.me.rank || '—'}</span><span class="rk-nick"><b>你的名次${inTop ? '' : '（不在前 50）'}</b><small data-notr>${esc(r.me.entry.nick)}</small></span><span class="rk-score">${r.me.entry.score}</span></div>`;
    } else {
      me.innerHTML = '<div class="rk-row"><span class="rk-no">—</span><span class="rk-nick"><b>你還沒上榜</b><small>' +
        (rankKind === 'daily' ? '打完今日同題的第一局就能上傳' : '這週還沒有正式成績') + '</small></span><span class="rk-score"></span></div>';
    }
  }
  let rankToken = 0;

  async function uploadFromRank() {
    const key = FF.Daily.today();
    const go = async () => {
      S().cloud.used = true;
      FF.Save.persist();
      $('btn-rank-submit').disabled = true;
      const r = await submitOfficial(key);
      H.toast(upMsg(r));
      renderRank();
    };
    if (!S().nick) nickDialog(() => { H.show('rank'); go(); });
    else go();
  }

  // ---------- 雲端存檔（帳號）頁 ----------
  const fmtTs = ms => {
    if (!ms) return '—';
    const d = new Date(ms);
    const p = n => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  async function renderAccount() {
    const body = $('account-body');
    if (FF.Cloud.mode === 'off') {
      body.innerHTML = `<div class="empty-card"><div class="big">☁️</div><h3>雲端存檔尚未開放</h3>
        <p>遊戲管理員還沒接上雲端，所以現在還不能備份或換機。你的進度安全地存在這台裝置的瀏覽器裡，記得別清除網站資料喔！</p></div>`;
      return;
    }
    if (FF.Cloud.state.phase === 'error') {
      body.innerHTML = `<div class="empty-card"><div class="big">🔌</div><h3>雲端暫時連不上</h3>
        <p>可能是離線，或是雲端服務被擋住了。遊戲其他功能不受影響，晚點再試。</p><button class="btn small" id="acc-retry">再試一次</button></div>`;
      $('acc-retry').addEventListener('click', () => { FF.Cloud.ensure(); });
      return;
    }
    if (FF.Cloud.state.phase !== 'ready') {
      body.innerHTML = '<div class="empty-card"><div class="big">⏳</div><p>正在連接雲端…</p></div>';
      if (FF.Cloud.state.phase === 'idle') FF.Cloud.ensure(); // 載入完會透過 onChange 重畫
      return;
    }
    const u = FF.Cloud.user;
    const d = S();
    const sm = FF.Cloud.summary(d);
    let html = '';
    if (!u || u.anon) {
      html += `<div class="acc-card"><h3>${u ? '🕶️ 匿名玩家' : '👤 還沒登入'}</h3>
        <p>用 Google 登入就能把進度備份到雲端，換手機、換瀏覽器也不怕白吃（${u ? '你的排行榜身分會一起保留' : '登入後也能上排行榜'}）。</p>
        <button class="btn primary" id="acc-google">使用 Google 登入並備份</button></div>`;
    } else {
      html += `<div class="acc-card ok"><h3>✅ 已登入</h3>
        <p data-notr><b>${esc(u.name || 'Google 玩家')}</b><br>${esc(u.email || '')}</p></div>
        <div class="acc-card">
          <h3>📱 這台裝置的進度</h3>
          <div class="acc-sum"><span>🎫 ${sm.tickets}</span><span>🏆 ${sm.bestScore}</span><span>🍲 ${sm.runs} 局</span></div>
          <p class="venue-tip">最後更新：${fmtTs(d.updatedAt)}　最後同步：${fmtTs(d.cloud.lastSync)}</p>
          <button class="btn primary" id="acc-sync">🔄 立即同步</button>
          <button class="toggle ${d.cloud.auto ? '' : 'off'}" id="acc-auto"><span>每局結束自動同步</span><b>${d.cloud.auto ? '開' : '關'}</b></button>
        </div>
        <button class="btn small danger" id="acc-out">登出</button>`;
    }
    if (FF.Cloud.conflict) html = '<div class="acc-card warn"><h3>⚠️ 本機和雲端進度不一樣</h3><button class="btn" id="acc-conf">處理衝突</button></div>' + html;
    html += '<p class="venue-tip">雲端只存「遊戲進度」（飯票、升級、成就等）。想上排行榜不需要登入 Google，用匿名身分就可以。</p>';
    body.innerHTML = html;
    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', () => { FF.Audio.play('click'); fn(); }); };
    on('acc-google', doGoogle);
    on('acc-sync', () => doSync(true));
    on('acc-conf', () => showConflict(FF.Cloud.conflict));
    on('acc-auto', () => { d.cloud.auto = !d.cloud.auto; FF.Save.persist(); renderAccount(); });
    on('acc-out', async () => { await FF.Cloud.signOut(); H.toast('已登出（本機進度還在）'); renderAccount(); });
  }

  async function doGoogle() {
    const s = S();
    s.cloud.used = true;
    FF.Save.persist();
    const r = await FF.Cloud.signInGoogle();
    if (r.cancelled) return H.toast('登入取消了，下次再約');
    if (r.redirecting) return;
    if (!r.ok) return H.toast('登入失敗了，稍後再試試');
    H.toast(r.lost ? '登入成功！（這個 Google 帳號有舊身分，排行榜暱稱改用舊的）' : '登入成功！');
    await doSync(true);
  }
  async function doSync(manual) {
    const r = await FF.Cloud.sync({ manual });
    if (!r.ok) { H.toast(r.error === 'login' ? '要先登入 Google 喔' : '同步失敗了，稍後再試'); return r; }
    if (r.action === 'conflict') showConflict(r.conflict);
    else {
      H.toast({ uploaded: '☁️ 已備份到雲端', restored: '☁️ 已從雲端還原進度', same: '已經是最新的了', none: '還沒有進度可以備份' }[r.action] || '同步完成');
      if (r.action === 'restored') { FF.Progress.ensureDaily(); H.show('menu'); return r; }
    }
    if (FF.UI.current === 'account') renderAccount();
    return r;
  }
  function showConflict(c) {
    const card = (t, x) => `<div class="cf-col"><h4>${t}</h4><div>🎫 ${x.tickets}</div><div>🏆 ${x.bestScore}</div><div>🍲 ${x.runs} 局</div><small>${fmtTs(x.updatedAt)}</small></div>`;
    dialog({
      title: '⚠️ 兩邊的進度不一樣！',
      html: `<p>你的手機和雲端各自吃了一鍋火鍋，內容對不起來。要保留哪一份？<b>沒選到的那份會被蓋掉</b>，三思啊～</p>
        <div class="cf-grid">${card('📱 這台裝置', c.local)}${card('☁️ 雲端', c.remote)}</div>
        <p class="venue-tip">時間越新不一定越好，看看飯票和最高分再決定。</p>`,
      back: 'account',
      buttons: [
        { text: '保留本機（覆蓋雲端）', cls: 'primary', fn: async () => { const r = await FF.Cloud.resolve('local'); H.toast(r.ok ? '☁️ 已用本機覆蓋雲端' : '失敗了，稍後再試'); } },
        { text: '保留雲端（覆蓋本機）', cls: 'danger', fn: async () => { const r = await FF.Cloud.resolve('remote'); H.toast(r.ok ? '☁️ 已用雲端還原' : '失敗了，稍後再試'); if (r.ok) { FF.Progress.ensureDaily(); dlgPrev = 'menu'; } } },
        { text: '先不要', fn: () => {} },
      ],
    });
  }

  // ---------- 加到主畫面 ----------
  const IOS_SVG = {
    share: '<svg viewBox="0 0 40 40" width="44" height="44"><rect x="9" y="16" width="22" height="18" rx="4" fill="none" stroke="#2a7de1" stroke-width="3"/><path d="M20 5v18M14 11l6-6 6 6" fill="none" stroke="#2a7de1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    plus: '<svg viewBox="0 0 40 40" width="44" height="44"><rect x="7" y="7" width="26" height="26" rx="6" fill="none" stroke="#333" stroke-width="3"/><path d="M20 13v14M13 20h14" stroke="#333" stroke-width="3" stroke-linecap="round"/></svg>',
    add: '<svg viewBox="0 0 60 40" width="64" height="44"><rect x="4" y="8" width="52" height="24" rx="12" fill="#2a7de1"/><text x="30" y="26" text-anchor="middle" font-size="15" font-weight="bold" fill="#fff" font-family="sans-serif">新增</text></svg>',
  };
  function openInstall() {
    const standalone = FF.PWA.standalone();
    let html = `<p class="pwa-line" id="pwa-line">${esc(FF.PWA.nextLine())}</p>`;
    const buttons = [];
    if (standalone) {
      html += '<p>你已經在主畫面裡玩囉！👏 再也不用跟網址列搶位置了。</p>';
    } else if (FF.PWA.canInstall) {
      html += '<p>Android／Chrome：按下面的按鈕，系統會問你要不要加入，點「安裝」就好。</p>';
      buttons.push({ text: '📲 一鍵加入主畫面', cls: 'primary', fn: async () => { const r = await FF.PWA.install(); H.toast(r === 'accepted' ? '已加入主畫面！去桌面找火鍋圖示吧' : '沒關係，想加隨時回來'); } });
    } else if (FF.PWA.isIOS()) {
      html += `<p>iPhone／iPad（請用 Safari 開啟）：</p>
        <ol class="ios-steps">
          <li><span class="ios-ic">${IOS_SVG.share}</span><span>點 Safari 底部（或右上角）的<b>「分享」</b>按鈕</span></li>
          <li><span class="ios-ic">${IOS_SVG.plus}</span><span>往下滑，選<b>「加入主畫面」</b></span></li>
          <li><span class="ios-ic">${IOS_SVG.add}</span><span>按右上角<b>「新增」</b>，桌面就有火鍋圖示了</span></li>
        </ol>`;
    } else {
      html += '<p>用瀏覽器選單（⋮ 或 ⋯）裡的「安裝應用程式」或「加到主畫面」就可以。這個瀏覽器沒有一鍵安裝，抱歉啦～</p>';
    }
    if (!standalone && FF.PWA.fsEnabled()) buttons.push({ text: '⛶ 切換全螢幕', fn: async () => { const ok = await FF.PWA.toggleFullscreen(); if (!ok) H.toast('這個瀏覽器不讓我們全螢幕'); return false; } });
    buttons.push({ text: '關閉', fn: () => {} });
    dialog({ title: '📲 加到主畫面', html, buttons });
  }

  // 結算畫面的提醒卡
  function renderPwaCard() {
    const card = $('res-pwa');
    if (!FF.PWA.shouldNag()) { card.classList.add('hidden'); return; }
    FF.PWA.asked();
    card.classList.remove('hidden');
    card.innerHTML = `<div class="pwa-title">📲 加到主畫面，全螢幕開吃</div><p>${esc(FF.PWA.nextLine())}</p>
      <div class="pwa-btns"><button class="btn small primary" data-a="go">${FF.PWA.canInstall ? '一鍵加入' : '教我怎麼做'}</button>
      <button class="btn small" data-a="later">之後再說</button><button class="btn small ghost" data-a="never">別再提醒</button></div>`;
    card.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      FF.Audio.play('click');
      const a = b.dataset.a;
      if (a === 'go') { card.classList.add('hidden'); openInstall(); return; }
      if (a === 'later') { FF.PWA.later(); H.toast('好，過幾天再提醒你'); } else { FF.PWA.never(); H.toast('不會再提醒了。想加的話到「設定」找'); }
      card.classList.add('hidden');
    }));
  }

  // ---------- 進入點 ----------
  function onShow(name) {
    if (name === 'daily') renderDaily();
    else if (name === 'rank') renderRank();
    else if (name === 'account') renderAccount();
    else if (name === 'settings') renderSettings();
    if (name === 'menu') {
      FF.G.setOverride(null);
      FF.G.setNameOverride(null);
      renderMenu();
    }
  }

  function init(helpers) {
    H = helpers;
    const click = (id, fn) => $(id).addEventListener('click', e => {
      FF.Audio.unlock();
      FF.Audio.play('click');
      fn(e);
    });
    click('btn-daily', () => H.show('daily'));
    click('btn-daily-back', () => H.show('menu'));
    click('btn-rank', () => { rankKind = 'daily'; H.show('rank'); });
    click('btn-rank-back', () => H.show('menu'));
    click('btn-account', () => H.show('account'));
    click('btn-account-back', () => H.show('menu'));
    click('btn-duel-input', openDuelInput);
    click('btn-install', openInstall);
    click('btn-set-install', openInstall);
    click('btn-set-fs', async () => { if (!(await FF.PWA.toggleFullscreen())) H.toast('這個瀏覽器不讓我們全螢幕'); });
    click('btn-rank-nick', () => nickDialog(() => H.show('rank')));
    click('btn-rank-submit', uploadFromRank);
    click('btn-rank-refresh', renderRank);
    click('btn-nick-save', () => {
      const r = saveNick($('set-nick').value);
      $('set-nick-msg').textContent = r.ok ? `已儲存：${r.nick}` : r.msg;
    });
    click('btn-duel-send', () => sendDuelFromResult(FF.UI.lastResult));
    document.querySelectorAll('#rank .tab').forEach(b => b.addEventListener('click', () => {
      FF.Audio.play('click');
      rankKind = b.dataset.rk;
      renderRank();
    }));
    FF.Cloud.onChange(() => {
      if (FF.UI.current === 'account') renderAccount();
      else if (FF.UI.current === 'menu') renderMenu();
    });
    FF.PWA.onChange(() => { if (FF.UI.current === 'menu') renderMenu(); });
  }

  return {
    init, onShow, renderMenu, renderWho, decorateResult, renderPwaCard, handleUrlDuel, openInstall, openDuelInput, showDuelCard,
    dialog, closeDialog, nickDialog, submitOfficial, sendDuelDialog, sendDuelFromResult, shareOrCopy, showConflict, doSync, doGoogle,
    get lastComp() { return lastComp; },
    set lastComp(v) { lastComp = v; },
    noWebShare: false,
  };
})();
