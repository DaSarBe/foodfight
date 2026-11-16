// DOM 介面：主選單、商店、說明、暫停、結算
window.FF = window.FF || {};

FF.UI = (() => {
  const $ = id => document.getElementById(id);
  const screens = ['menu', 'howto', 'shop', 'pause', 'result'];
  let current = 'menu';
  let howtoReturn = 'menu';
  let toastTimer = null;

  function show(name) {
    current = name;
    screens.forEach(s => $(s).classList.toggle('hidden', s !== name));
    if (name === 'menu') renderMenu();
    if (name === 'shop') renderShop();
  }

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 1600);
  }

  function renderMenu() {
    const s = FF.Save.data;
    $('menu-tickets').textContent = s.tickets;
    $('menu-best').innerHTML = s.runs
      ? `🏆 最高分 <b>${s.best.score}</b>　⏱ 最久 <b>${FF.Render.fmtTime(s.best.time)}</b>　🌊 第 <b>${s.best.wave}</b> 波`
      : '第一次來？先看看玩法說明吧！';
    updateMuteButtons();
  }

  function updateMuteButtons() {
    const m = FF.Save.data.muted;
    $('btn-mute').textContent = m ? '🔇' : '🔊';
    $('btn-pause-mute').textContent = m ? '🔇 音效：關' : '🔊 音效：開';
  }

  function toggleMute() {
    const s = FF.Save.data;
    s.muted = !s.muted;
    FF.Audio.setMuted(s.muted);
    FF.Save.persist();
    updateMuteButtons();
    FF.Audio.play('click');
  }

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

  function keepScroll(fn) {
    const body = document.querySelector('.shop-body');
    const y = body.scrollTop;
    fn();
    body.scrollTop = y;
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

  function showResult(r) {
    $('res-title').textContent = r.title;
    $('res-line').textContent = r.line;
    $('res-record').classList.toggle('hidden', !r.newRecord);
    const st = r.stats;
    $('res-stats').innerHTML = `
      <div><span>🏅 分數</span><b>${r.score}</b></div>
      <div><span>⏱ 存活時間</span><b>${FF.Render.fmtTime(r.time)}</b></div>
      <div><span>🌊 撐到第幾波</span><b>${r.wave}</b></div>
      <div><span>✨ 完美夾取</span><b>${st.perfect}</b></div>
      <div><span>🔥 最高連擊</span><b>${st.bestCombo}</b></div>
      <div><span>💨 閃過她的筷子</span><b>${st.dodges}</b></div>
      <div><span>💥 被打掉</span><b>${st.knocked}</b></div>
      <div><span>💗 她吃了幾口</span><b>${st.gfAte}</b></div>`;
    const t = r.tickets;
    $('res-tickets').innerHTML = `
      <div><span>存活時間</span><span>+${t.time}</span></div>
      <div><span>分數</span><span>+${t.score}</span></div>
      <div><span>波次獎勵</span><span>+${t.wave}</span></div>
      ${t.bonus ? `<div><span>飯票加成</span><span>+${t.bonus}</span></div>` : ''}
      ${t.min ? '<div><span>安慰獎（保底）</span><span>✔</span></div>' : ''}
      <div class="total"><span>🎫 獲得飯票</span><span>+${t.total}</span></div>
      <div><span>目前持有</span><span>🎫 ${FF.Save.data.tickets}</span></div>`;
    show('result');
  }

  function init(app) {
    const click = (id, fn) =>
      $(id).addEventListener('click', e => {
        FF.Audio.unlock();
        FF.Audio.play('click');
        fn(e);
      });
    click('btn-start', () => app.requestStart());
    click('btn-shop', () => show('shop'));
    click('btn-howto', () => { howtoReturn = 'menu'; show('howto'); });
    click('btn-howto-ok', () => {
      if (howtoReturn === 'start') app.startGame();
      else show(howtoReturn);
    });
    click('btn-mute', () => toggleMute());
    click('btn-pause-mute', () => toggleMute());
    click('btn-shop-back', () => show('menu'));
    click('btn-shop-start', () => app.requestStart());
    click('btn-resume', () => app.resume());
    click('btn-pause-howto', () => { howtoReturn = 'pause'; show('howto'); });
    click('btn-quit', () => app.quit());
    click('btn-again', () => app.requestStart());
    click('btn-res-shop', () => show('shop'));
    click('btn-res-menu', () => show('menu'));
  }

  return {
    init,
    show,
    showResult,
    toast,
    get current() { return current; },
    setHowtoReturn(v) { howtoReturn = v; },
  };
})();
