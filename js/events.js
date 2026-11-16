// 突發事件：服務員推銷、窗外意外、車子撞進餐廳（掛在 FF.Game 上）
window.FF = window.FF || {};

FF.EVENT_LAYOUT = {
  card: { x: 36, y: 536, w: 468, h: 168 },
  btnNo: { x: 52, y: 650, w: 190, h: 42 },
  btnBuy: { x: 254, y: 650, w: 234, h: 42 },
  escape: { x: 110, y: 610, w: 320, h: 84 },
};

Object.assign(FF.Game.prototype, {
  initEvents() {
    const { rand } = FF.util;
    this.waiter = null;
    this.accident = null;
    this.crash = null;
    this.tableNo = 1;
    this.waiterTimer = rand(28, 40);
    this.accidentTimer = rand(14, 22);
    this.crashTimer = rand(25, 45);
    this.stats.saves = 0;
    this.stats.crashFails = 0;
    this.stats.pitchesBought = 0;
    this.stats.goodDeals = 0;
    this.stats.badBuys = 0;
    this.stats.declines = 0;
  },

  distracted() {
    return this.fx.phone > 0 || this.fx.look > 0;
  },

  cancelStrike() {
    const c = this.player.carry;
    if (c && c.strike && ['pending', 'warn', 'gap'].includes(c.strike.phase)) {
      const combo = c.strike.combo;
      c.strike = null;
      this.gf.state = 'return';
      this.gf.afterSlam = null;
      if (combo && this.ult) this.endUlt('interrupted');
    }
  },

  // 服務員、撞車、女友大絕招彼此不重疊
  busyEvent() {
    return !!(this.waiter || this.crash || this.ult);
  },

  updateEvents(dt) {
    const { rand } = FF.util;
    // 服務員推銷
    if (this.waiter) this.updateWaiter(dt);
    else if (this.t > 20) {
      this.waiterTimer -= dt;
      if (this.waiterTimer <= 0) {
        if (this.busyEvent()) this.waiterTimer = 3;
        else {
          this.startWaiter();
          this.waiterTimer = rand(32, 50);
        }
      }
    }
    // 窗外意外
    if (this.accident) {
      this.accident.t += dt;
      if (this.accident.t > this.accident.life) this.accident = null;
    } else {
      this.accidentTimer -= dt;
      if (this.accidentTimer <= 0) {
        if (this.crash) this.accidentTimer = 3;
        else {
          this.startAccident();
          this.accidentTimer = rand(18, 30);
        }
      }
    }
    // 車子撞進來（第 3 波後）
    if (this.wave >= 3 && !this.crash) {
      this.crashTimer -= dt;
      if (this.crashTimer <= 0) {
        if (this.busyEvent()) this.crashTimer = 4;
        else {
          this.startCrash();
          this.crashTimer = rand(80, 130);
        }
      }
    }
  },

  // ---------- 服務員 ----------
  startWaiter() {
    const v = this.venue;
    const { pick } = FF.util;
    let good = null;
    let text;
    if (Math.random() < 0.35) {
      good = pick((v.goodPitches || []).concat(FF.PITCHES_GOOD));
      text = good.text;
    } else {
      const pool = v.pitches.concat(FF.PITCHES_COMMON);
      text = pick(pool);
      if (this.lastPitch === text) text = pick(pool);
    }
    this.lastPitch = text;
    this.waiter = { phase: 'in', t: 0, text, good, life: 7.5 };
    FF.Audio.play('bell');
  },

  updateWaiter(dt) {
    const w = this.waiter;
    w.t += dt;
    if (w.phase === 'in' && w.t >= 0.45) {
      w.phase = 'pitch';
      w.t = 0;
    } else if (w.phase === 'pitch' && w.t >= w.life) {
      this.waiterLeave(FF.util.pick(FF.WAITER_LINES.leave));
    } else if (w.phase === 'out' && w.t >= 0.45) {
      this.waiter = null;
    }
  },

  waiterLeave(line) {
    this.waiter.phase = 'out';
    this.waiter.t = 0;
    this.waiter.bye = line;
  },

  applyGoodPitch(def) {
    const { pick, rand } = FF.util;
    this.stats.goodDeals++;
    FF.Audio.play('hero');
    this.float(270, 500, `划算！${def.label}`, '#7dffb0', 30, 1.5);
    this.burst(270, 560, 16, ['#ffe066', '#7dffb0', '#fff'], { speed: 260, size: 6, life: 0.6 });
    let line = pick(FF.WAITER_LINES.gfDeal);
    switch (def.effect) {
      case 'rare': {
        const f = this.spawnFood(pick(FF.RARE_FOODS));
        f.t = f.def.raw - 0.6;
        break;
      }
      case 'platter':
        for (let i = 0, n = Math.max(2, Math.min(5, 16 - this.potFoods().length)); i < n; i++) {
          const f = this.spawnFood(this.randomFoodDef(), { quiet: i > 0 });
          f.t = f.def.raw - rand(0.2, 1.2);
        }
        break;
      case 'dessert':
        this.anger = Math.max(0, this.anger - 30);
        line = pick(['哇冰淇淋！你最好了❤️', '你今天怎麼這麼貼心！', '好啦…我原諒你今天所有的搶肉']);
        this.burst(FF.CONFIG.gf.x, FF.CONFIG.gf.y, 6, ['#fff'], { speed: 140, size: 22, life: 1.1, gravity: -40, emoji: '🍦' });
        break;
      case 'chopsticks':
        this.fx.chopsticks = this.fxMax.chopsticks;
        break;
      case 'rice':
        this.sat = Math.min(this.mods.satMax, this.sat + 35);
        break;
      case 'gacha':
        this.fx.phone = 6;
        this.cancelStrike();
        line = pick(['我去轉一下扭蛋！等我！', '扭蛋！我要抽隱藏版！']);
        break;
      case 'item': {
        const it = pick(FF.ITEMS);
        this.save.items[it.id] = Math.min(99, (this.save.items[it.id] || 0) + 1);
        FF.Save.persist();
        this.float(270, 540, `${it.icon} ${it.name} +1`, '#ffe066', 24, 1.5);
        break;
      }
      case 'soup':
        for (const f of this.potFoods()) if (this.stage(f) === 'over') f.t = f.def.raw + 0.05;
        this.fx.soup = this.fxMax.soup;
        break;
    }
    this.say(line, 2.4, true);
  },

  // ---------- 窗外意外 ----------
  startAccident() {
    const { pick, rand } = FF.util;
    const def = pick(this.venue.accidents);
    this.accident = { def, t: 0, life: 4.2, x: rand(420, 480) };
    this.fx.look = this.fxMax.look;
    this.cancelStrike();
    this.say(pick(FF.LOOK_LINES), 2.4, true);
    FF.Audio.play('ooh');
  },

  // ---------- 撞車換桌 ----------
  startCrash() {
    const { pick } = FF.util;
    this.crash = { phase: 'warn', t: 0 };
    this.accident = null;
    if (this.ult) this.endUlt('silent');
    this.fx.look = 0;
    if (this.waiter) this.waiter = null;
    // 夾到一半的食物掉回鍋裡
    const p = this.player;
    if (p.carry) {
      const f = p.carry.food;
      const d = this.randomPotPoint(60);
      f.state = 'pot';
      f.fly = { sx: f.x, sy: f.y, tx: d.x, ty: d.y, t: 0, dur: 0.4 };
      p.carry = null;
    }
    if (p.state !== 'idle') p.state = 'return';
    p.target = null;
    if (['strikeAim', 'strikeWarn', 'slamMiss', 'reach', 'hover'].includes(this.gf.state)) {
      this.gf.state = 'return';
      this.gf.target = null;
    }
    this.say(pick(FF.CRASH_LINES.warn), 2, true);
    FF.Audio.play('screech');
  },

  crashEscapeTime() {
    return Math.max(1.5, 2.6 - 0.1 * (this.wave - 3)) + this.mods.gripWarn;
  },

  updateCrash(dt) {
    const c = this.crash;
    const { pick } = FF.util;
    c.t += dt;
    if (c.phase === 'warn') {
      this.flash = Math.max(this.flash, 0.25 + 0.25 * Math.sin(c.t * 20));
      if (c.t >= 1.3) {
        c.phase = 'escape';
        c.t = 0;
        c.limit = this.crashEscapeTime();
        FF.Audio.play('crash');
        FF.Haptics.vibrate('crash');
        this.shake = 26;
        this.flash = 1;
        this.burst(270, 230, 26, ['#e6f7ff', '#bfe9ff', '#ffffff'], { speed: 520, size: 7, life: 0.9, gravity: 700 });
        this.burst(270, 230, 5, ['#fff'], { speed: 300, size: 30, life: 0.8, emoji: '💥' });
      }
    } else if (c.phase === 'escape') {
      if (c.t >= c.limit) this.resolveCrash(false);
    } else if (c.phase === 'moving') {
      if (!c.applied && c.t >= 0.5) {
        c.applied = true;
        this.applyCrashResult(c.success);
      }
      if (c.t >= 1.1) {
        this.crash = null;
        this.say(pick(c.success ? FF.CRASH_LINES.saved : FF.CRASH_LINES.fail), 2.8, true);
      }
    }
  },

  resolveCrash(success) {
    const c = this.crash;
    c.phase = 'moving';
    c.t = 0;
    c.success = success;
    FF.Audio.play(success ? 'hero' : 'raw');
  },

  applyCrashResult(success) {
    this.tableNo++;
    const B = FF.CONFIG.bowl;
    if (success) {
      this.anger = Math.max(0, this.anger - 18);
      this.score += 50;
      this.stats.saves++;
      this.float(270, 520, '英雄救美！+50', '#ffe066', 34, 1.6);
      this.burst(FF.CONFIG.gf.x, FF.CONFIG.gf.y, 6, ['#fff'], { speed: 140, size: 22, life: 1.1, gravity: -40, emoji: '💕' });
    } else {
      this.anger += 25 * this.mods.angerMul;
      this.sat = Math.max(1, this.sat - 15);
      this.stats.crashFails++;
      // 鍋子被撞翻一半
      const pot = this.potFoods();
      pot.forEach((f, i) => {
        if (i % 2 === 0) f.state = 'gone';
      });
      this.combo = 0;
      this.float(270, 520, '鍋子翻了一半…', '#ff8a8a', 30, 1.6);
      this.float(B.x, B.y - 60, '嚇到肚子痛 -15', '#8fd0ff', 22, 1.4);
    }
  },

  // ---------- 輸入 ----------
  tapEvents(x, y) {
    const L = FF.EVENT_LAYOUT;
    const inR = r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    if (this.crash) {
      if (this.crash.phase === 'escape' && inR(L.escape)) this.resolveCrash(true);
      return true;
    }
    const w = this.waiter;
    if (w && w.phase === 'pitch' && inR(L.card)) {
      if (inR(L.btnNo)) this.waiterDecline();
      else if (inR(L.btnBuy)) this.waiterBuy();
      return true; // 推銷卡擋住的地方點不到鍋子
    }
    return false;
  },

  waiterDecline() {
    const w = this.waiter;
    if (!w || w.phase !== 'pitch') return;
    FF.Audio.play('click');
    this.stats.declines++;
    this.waiterLeave(FF.util.pick(FF.WAITER_LINES.no));
  },

  waiterBuy() {
    const w = this.waiter;
    const { pick } = FF.util;
    if (!w || w.phase !== 'pitch') return;
    FF.Audio.play('coin');
    this.score = Math.max(0, this.score - 30);
    this.stats.pitchesBought++;
    if (!w.good) this.stats.badBuys++;
    if (w.good) {
      this.applyGoodPitch(w.good);
    } else if (Math.random() < 0.3) {
      this.float(270, 520, '買了！-30 分', '#ffd0a0', 26);
      this.anger = Math.max(0, this.anger - 10);
      this.say(pick(FF.WAITER_LINES.gfLike), 2.4, true);
      this.burst(FF.CONFIG.gf.x, FF.CONFIG.gf.y, 4, ['#fff'], { speed: 120, size: 20, life: 1, gravity: -40, emoji: '💗' });
    } else {
      this.float(270, 520, '買了！-30 分', '#ffd0a0', 26);
      this.anger += 6 * this.mods.angerMul;
      this.say(pick(FF.WAITER_LINES.gfHate), 2.4, true);
    }
    this.waiterLeave(pick(FF.WAITER_LINES.buy));
  },
});
