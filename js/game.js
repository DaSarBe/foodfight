// 遊戲核心邏輯：一局的狀態與更新
window.FF = window.FF || {};

FF.LAYOUT = {
  items: FF.ITEMS.map((it, i) => ({ id: it.id, x: 120 + i * 100, y: 912, r: 32 })),
  pause: { x: 32, y: 28, r: 22 },
};

FF.util = {
  rand: (a, b) => a + Math.random() * (b - a),
  pick: arr => arr[Math.floor(Math.random() * arr.length)],
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  ease: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

FF.Game = class Game {
  constructor(save, hooks) {
    const C = FF.CONFIG;
    const { pick } = FF.util;
    this.save = save;
    this.hooks = hooks || {};
    const up = save.upgrades;
    this.mods = {
      speed: 1 + 0.12 * up.speed,
      hit: C.baseHitRadius + 7 * up.reach,
      satMax: C.baseSatMax + 15 * up.stomach,
      angerMul: 1 - 0.08 * up.patience,
      gripWarn: 0.05 * up.grip,
      gripChance: 0.03 * up.grip,
      ticketMul: 1 + 0.1 * up.greedy,
    };
    this.t = 0;
    this.score = 0;
    this.sat = this.mods.satMax * C.startSatRatio;
    this.anger = 10;
    this.combo = 0;
    this.wave = 1;
    this.foods = [];
    this.nextId = 1;
    this.spawnTimer = 0.4;
    this.player = { state: 'idle', tip: { ...C.playerRest }, target: null, carry: null };
    this.gf = { state: 'idle', tip: { x: 375, y: 245 }, timer: 2.2, target: null, food: null, prog: 0, chew: 0 };
    this.fx = { chopsticks: 0, soup: 0, phone: 0, spicy: 0, steam: 0, look: 0 };
    this.fxMax = { chopsticks: 5, soup: 8, phone: 5, spicy: 9, steam: 6, look: 3.5 };
    this.claim = null;
    this.eventTimer = 16;
    this.floaters = [];
    this.particles = [];
    this.shake = 0;
    this.flash = 0;
    this.bubble = null;
    this.banner = null;
    this.hintTimer = 6;
    this.favorite = pick(FF.FOODS);
    this.venue = FF.VENUES.find(v => v.id === save.venue) || FF.VENUES[0];
    this.stats = { eaten: 0, perfect: 0, raw: 0, dodges: 0, knocked: 0, gfAte: 0, steals: 0, bestCombo: 0 };
    this.strikesSeen = 0;
    this.firstStrikeDone = false;
    this.firstStrikeAt = 8;
    this.itemCd = 0;
    this.paused = false;
    this.over = false;
    this.overTimer = 0;
    this.result = null;
    this.bowl = [];
    this.bowlBounce = 0;
    this.lastTap = null;
    this.dodgeStreak = 0;
    this.slowmo = 0;
    this.dodgeFlash = 0;
    this.shockwaves = [];
    this.initEvents();

    // 開局先放幾樣食物，熟度錯開
    for (let i = 0; i < 4; i++) this.spawnFood(this.randomFoodDef(), { t: i * 0.7, quiet: true });
    this.say(pick(FF.LINES.start), 3, true);
    this.showBanner('第 1 波', '搶在她之前，夾到「剛好」的食物！');
  }

  // ---------- 工具 ----------
  randomFoodDef() {
    const total = FF.FOODS.reduce((s, f) => s + f.weight, 0);
    let r = Math.random() * total;
    for (const f of FF.FOODS) {
      r -= f.weight;
      if (r <= 0) return f;
    }
    return FF.FOODS[0];
  }

  randomPotPoint(margin = 45) {
    const P = FF.CONFIG.pot;
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * (P.r - margin);
    return { x: P.x + Math.cos(a) * r, y: P.y + Math.sin(a) * r };
  }

  potFoods() {
    return this.foods.filter(f => f.state === 'pot');
  }

  stage(f) {
    const d = f.def;
    if (f.t < d.raw) return 'raw';
    if (f.t < d.raw + d.perfect) return 'perfect';
    if (f.t < d.raw + d.perfect + d.over) return 'over';
    return 'gone';
  }

  // 目前階段的進度 0..1
  stageFrac(f) {
    const d = f.def;
    if (f.t < d.raw) return f.t / d.raw;
    if (f.t < d.raw + d.perfect) return (f.t - d.raw) / d.perfect;
    return Math.min(1, (f.t - d.raw - d.perfect) / d.over);
  }

  say(text, dur = 2.4, force = false) {
    if (!force && this.bubble && this.bubble.timer > 0.9) return;
    this.bubble = { text, timer: dur, max: dur };
  }

  float(x, y, text, color = '#fff', size = 26, life = 1.0) {
    this.floaters.push({ x, y, text, color, size, t: 0, life });
  }

  burst(x, y, n, colors, { speed = 220, size = 6, life = 0.6, gravity = 400, emoji = null } = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - speed * 0.3,
        life: life * (0.6 + Math.random() * 0.6),
        t: 0,
        size: size * (0.6 + Math.random() * 0.8),
        color: FF.util.pick(colors),
        gravity,
        emoji,
      });
    }
  }

  showBanner(title, sub) {
    this.banner = { title, sub, t: 0, life: 2.4 };
  }

  spawnFood(def, opts = {}) {
    const p = this.randomPotPoint(def.rare ? 70 : 45);
    const { rand } = FF.util;
    const f = {
      id: this.nextId++,
      def,
      x: p.x,
      y: p.y,
      vx: rand(-16, 16),
      vy: rand(-16, 16),
      t: opts.t || 0,
      state: 'pot',
      phase: Math.random() * 6.28,
      pop: 0.35,
      rot: rand(-0.3, 0.3),
      fly: null,
    };
    this.foods.push(f);
    if (!opts.quiet) {
      this.burst(f.x, f.y, 8, ['#ffd18a', '#fff3d6', '#f7b55e'], { speed: 140, size: 5, life: 0.45 });
      FF.Audio.play('splash');
    }
    return f;
  }

  // ---------- 主更新 ----------
  update(dt) {
    if (this.paused) return;
    if (this.slowmo > 0) {
      this.slowmo -= dt;
      dt *= 0.3;
    }
    if (this.over) {
      this.updateFx(dt);
      this.overTimer -= dt;
      if (this.overTimer <= 0 && !this.reported) {
        this.reported = true;
        this.hooks.onGameOver && this.hooks.onGameOver(this.result);
      }
      return;
    }
    if (this.crash) {
      this.updateCrash(dt);
      this.updateFx(dt);
      return;
    }
    const C = FF.CONFIG;
    const D = FF.DIFF;
    const { rand, clamp } = FF.util;

    this.t += dt;
    const w = D.wave(this.t);
    if (w !== this.wave) {
      this.wave = w;
      this.onNewWave();
    }

    for (const k in this.fx) this.fx[k] = Math.max(0, this.fx[k] - dt);
    this.itemCd -= dt;

    // 飽足感與怒氣
    const warmup = this.t < 5 ? 0.3 : 1;
    this.sat -= D.satDrain(w) * dt * warmup;
    this.anger = Math.max(0, this.anger - D.angerDecay(w) * dt);

    // 下鍋
    this.spawnTimer -= dt;
    const inPot = this.potFoods().length;
    const maxFoods = C.maxFoods + (w >= 4 ? 2 : 0);
    if (this.spawnTimer <= 0 && inPot < maxFoods) {
      this.spawnFood(this.randomFoodDef());
      const fast = inPot < 3 ? 0.5 : 1;
      this.spawnTimer = D.spawnInterval(w) * rand(0.7, 1.3) * fast;
    }

    // 煮與漂動
    const cookMul = (this.fx.spicy > 0 ? 1.8 : 1) * (this.fx.soup > 0 ? 0.5 : 1);
    this.updateFoods(dt, cookMul);

    // 指定食物
    if (this.claim) {
      this.claim.timer -= dt;
      const cf = this.foods.find(f => f.id === this.claim.id);
      if (this.claim.timer <= 0 || !cf || cf.state === 'gone') this.claim = null;
    }

    // 干擾事件
    if (w >= 2) {
      this.eventTimer -= dt;
      if (this.eventTimer <= 0) {
        this.triggerEvent();
        this.eventTimer = D.eventInterval(w) * rand(0.8, 1.2);
      }
    }

    this.updatePlayer(dt);
    this.updateGF(dt);
    this.updateEvents(dt);

    this.foods = this.foods.filter(f => f.state !== 'gone');

    // 提示台詞
    this.hintTimer -= dt;
    if (this.hintTimer <= 0) {
      this.hintTimer = 6;
      if (this.anger > 70) this.say(FF.util.pick(FF.LINES.angry), 2.4, true);
      else if (this.sat < this.mods.satMax * 0.25) this.say(FF.util.pick(FF.LINES.hungry));
    }

    this.updateFx(dt);

    this.anger = clamp(this.anger, 0, 100);
    if (this.anger >= 100) this.end('anger');
    else if (this.sat <= 0) {
      this.sat = 0;
      this.end('hunger');
    }
  }

  updateFx(dt) {
    for (const p of this.particles) {
      p.t += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter(p => p.t < p.life);
    for (const f of this.floaters) f.t += dt;
    this.floaters = this.floaters.filter(f => f.t < f.life);
    if (this.bubble) {
      this.bubble.timer -= dt;
      if (this.bubble.timer <= 0) this.bubble = null;
    }
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > this.banner.life) this.banner = null;
    }
    this.shake = Math.max(0, this.shake - dt * 40);
    this.flash = Math.max(0, this.flash - dt * 3);
    this.dodgeFlash = Math.max(0, this.dodgeFlash - dt * 4);
    if (this.gf.pout > 0) this.gf.pout -= dt;
    for (const w of this.shockwaves) w.t += dt;
    this.shockwaves = this.shockwaves.filter(w => w.t < 0.35);
    this.bowlBounce = Math.max(0, this.bowlBounce - dt * 4);
    for (const f of this.foods) f.pop = Math.max(0, f.pop - dt);
  }

  updateFoods(dt, cookMul) {
    const P = FF.CONFIG.pot;
    const pot = this.potFoods();
    for (const f of pot) {
      if (f.fly) {
        f.fly.t += dt;
        const k = Math.min(1, f.fly.t / f.fly.dur);
        f.x = FF.util.lerp(f.fly.sx, f.fly.tx, k);
        f.y = FF.util.lerp(f.fly.sy, f.fly.ty, k) - Math.sin(Math.PI * k) * 90;
        if (k >= 1) {
          f.fly = null;
          this.burst(f.x, f.y, 10, ['#ffd18a', '#fff3d6'], { speed: 160, size: 5, life: 0.4 });
          FF.Audio.play('splash');
        }
        continue;
      }
      f.t += dt * cookMul;
      if (this.stage(f) === 'gone') {
        f.state = 'gone';
        this.burst(f.x, f.y, 6, ['#777', '#999', '#555'], { speed: 60, size: 9, life: 0.7, gravity: -80 });
        if (this.claim && this.claim.id === f.id) this.claim = null;
        continue;
      }
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot += f.vx * 0.0006;
      const dx = f.x - P.x;
      const dy = f.y - P.y;
      const d = Math.hypot(dx, dy);
      const lim = P.r - 34;
      if (d > lim) {
        const nx = dx / d;
        const ny = dy / d;
        f.x = P.x + nx * lim;
        f.y = P.y + ny * lim;
        const dot = f.vx * nx + f.vy * ny;
        f.vx -= 2 * dot * nx;
        f.vy -= 2 * dot * ny;
      }
    }
    // 互相推開，避免疊在一起
    for (let i = 0; i < pot.length; i++) {
      for (let j = i + 1; j < pot.length; j++) {
        const a = pot[i];
        const b = pot[j];
        if (a.fly || b.fly) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 50) {
          const push = (50 - d) * 0.5 * Math.min(1, dt * 8);
          a.x -= (dx / d) * push;
          a.y -= (dy / d) * push;
          b.x += (dx / d) * push;
          b.y += (dy / d) * push;
        }
      }
    }
  }

  onNewWave() {
    const { pick } = FF.util;
    const w = this.wave;
    FF.Audio.play('wave');
    const rare = pick(FF.RARE_FOODS);
    this.spawnFood(rare);
    setTimeout(() => FF.Audio.play('rare'), 300);
    const subs = {
      2: '她開始會「指定」食物了',
      3: '小心假動作、蒸氣和辣鍋！',
    };
    const sub = (subs[w] || '她的手越來越快了！') + `\n${rare.emoji} ${rare.name}下鍋了！`;
    this.showBanner(`第 ${w} 波`, sub);
    this.say(pick(FF.LINES.rare), 2.4, true);
  }

  triggerEvent() {
    const { pick } = FF.util;
    const opts = ['claim'];
    if (this.wave >= 3) opts.push('steam', 'spicy', 'claim');
    let ev = pick(opts);
    if (ev === 'steam' && this.fx.steam > 0) ev = 'claim';
    if (ev === 'spicy' && this.fx.spicy > 0) ev = 'claim';
    if (ev === 'claim') {
      if (this.claim) return;
      const cands = this.potFoods().filter(f => !f.fly && this.stage(f) !== 'over');
      if (!cands.length) return;
      cands.sort((a, b) => (b.def.id === this.favorite.id) - (a.def.id === this.favorite.id) || b.def.score - a.def.score);
      const f = cands[0];
      this.claim = { id: f.id, timer: 7 };
      this.say(pick(FF.LINES.claim), 2.6, true);
      this.float(f.x, f.y - 40, '她的！', '#ff6fa5', 24);
      FF.Audio.play('angry');
    } else if (ev === 'steam') {
      this.fx.steam = this.fxMax.steam;
      this.say(pick(FF.LINES.steam), 2.4, true);
    } else if (ev === 'spicy') {
      this.fx.spicy = this.fxMax.spicy;
      this.say(pick(FF.LINES.spicy), 2.4, true);
      this.float(270, 500, '🌶️ 辣鍋！熟得更快', '#ff5a3c', 30, 1.4);
    }
  }

  // ---------- 玩家 ----------
  moveToward(p, target, step) {
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d <= step || d < 0.5) {
      p.x = target.x;
      p.y = target.y;
      return true;
    }
    p.x += (dx / d) * step;
    p.y += (dy / d) * step;
    return false;
  }

  updatePlayer(dt) {
    const C = FF.CONFIG;
    const p = this.player;
    const spd = C.basePlayerSpeed * this.mods.speed * (this.fx.chopsticks > 0 ? 2 : 1);
    if (p.state === 'reach') {
      const f = p.target;
      if (!f || f.state !== 'pot') {
        if (f && f.state === 'gf') {
          this.float(p.tip.x, p.tip.y - 20, '被搶走了！', '#ff8fb1', 24);
          FF.Audio.play('miss');
        }
        p.state = 'return';
        p.target = null;
      } else if (this.moveToward(p.tip, f, spd * dt)) {
        this.playerGrab(f);
      }
    } else if (p.state === 'carry') {
      this.updateCarry(dt);
    } else if (p.state === 'return') {
      if (this.moveToward(p.tip, C.playerRest, spd * 0.6 * dt)) p.state = 'idle';
    }
  }

  playerGrab(f) {
    const p = this.player;
    const g = this.gf;
    const { rand, pick } = FF.util;
    f.state = 'carried';
    FF.Audio.play('grab');
    const contested = g.target === f && (g.state === 'reach' || g.state === 'hover');
    p.state = 'carry';
    p.target = null;
    p.carry = {
      food: f,
      from: { x: f.x, y: f.y },
      prog: 0,
      strike: null,
      flinch: false,
      swerveT: -1,
      swerveDir: f.x < 270 ? -1 : 1,
      contested,
      claimed: !!(this.claim && this.claim.id === f.id),
    };
    if (contested) {
      g.state = 'return';
      g.target = null;
      this.say(pick(FF.LINES.steal), 2.2, true);
    }
    // 女友要不要打掉？
    const canStrike = ['idle', 'reach', 'hover', 'return'].includes(g.state) && this.fx.chopsticks <= 0 && !this.distracted();
    if (!canStrike) return;
    const forced = !this.firstStrikeDone && this.t >= this.firstStrikeAt;
    let chance = FF.DIFF.strikeChance(this.wave) + (this.anger / 100) * 0.25 - this.mods.gripChance;
    if (contested) chance += 0.15;
    if (p.carry.claimed) chance += 0.3;
    if (this.t < this.firstStrikeAt) chance = 0;
    if (forced || Math.random() < chance) {
      const warn = (forced ? 0.85 : FF.DIFF.warnTime(this.wave)) + this.mods.gripWarn;
      p.carry.strike = { phase: 'pending', at: rand(0.12, 0.3), warn, timer: 0 };
      this.firstStrikeDone = true;
      g.state = 'strikeAim';
      g.target = null;
    }
  }

  carryPos(c) {
    const B = FF.CONFIG.bowl;
    const e = FF.util.ease(c.prog);
    let x = FF.util.lerp(c.from.x, B.x, e);
    let y = FF.util.lerp(c.from.y, B.y - 20, e) - Math.sin(Math.PI * e) * 70;
    if (c.swerveT >= 0) {
      const k = Math.min(1, c.swerveT / 0.5);
      x += c.swerveDir * 75 * Math.sin(Math.PI * k);
    }
    return { x, y };
  }

  updateCarry(dt) {
    const C = FF.CONFIG;
    const p = this.player;
    const c = p.carry;
    const f = c.food;
    let rate = 1 / C.carryTime;
    const s = c.strike;
    if (s) {
      if (s.phase === 'pending' && c.prog >= s.at) {
        s.phase = 'warn';
        s.timer = s.warn;
        this.strikesSeen++;
        FF.Audio.play('warn');
        this.gf.state = 'strikeWarn';
      }
      if (s.phase === 'warn') {
        rate *= 0.25;
        s.timer -= dt;
        this.flash = Math.max(this.flash, 0.35);
        if (s.timer <= 0) {
          s.phase = 'slam';
          s.timer = 0.08;
        }
      } else if (s.phase === 'slam') {
        rate *= 0.25;
        s.timer -= dt;
        if (s.timer <= 0) {
          this.knockFood();
          return;
        }
      }
    }
    if (c.swerveT >= 0) c.swerveT += dt;
    c.prog = Math.min(1, c.prog + rate * dt);
    const pos = this.carryPos(c);
    f.x = pos.x;
    f.y = pos.y;
    p.tip.x = pos.x;
    p.tip.y = pos.y;
    if (c.prog >= 1) this.playerEat(f);
  }

  knockFood() {
    const p = this.player;
    const c = p.carry;
    const f = c.food;
    const { pick } = FF.util;
    FF.Audio.play('hit');
    this.shake = 16;
    this.flash = 1;
    this.burst(f.x, f.y, 18, ['#fff', '#ffd54a', '#ff8a65'], { speed: 320, size: 7, life: 0.6 });
    this.burst(f.x, f.y, 4, ['#fff'], { speed: 200, size: 22, life: 0.7, emoji: '💥' });
    this.float(f.x, f.y - 30, '被打掉了！', '#ff5a5a', 30);
    const dest = this.randomPotPoint(60);
    f.state = 'pot';
    f.fly = { sx: f.x, sy: f.y, tx: dest.x, ty: dest.y, t: 0, dur: 0.45 };
    f.vx = FF.util.rand(-16, 16);
    f.vy = FF.util.rand(-16, 16);
    this.stats.knocked++;
    this.combo = 0;
    this.dodgeStreak = 0;
    this.anger -= 3;
    this.say(pick(FF.LINES.strike), 2.2, true);
    p.state = 'return';
    p.carry = null;
    this.gf.state = 'return';
  }

  dodge() {
    const c = this.player.carry;
    if (!c) return;
    const s = c.strike;
    const { pick } = FF.util;
    if (s && s.phase === 'warn' && !c.flinch) {
      s.phase = 'dodged';
      c.swerveT = 0;
      const pos = this.carryPos(c);
      this.gf.state = 'slamMiss';
      this.gf.slamTarget = { x: pos.x, y: pos.y };
      this.gf.timer = 0.35;
      this.gf.pout = 1.3;
      this.dodgeStreak++;
      const streak = this.dodgeStreak;
      FF.Audio.play('dodge', streak);
      const bonus = 5 * Math.min(streak, 5);
      this.score += bonus;
      // 打擊感：短暫慢動作、白光、衝擊波
      this.slowmo = 0.22;
      this.dodgeFlash = 1;
      this.shake = Math.max(this.shake, 6);
      this.shockwaves.push({ x: pos.x, y: pos.y, t: 0 });
      this.float(pos.x, pos.y - 40, streak > 1 ? `完美閃避 x${streak}！+${bonus}` : `閃過！+${bonus}`, '#7dffb0', streak > 1 ? 32 : 34, 1.2);
      this.burst(pos.x, pos.y, 18, ['#b9ffd6', '#ffffff', '#7dffb0'], { speed: 320, size: 6, life: 0.5, gravity: 0 });
      this.burst(pos.x, pos.y, 3, ['#fff'], { speed: 160, size: 22, life: 0.6, gravity: -50, emoji: '✨' });
      this.stats.dodges++;
      this.anger += 3 * this.mods.angerMul;
      this.say(pick(FF.LINES.dodged), 2.0, true);
    } else if (!c.flinch && (!s || s.phase === 'pending')) {
      c.flinch = true;
      this.float(this.player.tip.x, this.player.tip.y - 30, '手抖了…', '#cfcfcf', 20, 0.8);
    }
  }

  playerEat(f) {
    const p = this.player;
    const c = p.carry;
    const d = f.def;
    const { pick } = FF.util;
    const st = this.stage(f);
    const B = FF.CONFIG.bowl;
    f.state = 'gone';
    p.state = 'return';
    p.carry = null;
    let sc;
    let sat;
    if (st === 'raw') {
      sc = -5;
      sat = -4;
      this.combo = 0;
      this.stats.raw++;
      this.float(B.x, B.y - 60, '生的！肚子痛 -5', '#8fd0ff', 26);
      FF.Audio.play('raw');
      if (Math.random() < 0.6) this.say(pick(FF.LINES.raw));
    } else if (st === 'perfect') {
      this.combo++;
      this.stats.perfect++;
      this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo);
      const mult = 1 + 0.1 * Math.min(this.combo, 10);
      sc = Math.round(d.score * mult);
      sat = d.sat;
      this.float(B.x, B.y - 60, `完美！+${sc}`, '#ffe066', d.rare ? 36 : 30);
      this.burst(B.x, B.y - 20, d.rare ? 24 : 10, ['#ffe066', '#fff', '#7dffb0'], { speed: 240, size: 6, life: 0.6 });
      FF.Audio.play('perfect');
    } else {
      sc = Math.round(d.score * 0.3);
      sat = d.sat * 0.5;
      this.combo = 0;
      this.float(B.x, B.y - 60, `煮太老了 +${sc}`, '#d9a86c', 24);
      FF.Audio.play('okay');
    }
    this.score = Math.max(0, this.score + sc);
    this.sat = FF.util.clamp(this.sat + sat, 0, this.mods.satMax);
    // 怒氣
    let a = FF.DIFF.angerPerGrab(this.wave);
    if (c.contested) {
      a += 10;
      this.stats.steals++;
    }
    if (c.claimed && this.claim && this.claim.id === f.id) {
      a += 18;
      this.claim = null;
      this.say(pick(FF.LINES.claimStolen), 2.4, true);
    }
    if (d.id === this.favorite.id) a += 3;
    if (d.rare) a += 6;
    this.anger += a * this.mods.angerMul;
    if (a >= 10) {
      FF.Audio.play('angry');
      this.shake = Math.max(this.shake, 5);
    }
    this.stats.eaten++;
    this.bowl.push(d.emoji);
    if (this.bowl.length > 3) this.bowl.shift();
    this.bowlBounce = 1;
  }

  // ---------- 女友 AI ----------
  chooseTarget(exclude) {
    let best = null;
    let bs = 2;
    const jitter = this.wave === 1 ? 3 : 1.5;
    for (const f of this.potFoods()) {
      if (f.fly || f === exclude) continue;
      const st = this.stage(f);
      const d = f.def;
      let s;
      if (st === 'perfect') s = 5;
      else if (st === 'raw') s = d.raw - f.t < 1.2 ? 3 : -2;
      else s = 0.5;
      if (d.id === this.favorite.id) s += 3;
      if (d.rare) s += 6;
      if (this.claim && this.claim.id === f.id) s += 8;
      if (this.player.state === 'reach' && this.player.target === f) s += 1.5;
      s += Math.random() * jitter;
      if (s > bs) {
        bs = s;
        best = f;
      }
    }
    return best;
  }

  updateGF(dt) {
    const g = this.gf;
    const w = this.wave;
    const D = FF.DIFF;
    const { rand, pick } = FF.util;
    const rest = { x: 375, y: 245 };
    const reach = D.gfReach(w);
    const phone = this.distracted();

    if (phone && ['reach', 'hover'].includes(g.state)) {
      g.state = 'return';
      g.target = null;
    }

    switch (g.state) {
      case 'idle':
        this.moveToward(g.tip, rest, 900 * dt);
        if (phone) break;
        g.timer -= dt;
        if (g.timer <= 0) {
          const f = this.chooseTarget();
          if (f) {
            g.target = f;
            g.state = 'reach';
            g.start = { x: g.tip.x, y: g.tip.y };
            g.fake = Math.random() < D.fakeChance(w);
            g.faked = false;
          } else {
            g.timer = 0.4;
          }
        }
        break;
      case 'reach': {
        const f = g.target;
        if (!f || f.state !== 'pot' || f.fly) {
          g.state = 'idle';
          g.timer = 0.25;
          g.target = null;
          break;
        }
        if (g.fake && !g.faked) {
          const total = FF.util.dist(g.start, f);
          const left = FF.util.dist(g.tip, f);
          if (left < total * 0.5) {
            g.faked = true;
            const alt = this.chooseTarget(f);
            if (alt) {
              g.target = alt;
              if (Math.random() < 0.5) this.say(pick(FF.LINES.fake), 1.6);
            }
          }
        }
        if (this.moveToward(g.tip, g.target, reach * dt)) {
          const t = g.target;
          const blocked = this.fx.chopsticks > 0 && this.player.state === 'reach' && this.player.target === t;
          if (this.stage(t) === 'raw' || blocked) {
            g.state = 'hover';
            g.hoverT = 0;
          } else {
            this.gfGrab(t);
          }
        }
        break;
      }
      case 'hover': {
        const f = g.target;
        if (!f || f.state !== 'pot' || f.fly) {
          g.state = 'idle';
          g.timer = 0.2;
          g.target = null;
          break;
        }
        g.tip.x = f.x;
        g.tip.y = f.y - 6 + Math.sin(this.t * 10) * 3;
        g.hoverT += dt;
        const blocked = this.fx.chopsticks > 0 && this.player.state === 'reach' && this.player.target === f;
        if (this.stage(f) !== 'raw' && !blocked) this.gfGrab(f);
        else if (g.hoverT > 2.5) {
          g.state = 'idle';
          g.timer = 0.3;
          g.target = null;
        }
        break;
      }
      case 'retract': {
        const f = g.food;
        g.prog += dt / 0.45;
        const k = FF.util.ease(Math.min(1, g.prog));
        const mouth = { x: FF.CONFIG.gf.x, y: FF.CONFIG.gf.y + 30 };
        f.x = FF.util.lerp(g.from.x, mouth.x, k);
        f.y = FF.util.lerp(g.from.y, mouth.y, k) - Math.sin(Math.PI * k) * 40;
        g.tip.x = f.x;
        g.tip.y = f.y;
        if (g.prog >= 1) this.gfEat(f);
        break;
      }
      case 'chew':
        g.chew -= dt;
        this.moveToward(g.tip, rest, 900 * dt);
        if (g.chew <= 0) {
          g.state = 'idle';
          g.timer = D.gfThink(w) * rand(0.6, 1.2);
        }
        break;
      case 'return':
        if (this.moveToward(g.tip, rest, Math.max(reach, 900) * dt)) {
          g.state = 'idle';
          g.timer = D.gfThink(w) * rand(0.5, 1.1);
        }
        break;
      case 'strikeAim':
      case 'strikeWarn': {
        const c = this.player.carry;
        if (!c || !c.strike) {
          g.state = 'return';
          break;
        }
        const f = c.food;
        const s = c.strike;
        if (s.phase === 'pending') {
          this.moveToward(g.tip, { x: f.x + 30, y: f.y - 110 }, 2600 * dt);
        } else if (s.phase === 'warn') {
          const tgt = { x: f.x + Math.sin(this.t * 45) * 5, y: f.y - 90 };
          this.moveToward(g.tip, tgt, 2600 * dt);
        } else if (s.phase === 'slam') {
          this.moveToward(g.tip, f, 7000 * dt);
        }
        break;
      }
      case 'slamMiss':
        this.moveToward(g.tip, g.slamTarget, 5000 * dt);
        g.timer -= dt;
        if (g.timer <= 0) g.state = 'return';
        break;
      default:
        g.state = 'idle';
    }
  }

  gfGrab(f) {
    const g = this.gf;
    f.state = 'gf';
    g.food = f;
    g.target = null;
    g.state = 'retract';
    g.prog = 0;
    g.from = { x: f.x, y: f.y };
  }

  gfEat(f) {
    const g = this.gf;
    const { pick } = FF.util;
    f.state = 'gone';
    g.food = null;
    g.state = 'chew';
    g.chew = 0.55;
    let a = 5;
    const fav = f.def.id === this.favorite.id;
    if (fav) a = 12;
    if (f.def.rare) a = 10;
    if (this.claim && this.claim.id === f.id) {
      a += 8;
      this.claim = null;
    }
    this.anger -= a;
    this.stats.gfAte++;
    FF.Audio.play('gfEat');
    const G = FF.CONFIG.gf;
    this.burst(G.x + 40, G.y - 20, fav ? 5 : 2, ['#fff'], { speed: 80, size: 18, life: 0.9, gravity: -60, emoji: '💗' });
    if (fav) this.say(pick(FF.LINES.eatFav), 2.2, true);
    else if (Math.random() < 0.4) this.say(pick(FF.LINES.eat), 1.8);
  }

  // ---------- 輸入 ----------
  tap(x, y) {
    if (this.over) return;
    const L = FF.LAYOUT;
    const hitC = c => Math.hypot(x - c.x, y - c.y) <= c.r + 8;
    if (hitC(L.pause)) {
      this.hooks.onPause && this.hooks.onPause();
      return;
    }
    if (this.paused) return;
    if (this.tapEvents(x, y)) return;
    for (const b of L.items) {
      if (hitC(b)) {
        this.useItem(b.id);
        return;
      }
    }
    this.lastTap = { x, y, t: 0 };
    if (this.player.state === 'carry') {
      this.dodge();
      return;
    }
    let best = null;
    let bd = Infinity;
    for (const f of this.potFoods()) {
      const d = Math.hypot(f.x - x, f.y - y);
      if (d < this.mods.hit && d < bd) {
        bd = d;
        best = f;
      }
    }
    if (best) {
      this.player.state = 'reach';
      this.player.target = best;
      FF.Audio.play('reach');
    } else {
      this.burst(x, y, 5, ['rgba(255,255,255,0.8)'], { speed: 90, size: 4, life: 0.3, gravity: 0 });
    }
  }

  useItem(id) {
    const { pick } = FF.util;
    const item = FF.ITEMS.find(i => i.id === id);
    if (!item || this.itemCd > 0) return;
    const b = FF.LAYOUT.items.find(i => i.id === id);
    if ((this.save.items[id] || 0) <= 0) {
      this.float(b.x, b.y - 50, '沒有了，去商店買', '#ffb4b4', 20, 1.1);
      FF.Audio.play('error');
      return;
    }
    this.save.items[id]--;
    FF.Save.persist();
    this.itemCd = FF.CONFIG.itemCooldown;
    FF.Audio.play('item');
    this.burst(b.x, b.y, 10, ['#fff', '#ffe066'], { speed: 180, size: 5, life: 0.5, gravity: 0 });
    const cancelStrike = () => {
      const c = this.player.carry;
      if (c && c.strike && (c.strike.phase === 'pending' || c.strike.phase === 'warn')) {
        c.strike = null;
        this.gf.state = 'return';
      }
    };
    switch (id) {
      case 'chopsticks':
        this.fx.chopsticks = item.dur;
        this.float(270, 760, '🥢 公筷模式！', '#ffe066', 28);
        cancelStrike();
        break;
      case 'cute':
        this.anger = Math.max(0, this.anger - 35);
        this.say(pick(FF.LINES.cute), 2.4, true);
        this.burst(FF.CONFIG.gf.x, FF.CONFIG.gf.y, 8, ['#fff'], { speed: 160, size: 20, life: 1, gravity: -40, emoji: '💕' });
        break;
      case 'soup':
        for (const f of this.potFoods()) {
          if (this.stage(f) === 'over') f.t = f.def.raw + 0.05;
        }
        this.fx.soup = item.dur;
        this.say(pick(FF.LINES.soup), 2, true);
        this.burst(270, 500, 20, ['#ffd18a', '#fff3d6'], { speed: 260, size: 7, life: 0.6 });
        break;
      case 'phone':
        this.fx.phone = item.dur;
        this.say(pick(FF.LINES.phone), 2.6, true);
        cancelStrike();
        break;
    }
  }

  // ---------- 結束 ----------
  end(reason) {
    if (this.over) return;
    this.over = true;
    this.overTimer = reason === 'quit' ? 0 : 1.2;
    const T = FF.TICKETS;
    const secs = Math.floor(this.t);
    const parts = {
      time: Math.floor(secs * T.perSecond),
      score: Math.floor(this.score * T.perScore),
      wave: (this.wave - 1) * T.perWave,
    };
    const base = parts.time + parts.score + parts.wave;
    const bonus = Math.floor(base * (this.mods.ticketMul - 1));
    const venueBonus = Math.floor(base * this.venue.bonus);
    const total = Math.max(T.min, base + bonus + venueBonus);
    const s = this.save;
    const best = s.best;
    const newRecord = this.score > best.score;
    const prevWave = best.wave;
    const unlocked = FF.VENUES.filter(v => v.unlockWave > prevWave && v.unlockWave <= this.wave);
    best.score = Math.max(best.score, this.score);
    best.time = Math.max(best.time, secs);
    best.wave = Math.max(best.wave, this.wave);
    s.tickets += total;
    s.runs++;
    FF.Save.persist();
    const E = FF.ENDINGS[reason];
    const G = FF.GRADES.find(g => secs >= g.minTime) || FF.GRADES[FF.GRADES.length - 1];
    this.result = {
      reason,
      title: E.title,
      line: FF.util.pick(E.lines),
      score: this.score,
      time: secs,
      wave: this.wave,
      stats: { ...this.stats },
      tickets: { ...parts, bonus, venueBonus, venueName: this.venue.name, total, min: total === T.min && base + bonus + venueBonus < T.min },
      unlocked,
      venue: this.venue,
      newRecord,
    };
    const r = this.result;
    r.grade = { grade: G.grade, title: G.title, stars: G.stars, color: G.color, comment: FF.util.pick(G[reason]) };
    r.quips = FF.QUIPS.map(q => q(r)).filter(Boolean).slice(0, 2);
    if (reason !== 'quit') {
      FF.Audio.play('gameover');
      this.shake = 10;
      this.say(this.result.line.replace(/^「|」.*$/g, ''), 9, true);
    }
  }
};
