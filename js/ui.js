// DOM 介面：主選單、設定、商店、說明、暫停、結算、分享（新功能頁面在 ui-panels.js）
window.FF = window.FF || {};

FF.UI = (() => {
  const $ = id => document.getElementById(id);
  const screens = ['menu', 'setup', 'settings', 'missions', 'achieve', 'challenges', 'howto', 'shop', 'pause', 'result', 'sharebox', 'daily', 'rank', 'account', 'dialog', 'dress', 'chopcase'];
  let current = 'menu';
  let howtoReturn = 'menu';
  let settingsReturn = 'menu';
  let toastTimer = null;
  let lastResult = null;
  let shareBlob = null;
  let sharePromise = null;
  let app = null;

  function show(name) {
    current = name;
    screens.forEach(s => $(s).classList.toggle('hidden', s !== name));
    if (name === 'menu') renderMenu();
    if (name === 'shop') renderShop();
    if (name === 'setup') FF.UIPanels.renderSetup();
    if (name === 'missions') FF.UIPanels.renderMissions();
    if (name === 'achieve') FF.UIPanels.renderAchieve();
    if (name === 'challenges') FF.UIPanels.renderChallenges();
    if (name === 'settings' || name === 'pause') updateToggles();
    FF.UIX.onShow(name);
    FF.UILook.onShow(name);
    // 背景音樂：遊戲中（含暫停）放遊戲段落，其他畫面放選單段落
    if (name === null) {
      FF.Music.setScene('game');
      FF.Music.setPaused(false);
    } else if (name === 'pause' || (name === 'howto' && howtoReturn === 'pause') || (name === 'settings' && settingsReturn === 'pause')) {
      FF.Music.setPaused(true);
    } else {
      FF.Music.setScene('menu');
      FF.Music.setPaused(false);
    }
  }

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 1800);
  }

  // 重畫列表時保持捲動位置
  function keepScroll(fn) {
    const body = document.querySelector(`#${current} .shop-body`);
    const y = body ? body.scrollTop : 0;
    fn();
    if (body) body.scrollTop = y;
  }

  // ---------- 主選單 ----------
  function renderMenu() {
    const s = FF.Save.data;
    $('menu-tickets').textContent = s.tickets;
    $('menu-title').textContent = `🏷️ ${FF.Progress.titleName()}`;
    const v = FF.VENUES.find(x => x.id === s.venue) || FF.VENUES[0];
    const p = FF.personaById(s.gfType);
    const b = FF.brothById(s.broth);
    $('menu-venue').textContent = `${v.icon} ${v.name}`;
    $('menu-gf').textContent = `${p.icon} ${p.name}`;
    $('menu-broth').textContent = `${b.icon} ${b.short}`;
    const d = FF.Progress.dailyState();
    $('menu-missions').textContent = d.claimable ? '有獎勵可以領！' : `今日 ${d.done}/${d.total}`;
    $('dot-missions').classList.toggle('hidden', !d.claimable);
    const cleared = s.challenges.cleared.length;
    $('menu-challenge').textContent = `過關 ${cleared}/${FF.CHALLENGES.length}`;
    // 有新解鎖、還沒過的關卡就亮紅點
    const nextOpen = FF.CHALLENGES.some((c, i) => FF.Progress.challengeOpen(i) && !s.challenges.cleared.includes(c.id));
    $('dot-challenge').classList.toggle('hidden', !(nextOpen && s.runs >= 2 && cleared < FF.CHALLENGES.length && s.challenges.plays === 0));
    $('menu-achieve').textContent = `${s.achievements.length}/${FF.ACHIEVEMENTS.length}`;
    $('menu-best').innerHTML = s.runs
      ? `🏆 最高分 <b>${s.best.score}</b>　⏱ 最久 <b>${FF.Render.fmtTime(s.best.time)}</b>　🌊 第 <b>${s.best.wave}</b> 波`
      : '第一次來？先看看玩法說明吧！';
  }

  // ---------- 設定 ----------
  function updateToggles() {
    const s = FF.Save.data;
    const set = (id, on) => {
      const el = $(id);
      el.classList.toggle('off', !on);
      const b = el.querySelector('b');
      if (b) b.textContent = on ? '開' : '關';
    };
    set('set-sfx', !s.muted);
    set('set-music', s.music);
    set('set-vibrate', s.vibrate);
    set('pause-sfx', !s.muted);
    set('pause-music', s.music);
    set('pause-vibrate', s.vibrate);
    $('pause-sfx').firstChild.textContent = s.muted ? '🔇' : '🔊';
    $('pause-vibrate').firstChild.textContent = s.vibrate ? '📳' : '📴';
  }

  function toggleSfx() {
    const s = FF.Save.data;
    s.muted = !s.muted;
    FF.Audio.setMuted(s.muted);
    FF.Save.persist();
    updateToggles();
    FF.Audio.play('click');
    toast(s.muted ? '🔇 音效：關' : '🔊 音效：開');
  }

  function toggleMusic() {
    const s = FF.Save.data;
    s.music = !s.music;
    FF.Music.setEnabled(s.music);
    FF.Save.persist();
    updateToggles();
    FF.Audio.play('click');
    toast(s.music ? '🎵 背景音樂：開' : '🎵 背景音樂：關');
  }

  function toggleVibrate() {
    const s = FF.Save.data;
    s.vibrate = !s.vibrate;
    FF.Haptics.setEnabled(s.vibrate);
    FF.Save.persist();
    updateToggles();
    FF.Audio.play('click');
    if (s.vibrate) FF.Haptics.vibrate('dodge');
    if (!FF.Haptics.supported) toast(s.vibrate ? '震動：開（這台裝置不支援震動）' : '震動：關');
    else toast(s.vibrate ? '📳 震動：開' : '📴 震動：關');
  }

  // ---------- 商店 ----------
  function renderShop() {
    const s = FF.Save.data;
    $('shop-tickets').textContent = s.tickets;
    const up = $('shop-upgrades');
    up.innerHTML = '';
    for (const u of FF.UPGRADES) {
      const lv = s.upgrades[u.id];
      const maxed = lv >= u.max;
      const cost = FF.upgradeCost(u, lv);
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <div class="ic">${u.icon}</div>
        <div class="info">
          <div class="name">${u.name} <small>Lv.${lv}</small></div>
          <div class="desc">${maxed ? u.desc(lv) + '（已滿級）' : `目前：${lv ? u.desc(lv) : '無'} → 下一級：${u.desc(lv + 1)}`}</div>
          <div class="lv">${Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div>
        </div>
        <button class="buy" ${maxed || s.tickets < cost ? 'disabled' : ''}>${maxed ? '滿級' : `🎫 ${cost}`}</button>`;
      row.querySelector('.buy').addEventListener('click', () => buyUpgrade(u));
      up.appendChild(row);
    }
    const it = $('shop-items');
    it.innerHTML = '';
    for (const item of FF.ITEMS) {
      const n = s.items[item.id];
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <div class="ic">${item.icon}</div>
        <div class="info">
          <div class="name">${item.name} <span class="own">持有 ${n}</span></div>
          <div class="desc">${item.desc}</div>
        </div>
        <button class="buy" ${s.tickets < item.price || n >= 99 ? 'disabled' : ''}>🎫 ${item.price}</button>`;
      row.querySelector('.buy').addEventListener('click', () => buyItem(item));
      it.appendChild(row);
    }
  }

  function buyUpgrade(u) {
    const s = FF.Save.data;
    const lv = s.upgrades[u.id];
    const cost = FF.upgradeCost(u, lv);
    if (lv >= u.max || s.tickets < cost) return FF.Audio.play('error');
    s.tickets -= cost;
    s.upgrades[u.id] = lv + 1;
    FF.Save.persist();
    FF.Audio.play('coin');
    toast(`${u.icon} ${u.name} 升到 Lv.${lv + 1}！`);
    keepScroll(renderShop);
  }

  function buyItem(item) {
    const s = FF.Save.data;
    if (s.tickets < item.price || s.items[item.id] >= 99) return FF.Audio.play('error');
    s.tickets -= item.price;
    s.items[item.id]++;
    FF.Save.persist();
    FF.Audio.play('coin');
    toast(`買了 ${item.icon} ${item.name}（持有 ${s.items[item.id]}）`);
    keepScroll(renderShop);
  }

  // ---------- 結算 ----------
  function showResult(r) {
    lastResult = r;
    shareBlob = null;
    sharePromise = null;
    r.titleName = FF.Progress.titleName();
    const ch = r.challenge;
    $('res-title').textContent = r.title;
    const g = r.grade;
    $('res-grade').innerHTML = `
      <div class="grade-badge" style="--gc:${g.color}">${g.grade}</div>
      <div class="grade-info">
        <div class="grade-label">${ch ? '紀念日挑戰' : '{name}給你的男友評價'}</div>
        <div class="grade-title">${g.title}</div>
        <div class="grade-stars">${'★'.repeat(g.stars)}<span>${'★'.repeat(5 - g.stars)}</span></div>
        <div class="grade-titlechip">🏷️ ${r.titleName}</div>
      </div>`;
    const face = r.reason === 'win' ? '🥰' : r.reason === 'anger' ? '😤' : r.reason === 'hunger' ? '😋' : '🙄';
    $('res-say').innerHTML = `<span class="gf-face">${face}</span><p>${FF.G.name() ? '<b class="say-name">{name}：</b>' : ''}${ch ? g.comment : `「${g.comment}」`}</p>`;
    $('res-quips').innerHTML = r.quips.map(q => `<li>${q}</li>`).join('');
    const st = r.stats;
    $('res-stats').innerHTML = `
      <div><span>🏅 分數</span><b>${r.score}</b></div>
      <div><span>⏱ 存活時間</span><b>${FF.Render.fmtTime(r.time)}</b></div>
      <div><span>🌊 撐到第幾波</span><b>${r.wave}</b></div>
      <div><span>✨ 完美夾取</span><b>${st.perfect}</b></div>
      <div><span>🔥 最高連擊</span><b>${st.bestCombo}</b></div>
      <div><span>💨 閃過她的筷子</span><b>${st.dodges}</b></div>
      <div><span>💥 被打掉</span><b>${st.knocked}</b></div>
      <div><span>💗 她吃了幾口</span><b>${st.gfAte}</b></div>
      <div><span>🥄 餵她吃了幾口</span><b>${st.fed || 0}</b></div>
      <div><span>💢 她放大絕招</span><b>${st.ults || 0}</b></div>
      <div class="wide"><span>${r.persona.icon} ${r.persona.name}・${r.broth.icon} ${r.broth.name}</span><span>${r.venue.icon} ${r.venue.name}</span></div>`;
    const un = $('res-unlock');
    un.classList.toggle('hidden', !r.unlocked.length);
    un.innerHTML = r.unlocked.map(v => `🎉 解鎖新場地：${v.icon} <b>${v.name}</b>`).join('<br>');
    // 任務與成就
    const pr = r.progress || { missions: [], achievements: [] };
    const parts = [];
    if (pr.achievements.length) {
      parts.push('<h4>🏆 解鎖成就</h4>' + pr.achievements.map(a =>
        `<div class="ach-line"><span>${a.icon} <b>${a.name}</b>　稱號「${a.title}」</span><span>${a.reward ? `🎫 +${a.reward}` : ''}</span></div>`).join(''));
    }
    if (pr.missions.length) {
      parts.push('<h4>🎯 每日任務進度</h4>' + pr.missions.map(m =>
        `<div class="ach-line"><span>${m.icon} ${m.text}</span><span class="${m.done ? 'ok' : ''}">${m.done ? '✅ 完成！' : `${m.after}/${m.target}`}</span></div>`).join('') +
        (pr.missions.some(m => m.done) ? '<div class="hint">回主選單的「每日任務」領飯票！</div>' : ''));
    }
    const rp = $('res-progress');
    rp.classList.toggle('hidden', !parts.length);
    rp.innerHTML = parts.join('');
    const t = r.tickets;
    $('res-tickets').innerHTML = `
      <div><span>存活時間</span><span>+${t.time}</span></div>
      <div><span>分數</span><span>+${t.score}</span></div>
      <div><span>波次獎勵</span><span>+${t.wave}</span></div>
      ${ch ? '<div class="sub"><span>（紀念日挑戰一般飯票打五折）</span><span></span></div>' : ''}
      ${t.bonus ? `<div><span>飯票加成</span><span>+${t.bonus}</span></div>` : ''}
      ${t.venueBonus ? `<div><span>場地加成（${t.venueName}）</span><span>+${t.venueBonus}</span></div>` : ''}
      ${t.gfBonus ? `<div><span>她的模式加成（${t.gfName}）</span><span>+${t.gfBonus}</span></div>` : ''}
      ${t.compAdj ? `<div class="sub"><span>⚔️ 競技模式飯票打折（上限 ${FF.COMPETE.ticketCap}）</span><span>${t.compAdj}</span></div>` : ''}
      ${t.challenge ? `<div><span>🎉 首次過關獎勵</span><span>+${t.challenge}</span></div>` : ''}
      ${t.min ? '<div><span>安慰獎（保底）</span><span>✔</span></div>' : ''}
      <div class="total"><span>🎫 獲得飯票</span><span>+${t.total}</span></div>
      <div><span>目前持有</span><span>🎫 ${FF.Save.data.tickets}</span></div>`;
    // 主按鈕：一般模式「再來一局」；挑戰過關有下一關就「下一關」，不然「再挑戰一次」
    const again = $('btn-again');
    if (ch && ch.next) {
      const nx = FF.CHALLENGES.find(c => c.id === ch.next);
      again.textContent = `下一關：${nx.icon} ${nx.name}`;
      again.dataset.challenge = nx.id;
    } else if (ch) {
      again.textContent = ch.win ? '再玩一次' : '再挑戰一次';
      again.dataset.challenge = ch.id;
    } else {
      again.textContent = '再來一局';
      again.dataset.challenge = '';
    }
    $('btn-res-shop').textContent = ch ? '💝 關卡' : '🛒 商店';
    again.dataset.comp = '';
    FF.UIX.decorateResult(r);
    if (ch) $('btn-duel-send').classList.add('hidden');
    FF.UIX.renderPwaCard();
    show('result');
    $('result').querySelector('.panel').scrollTop = 0;
  }

  // ---------- 分享 ----------
  async function openShare() {
    if (!lastResult) return;
    lastResult.titleName = FF.Progress.titleName();
    let cv;
    // 成績圖預設不放照片；有照片時才出現勾選框
    const photoOk = FF.Photo.active(FF.G.partner());
    $('share-photo-row').classList.toggle('hidden', !photoOk);
    lastResult.sharePhoto = photoOk && $('share-photo').checked;
    try {
      cv = FF.Share.render(lastResult);
    } catch (e) {
      toast('成績圖產生失敗了…');
      return;
    }
    shareBlob = null;
    const img = $('share-img');
    if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
    img.removeAttribute('src');
    show('sharebox');
    // PNG 只編碼一次：同一個 blob 拿來預覽和分享
    sharePromise = FF.Share.toBlob(cv).then(bl => {
      shareBlob = bl;
      if (bl) {
        img.dataset.url = URL.createObjectURL(bl);
        img.src = img.dataset.url;
      } else {
        img.src = cv.toDataURL('image/png');
      }
      return bl;
    });
  }

  async function doShare() {
    if (!shareBlob && sharePromise) await sharePromise; // 圖片還在產生就等一下
    if (!shareBlob) {
      toast('圖片產生失敗了，請長按預覽圖儲存');
      return;
    }
    const res = await FF.Share.share(shareBlob, lastResult);
    if (res === 'shared') toast('分享出去了！');
    else if (res === 'downloaded') toast('📥 成績圖已下載');
    else if (res === 'error') toast('這台裝置不支援分享，請長按圖片儲存');
  }

  function init(appRef) {
    app = appRef;
    const click = (id, fn) =>
      $(id).addEventListener('click', e => {
        FF.Audio.unlock();
        FF.Audio.play('click');
        fn(e);
      });
    click('btn-start', () => app.requestStart());
    click('btn-setup', () => show('setup'));
    click('btn-setup-back', () => show('menu'));
    click('btn-setup-start', () => app.requestStart());
    click('btn-shop', () => show('shop'));
    click('btn-missions', () => show('missions'));
    click('btn-missions-back', () => show('menu'));
    click('btn-missions-start', () => app.requestStart());
    click('btn-achieve', () => show('achieve'));
    click('btn-achieve-back', () => show('menu'));
    click('btn-challenge', () => show('challenges'));
    click('btn-challenge-back', () => show('menu'));
    click('btn-howto', () => { howtoReturn = 'menu'; show('howto'); });
    click('btn-howto-ok', () => {
      if (howtoReturn === 'start') app.startGame(app.pendingOpts);
      else show(howtoReturn);
    });
    click('btn-settings', () => { settingsReturn = 'menu'; show('settings'); });
    click('btn-settings-ok', () => show(settingsReturn));
    // 設定開關（直接處理，不要先播 click 音效：關音效時不該再響）
    const tog = (id, fn) => $(id).addEventListener('click', () => { FF.Audio.unlock(); fn(); });
    tog('set-sfx', toggleSfx);
    tog('pause-sfx', toggleSfx);
    tog('set-music', toggleMusic);
    tog('pause-music', toggleMusic);
    tog('set-vibrate', toggleVibrate);
    tog('pause-vibrate', toggleVibrate);
    click('btn-shop-back', () => show('menu'));
    click('btn-shop-start', () => app.requestStart());
    click('btn-resume', () => app.resume());
    click('btn-pause-howto', () => { howtoReturn = 'pause'; show('howto'); });
    click('btn-quit', () => app.quit());
    click('btn-again', e => {
      const id = e.currentTarget.dataset.challenge;
      const comp = e.currentTarget.dataset.comp;
      if (comp === 'daily') return app.requestStart({ compete: FF.Daily.compOpts() });
      if (comp === 'duel' && FF.UIX.lastComp) return app.requestStart({ compete: { ...FF.UIX.lastComp } });
      app.requestStart(id ? { challenge: id } : {});
    });
    click('btn-res-shop', () => show(lastResult && lastResult.challenge ? 'challenges' : 'shop'));
    click('btn-res-menu', () => show('menu'));
    click('btn-share', () => { $('share-photo').checked = false; openShare(); });
    $('share-photo').addEventListener('change', () => openShare());
    click('btn-share-go', () => doShare());
    click('btn-share-back', () => show('result'));
    FF.UIPanels.init({ $, toast, show, keepScroll, app });
    FF.UIX.init({ toast, show, app });
    FF.UILook.init({ $, toast, show, keepScroll, app });
  }

  return {
    init,
    show,
    showResult,
    toast,
    get current() { return current; },
    setHowtoReturn(v) { howtoReturn = v; },
    // 測試用
    get lastResult() { return lastResult; },
    get shareBlob() { return shareBlob; },
  };
})();
