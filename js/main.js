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

  FF.debug = { timeScale: 1, get game() { return game; } };

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
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  resize();

  const save = FF.Save.load();
  FF.Audio.setMuted(save.muted);

  const app = {
    requestStart() {
      if (!FF.Save.data.seenTutorial) {
        FF.Save.data.seenTutorial = true;
        FF.Save.persist();
        FF.UI.setHowtoReturn('start');
        FF.UI.show('howto');
        return;
      }
      app.startGame();
    },
    startGame() {
      game = new FF.Game(FF.Save.data, {
        onGameOver: res => {
          playing = false;
          FF.UI.showResult(res);
        },
        onPause: () => app.pause(),
      });
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
  FF.UI.show('menu');

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
    if (game.paused || FF.UI.current !== null) return;
    FF.Audio.unlock();
    if (e.code === 'Space') {
      e.preventDefault();
      if (game.player.state === 'carry') game.dodge();
    }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= FF.ITEMS.length) game.useItem(FF.ITEMS[n - 1].id);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) app.pause();
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
    }
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.clearRect(0, 0, C.W, C.H);
    if (game && (playing || FF.UI.current === 'result' || FF.UI.current === 'pause')) {
      FF.Render.drawGame(ctx, game, time);
    } else {
      FF.Render.drawMenuBg(ctx, time);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
