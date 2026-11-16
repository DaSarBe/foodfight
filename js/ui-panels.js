// DOM 介面（新功能的頁面）：開局準備（她的模式／鍋底／場地）、每日任務、成就、紀念日挑戰
window.FF = window.FF || {};

FF.UIPanels = (() => {
  let H = null; // ui.js 傳進來的共用工具：$、toast、show、keepScroll、app
  let setupTab = 'gf';

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 選單裡的動作（解鎖、領任務）也可能解鎖成就：比對前後，跳提示
  function achWatch() {
    const before = FF.Save.data.achievements.length;
    return () => {
      FF.Progress.recheck();
      const got = FF.Save.data.achievements.slice(before).map(id => FF.ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean);
      if (got.length) {
        setTimeout(() => {
          H.toast(`🏆 成就解鎖：${got.map(a => a.name).join('、')}${got.some(a => a.reward) ? `（🎫 +${got.reduce((n, a) => n + a.reward, 0)}）` : ''}`);
          FF.Audio.play('rare');
        }, 900);
      }
    };
  }

  function row(cls, html, onClick) {
    const el = document.createElement('div');
    el.className = 'row ' + cls;
    el.innerHTML = html;
    if (onClick) el.addEventListener('click', onClick);
    return el;
  }

  // ---------- 開局準備 ----------
  const TIPS = {
    who: '你的對象是女朋友還是男朋友？你自己又是誰？選好之後，所有台詞、外觀和稱呼都會跟著換。',
    gf: '她今天是哪種模式？每種打法都不一樣，選一個最拿手的！',
    broth: '鍋底會改變食物熟的速度和分數。新手推薦牛奶鍋！',
    venue: '撐到越後面的波數，就能解鎖新場地。越難搞的場地，飯票加成越高！',
  };

  function renderSetup(tab) {
    if (tab) setupTab = tab;
    const { $ } = H;
    const s = FF.Save.data;
    $('setup-tickets').textContent = s.tickets;
    document.querySelectorAll('#setup .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === setupTab));
    $('setup-tip').textContent = TIPS[setupTab];
    const list = $('setup-list');
    list.innerHTML = '';
    if (setupTab === 'who') FF.UIX.renderWho(list);
    else if (setupTab === 'gf') FF.PERSONAS.forEach(p => list.appendChild(personaRow(p)));
    else if (setupTab === 'broth') FF.BROTHS.forEach(b => list.appendChild(brothRow(b)));
    else FF.VENUES.forEach(v => list.appendChild(venueRow(v)));
  }

  function select(field, id, label) {
    FF.Audio.play('click');
    FF.Save.data[field] = id;
    FF.Save.persist();
    H.toast(`已選擇 ${label}`);
    H.keepScroll(renderSetup);
  }

  function personaRow(p) {
    const s = FF.Save.data;
    const st = FF.Progress.personaStatus(p);
    const sel = st.owned && s.gfType === p.id;
    let right;
    let condLine = '';
    if (st.owned) right = `<div class="pick">${sel ? '✅ 今天的她' : '選這個'}</div>`;
    else {
      right = `<div class="unlock-btns">
        ${st.condMet ? '<button class="buy free" data-act="cond">免費解鎖</button>' : ''}
        <button class="buy" data-act="buy" ${s.tickets < st.price ? 'disabled' : ''}>🎫 ${st.price}</button></div>`;
      if (st.cond) condLine = `<div class="desc cond">🔓 或 ${st.cond.text}（${Math.min(st.have, st.cond.n)}/${st.cond.n}）</div>`;
    }
    const el = row('venue' + (sel ? ' selected' : '') + (st.owned ? '' : ' locked-soft'), `
      <div class="ic">${p.icon}</div>
      <div class="info">
        <div class="name">${p.name} ${p.ticketBonus ? `<span class="own">飯票 +${Math.round(p.ticketBonus * 100)}%</span>` : ''}</div>
        <div class="desc">${p.desc}</div>
        <div class="desc tip">💡 ${p.tip}</div>
        ${condLine}
      </div>${right}`);
    if (st.owned) el.addEventListener('click', () => select('gfType', p.id, `${p.icon} ${p.name}`));
    el.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const done = achWatch();
      if (FF.Progress.unlockPersona(p.id, b.dataset.act)) {
        done();
        FF.Audio.play('coin');
        s.gfType = p.id;
        FF.Save.persist();
        H.toast(`🎉 解鎖「${p.name}」！`);
        H.keepScroll(renderSetup);
      } else FF.Audio.play('error');
    }));
    return el;
  }

  function brothRow(b) {
    const s = FF.Save.data;
    const owned = s.unlockedBroth.includes(b.id);
    const sel = owned && s.broth === b.id;
    const price = (b.unlock && b.unlock.price) || 0;
    const scoreTag = b.score !== 1 ? `<span class="own">分數 ${b.score > 1 ? '+' : ''}${Math.round((b.score - 1) * 100)}%</span>` : '';
    const right = owned
      ? `<div class="pick">${sel ? '✅ 使用中' : '選這個'}</div>`
      : `<button class="buy" ${s.tickets < price ? 'disabled' : ''}>🎫 ${price}</button>`;
    const el = row('venue' + (sel ? ' selected' : '') + (owned ? '' : ' locked-soft'), `
      <div class="ic">${b.icon}</div>
      <div class="info">
        <div class="name">${b.name} ${scoreTag}</div>
        <div class="desc">${b.desc}</div>
      </div>${right}`);
    if (owned) el.addEventListener('click', () => select('broth', b.id, `${b.icon} ${b.name}`));
    else {
      el.querySelector('.buy').addEventListener('click', e => {
        e.stopPropagation();
        if (FF.Progress.unlockBroth(b.id)) {
          FF.Audio.play('coin');
          s.broth = b.id;
          FF.Save.persist();
          H.toast(`🎉 解鎖「${b.name}」！`);
          H.keepScroll(renderSetup);
        } else FF.Audio.play('error');
      });
    }
    return el;
  }

  function venueRow(v) {
    const s = FF.Save.data;
    const open = s.best.wave >= v.unlockWave;
    const sel = s.venue === v.id;
    const el = row('venue' + (sel ? ' selected' : '') + (open ? '' : ' locked'), `
      <div class="ic">${open ? v.icon : '🔒'}</div>
      <div class="info">
        <div class="name">${v.name} ${v.bonus ? `<span class="own">飯票 +${Math.round(v.bonus * 100)}%</span>` : ''}</div>
        <div class="desc">${open ? v.desc : `最高撐到第 ${v.unlockWave} 波解鎖（目前第 ${s.best.wave} 波）`}</div>
        ${open ? `<div class="desc">撞進來的是：${v.vehicle.emoji} ${v.vehicle.name}</div>` : ''}
      </div>
      <div class="pick">${sel ? '✅ 使用中' : open ? '選這裡' : ''}</div>`);
    if (open) el.addEventListener('click', () => select('venue', v.id, `${v.icon} ${v.name}`));
    return el;
  }

  // ---------- 每日任務 ----------
  function renderMissions() {
    const { $ } = H;
    const s = FF.Save.data;
    FF.Progress.ensureDaily();
    $('missions-tickets').textContent = s.tickets;
    const list = $('missions-list');
    list.innerHTML = '';
    s.daily.list.forEach((m, i) => {
      const def = FF.Progress.missionDef(m.id);
      const done = m.progress >= m.target;
      const pct = Math.round((Math.min(m.progress, m.target) / m.target) * 100);
      const btn = m.claimed
        ? '<div class="pick done">✅ 已領取</div>'
        : `<button class="buy" ${done ? '' : 'disabled'}>${done ? '領取' : ''} 🎫 ${def.reward}</button>`;
      const el = row('mission' + (done ? ' complete' : ''), `
        <div class="ic">${def.icon}</div>
        <div class="info">
          <div class="name">${esc(def.text(m.target))}</div>
          <div class="desc">${def.single ? '<span class="tag">單局</span>' : '<span class="tag sum">可跨局累計</span>'}　進度 ${Math.min(m.progress, m.target)} / ${m.target}</div>
          <div class="pbar"><i style="width:${pct}%"></i></div>
        </div>${btn}`);
      const b = el.querySelector('button.buy');
      if (b) b.addEventListener('click', () => {
        const done = achWatch();
        const got = FF.Progress.claimMission(i);
        if (got) {
          FF.Audio.play('coin');
          H.toast(`領到 🎫 ${got}！`);
          done();
          H.keepScroll(renderMissions);
        } else FF.Audio.play('error');
      });
      list.appendChild(el);
    });
    const allDone = s.daily.list.every(m => m.progress >= m.target);
    const bonus = row('mission bonus' + (allDone ? ' complete' : ''), `
      <div class="ic">🎁</div>
      <div class="info">
        <div class="name">三個任務都完成</div>
        <div class="desc">今日全勤獎：她說今天的你特別乖</div>
      </div>
      ${s.daily.bonus ? '<div class="pick done">✅ 已領取</div>' : `<button class="buy" ${allDone ? '' : 'disabled'}>${allDone ? '領取' : ''} 🎫 ${FF.MISSION_BONUS}</button>`}`);
    const bb = bonus.querySelector('button.buy');
    if (bb) bb.addEventListener('click', () => {
      const got = FF.Progress.claimBonus();
      if (got) {
        FF.Audio.play('hero');
        H.toast(`全勤獎 🎫 ${got}！`);
        H.keepScroll(renderMissions);
      } else FF.Audio.play('error');
    });
    list.appendChild(bonus);
    // 距離換新任務
    const now = new Date();
    const mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const mins = Math.max(0, Math.round((mid - now) / 60000));
    $('missions-tip').textContent = `每天換 3 個新任務，進度跨局累計。還有 ${Math.floor(mins / 60)} 小時 ${mins % 60} 分換新任務。`;
  }

  // ---------- 成就 ----------
  function renderAchieve() {
    const { $ } = H;
    const s = FF.Save.data;
    $('achieve-count').textContent = `${s.achievements.length}/${FF.ACHIEVEMENTS.length}`;
    $('achieve-title').textContent = FF.Progress.titleName();
    const list = $('achieve-list');
    list.innerHTML = '';
    const L = FF.Progress.combinedLife(null);
    // 預設稱號
    const def = row('ach' + (!s.title ? ' selected' : ''), `
      <div class="ic">🐣</div>
      <div class="info"><div class="name">預設稱號</div><div class="desc">稱號：「${FF.DEFAULT_TITLE}」</div></div>
      ${!s.title ? '<div class="pick">✅ 使用中</div>' : '<button class="buy equip">裝備</button>'}`);
    const db = def.querySelector('.equip');
    if (db) db.addEventListener('click', () => { FF.Progress.equipTitle(''); FF.Audio.play('click'); H.keepScroll(renderAchieve); });
    list.appendChild(def);
    const sorted = FF.ACHIEVEMENTS.slice().sort((a, b) => s.achievements.includes(b.id) - s.achievements.includes(a.id));
    for (const a of sorted) {
      const got = s.achievements.includes(a.id);
      const using = s.title === a.id;
      const right = got
        ? (using ? '<div class="pick">✅ 使用中</div>' : '<button class="buy equip">裝備</button>')
        : `<div class="pick lock">${a.reward ? `🎫 ${a.reward}` : '🔒'}</div>`;
      const el = row('ach' + (got ? ' got' : ' locked-soft') + (using ? ' selected' : ''), `
        <div class="ic">${a.icon}</div>
        <div class="info">
          <div class="name">${a.name}</div>
          <div class="desc">${a.desc}${got ? '' : progressHint(a, L)}</div>
          <div class="desc tip">🏷️ 稱號「${a.title}」${a.reward ? `・${got ? '已領' : '獎勵'} 🎫 ${a.reward}` : ''}</div>
        </div>${right}`);
      const eb = el.querySelector('.equip');
      if (eb) eb.addEventListener('click', () => {
        FF.Progress.equipTitle(a.id);
        FF.Audio.play('coin');
        H.toast(`已裝備稱號「${a.title}」`);
        H.keepScroll(renderAchieve);
      });
      list.appendChild(el);
    }
  }

  // 成就進度提示：從描述裡的數字猜目標（只是顯示用）
  const HINT_STAT = {
    wingchun: 'dodges', sucker: 'badBuys', seafood: 'rareEaten', sanbao: 'saves', spoon: 'fed', simp: 'maxFedRun', butter: 'knocked',
    master: 'bestCombo', bottomless: 'eaten', gastro: 'raw', coldwar: 'angerEnds', gentleman: 'hungerEnds', counter: 'ultCleared',
    bargain: 'goodDeals', timemgmt: 'bestTime', surfer: 'bestWave', bandit: 'steals', checkin: 'missionsDone', tycoon: 'ticketsEarned',
    nosurvive: 'fedRaw', lifer: 'playTime',
  };
  function progressHint(a, L) {
    const k = HINT_STAT[a.id];
    if (!k) {
      if (a.id === 'manual') return `（${L.gfUnlocked}/${FF.PERSONAS.length}）`;
      if (a.id === 'sommelier') return `（${L.broths.length}/${FF.BROTHS.length}）`;
      if (a.id === 'roadtrip') return `（${L.venues.length}/${FF.VENUES.length}）`;
      if (a.id === 'anniv') return `（${L.challengesCleared}/${FF.CHALLENGES.length}）`;
      return '';
    }
    const m = a.desc.match(/(\d+)/);
    let target = m ? +m[1] : 0;
    let have = L[k] || 0;
    if (k === 'bestTime') target = 300;
    if (k === 'playTime') { target = 60; have = Math.floor(have / 60); }
    return target ? `（${Math.min(have, target)}/${target}）` : '';
  }

  // ---------- 紀念日挑戰 ----------
  function renderChallenges() {
    const { $ } = H;
    const s = FF.Save.data;
    $('challenge-tickets').textContent = s.tickets;
    const list = $('challenge-list');
    list.innerHTML = '';
    FF.CHALLENGES.forEach((c, i) => {
      const open = FF.Progress.challengeOpen(i);
      const cleared = s.challenges.cleared.includes(c.id);
      const right = open ? `<button class="buy go">${cleared ? '再玩' : '挑戰'}</button>` : '<div class="pick lock">🔒</div>';
      const el = row('challenge' + (cleared ? ' cleared' : '') + (open ? '' : ' locked'), `
        <div class="ic">${open ? c.icon : '🔒'}</div>
        <div class="info">
          <div class="name">第 ${i + 1} 關　${c.name} ${cleared ? '<span class="own ok">✅ 已過關</span>' : `<span class="own">首次過關 🎫 ${c.reward}</span>`}</div>
          ${open ? `<div class="desc">${c.story}</div>
          <div class="desc rule">⚠️ ${c.rule}</div>
          <div class="desc goal">🎯 ${c.goalText}</div>` : `<div class="desc">先通過「${FF.CHALLENGES[i - 1].name}」才能挑戰</div>`}
        </div>${right}`);
      const b = el.querySelector('.go');
      if (b) b.addEventListener('click', () => {
        FF.Audio.unlock();
        FF.Audio.play('click');
        H.app.requestStart({ challenge: c.id });
      });
      list.appendChild(el);
    });
  }

  function init(helpers) {
    H = helpers;
    document.querySelectorAll('#setup .tab').forEach(b => b.addEventListener('click', () => {
      FF.Audio.unlock();
      FF.Audio.play('click');
      renderSetup(b.dataset.tab);
      H.$('setup-list').scrollTop = 0;
    }));
  }

  return { init, renderSetup, renderMissions, renderAchieve, renderChallenges };
})();
