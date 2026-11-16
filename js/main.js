// 進入點：畫布縮放、輸入、主迴圈、畫面切換
(() => {
  const C = FF.CONFIG;
  const gameEl = document.getElementById('game');
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  let scale = 1;
  let dpr = 1;
  let game = null;
  let playing = false;
  let edgeTimer = 0;

  FF.debug = { timeScale: 1, get game() { return game; }, cloudMock: () => FF.Cloud.enableMock() };

  function resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    scale = Math.min(vw / C.W, vh / C.H);
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.floor(C.W * scale);
    const h = Math.floor(C.H * scale);
    gameEl.style.width = w + 'px';
    gameEl.style.height = h + 'px';
    gameEl.style.fontSize = 16 * scale + 'px';
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    // 比 9:16 還瘦長的螢幕，上下會留邊：讓邊條顏色跟畫面上緣/下緣銜接
    document.body.classList.toggle('tall', vh - h > 4);
    edgeTimer = 0;
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  resize();

  const save = FF.Save.load();
  FF.Audio.setMuted(save.muted);
  FF.Music.setEnabled(save.music);
  FF.Haptics.setEnabled(save.vibrate);
  FF.Progress.ensureDaily();

  const app = {
    pendingOpts: {},
    // opts：{ challenge: 關卡 id }，沒有就是一般模式（場地、她的模式、鍋底沿用上次的選擇）
    requestStart(opts = {}) {
      app.pendingOpts = opts;
      if (!FF.Save.data.seenTutorial) {
        FF.Save.data.seenTutorial = true;
        FF.Save.persist();
        FF.UI.setHowtoReturn('start');
        FF.UI.show('howto');
        return;
      }
      app.startGame(opts);
    },
    startGame(opts = {}) {
      // 競技模式（對決、每日同題）：種子、配置由戰帖或日期決定；對決的對象性別以戰帖為準（只限這局）
      const comp = opts.compete || null;
      FF.G.setOverride(comp && comp.kind === 'duel' ? comp.partner : null);
      if (comp) FF.UIX.lastComp = { ...comp };
      game = new FF.Game(FF.Save.data, {
        onGameOver: res => {
          playing = false;
          FF.UI.showResult(res);
          FF.Cloud.autoSync();
        },
        onPause: () => app.pause(),
      }, { ...opts, compete: comp, seed: comp ? comp.seed : opts.seed });
      playing = true;
      FF.UI.show(null);
    },
    pause() {
      if (!game || !playing || game.over) return;
      game.paused = true;
      FF.UI.show('pause');
    },
    resume() {
      if (!game) return;
      game.paused = false;
      FF.UI.show(null);
    },
    quit() {
      if (!game) return;
      game.paused = false;
      game.end('quit');
      FF.UI.show(null);
    },
  };
  FF.app = app;
  FF.UI.init(app);
  FF.G.start();
  FF.UI.show('menu');
  FF.PWA.register();
  FF.Cloud.boot();
  FF.UIX.handleUrlDuel();

  // 輸入
  function toLogical(e) {
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * C.W, y: ((e.clientY - r.top) / r.height) * C.H };
  }
  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    FF.Audio.unlock();
    if (!game || !playing || FF.UI.current !== null) return;
    const p = toLogical(e);
    game.tap(p.x, p.y);
  });
  cv.addEventListener('contextmenu', e => e.preventDefault());

  window.addEventListener('keydown', e => {
    if (!game || !playing) return;
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (game.paused) app.resume();
      else app.pause();
      return;
    }
    if (game.paused || FF.UI.current !== null || game.over) return;
    FF.Audio.unlock();
    const k = e.key.toLowerCase();
    if (e.code === 'Space' || e.key === 'Enter') e.preventDefault();
    if (e.repeat) return;
    // 撞車：空白鍵或 Enter 帶她換桌
    if (game.crash) {
      if ((e.code === 'Space' || e.key === 'Enter') && game.crash.phase === 'escape') game.resolveCrash(true);
      return;
    }
    // 服務員推銷：N 拒絕、B 購買
    if (game.waiter && game.waiter.phase === 'pitch') {
      if (k === 'n') return game.waiterDecline();
      if (k === 'b') return game.waiterBuy();
    }
    if (e.code === 'Space') {
      if (game.player.state === 'carry') game.dodge();
    }
    if (k === 'f') game.feed();
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= FF.ITEMS.length) game.useItem(FF.ITEMS[n - 1].id);
  });

  // 任何互動都可以啟動音訊（瀏覽器規定 AudioContext 要在使用者互動後才能開始）
  document.addEventListener('pointerdown', () => FF.Audio.unlock());

  // 分頁隱藏：暫停遊戲、停掉音樂與音效；回來時恢復音訊（遊戲維持暫停）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) app.pause();
    FF.Audio.setHidden(document.hidden);
    FF.Music.setHidden(document.hidden);
  });

  // 主迴圈
  let last = performance.now();
  let time = 0;
  function frame(now) {
    let dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    if (game && playing) {
      let total = dt * FF.debug.timeScale;
      while (total > 0) {
        const step = Math.min(0.05, total);
        game.update(step);
        total -= step;
      }
      // 背景音樂：波數越高越快；怒氣很高、撞車、大絕招時轉緊張
      FF.Music.setIntensity(game.wave, !game.over && (game.anger >= 80 || !!game.crash || !!game.ult));
    }
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.clearRect(0, 0, C.W, C.H);
    const cur = FF.UI.current;
    if (game && (playing || cur === 'result' || cur === 'pause' || cur === 'sharebox' || (cur === 'howto' && game.paused) || (cur === 'settings' && game.paused))) {
      FF.Render.drawGame(ctx, game, time);
    } else {
      FF.Render.drawMenuBg(ctx, time);
    }
    edgeTimer -= dt;
    if (edgeTimer <= 0) {
      edgeTimer = 1;
      updateEdges();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // 取樣畫面最上排與最下排的顏色，設定給上下邊條（只在瘦長螢幕有作用）
  const OVERLAY = [40, 15, 5, 0.55]; // .screen 的半透明底色
  // 先把 1 個像素畫到小畫布再讀，避免主畫布頻繁 readback
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  function sampleRow(y) {
    try {
      pctx.clearRect(0, 0, 1, 1);
      pctx.drawImage(cv, Math.floor(cv.width / 2), y, 1, 1, 0, 0, 1, 1);
      const d = pctx.getImageData(0, 0, 1, 1).data;
      if (d[3] < 250) return null; // 震動中露出透明邊，略過這次
      let c = [d[0], d[1], d[2]];
      if (FF.UI.current !== null) c = c.map((v, i) => Math.round(v * (1 - OVERLAY[3]) + OVERLAY[i] * OVERLAY[3]));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    } catch (e) {
      return null;
    }
  }
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  function updateEdges() {
    if (!document.body.classList.contains('tall')) return;
    const top = sampleRow(0);
    const bottom = sampleRow(cv.height - 1);
    const st = document.body.style;
    if (top) {
      st.setProperty('--edge-top', top);
      if (themeMeta) themeMeta.setAttribute('content', top);
    }
    if (bottom) st.setProperty('--edge-bottom', bottom);
  }
})();
