// 女友大絕招（全鍋掃蕩、筷子連打）與「餵她吃」（掛在 FF.Game 上）
window.FF = window.FF || {};

Object.assign(FF.Game.prototype, {
  initSpecials() {
    this.ult = null;
    this.ultCd = 0;
    this.ultHot = 0;        // 怒氣連續超過門檻幾秒
    this.feedFatigue = 0;   // 連續餵食的疲乏度
    this.stats.fed = 0;
    this.stats.fedFav = 0;
    this.stats.fedRaw = 0;
    this.stats.fedPerfect = 0;
    this.stats.ults = 0;
    this.stats.ultCleared = 0;
  },

  updateSpecials(dt) {
    const U = FF.ULT;
    this.feedFatigue = Math.max(0, this.feedFatigue - FF.FEED.fatigueDecay * dt);
    if (this.gf.fedFx) {
      this.gf.fedFx.t -= dt;
      if (this.gf.fedFx.t <= 0) this.gf.fedFx = null;
    }
    if (this.ult) {
      this.updateUlt(dt);
      return;
    }
    this.ultCd -= dt;
    // 怒氣在門檻上下晃動時不要整個歸零，慢慢退（門檻依她的模式不同）
    this.ultHot = this.anger >= this.ultAngerMin ? this.ultHot + dt : Math.max(0, this.ultHot - dt * 2);
    const c = this.player.carry;
    const ready = this.ultCd <= 0 && this.ultHot >= U.firstCooldown && this.t >= U.minTime &&
      !this.waiter && !this.crash && !this.distracted() &&
      ['idle', 'return', 'chew', 'reach', 'hover'].includes(this.gf.state) && !(c && c.strike);
    if (ready && Math.random() < U.chancePerSec * this.pm.ult * dt) {
      const cands = this.sweepCandidates();
      const bias = this.persona.sweepBias == null ? 0.5 : this.persona.sweepBias;
      this.startUlt(cands.length >= 2 && Math.random() < bias ? 'sweep' : 'combo');
    }
  },

  // 掃蕩目標：她心目中最想吃的幾塊（剛好的、快熟的、稀有、她最愛）
  sweepCandidates() {
    const out = [];
    for (const f of this.potFoods()) {
      if (f.fly) continue;
      const st = this.stage(f);
      let s = st === 'perfect' ? 5 : st === 'raw' ? (f.def.raw - f.t < 1.5 ? 3 : 1) : 0.5;
      if (f.def.id === this.favorite.id) s += 3;
      if (f.def.rare) s += 6;
      out.push({ f, s });
    }
    return out.sort((a, b) => b.s - a.s).map(o => o.f);
  },

  startUlt(type) {
    const U = FF.ULT;
    const { pick } = FF.util;
    const g = this.gf;
    g.state = 'ult';
    g.target = null;
    this.stats.ults++;
    this.ult = { type, t: 0 };
    const u = this.ult;
    if (type === 'sweep') {
      u.phase = 'charge';
      u.targets = this.sweepCandidates().slice(0, Math.max(2, U.sweep.count(this.wave)));
      u.nums = new Map(u.targets.map((f, i) => [f, i + 1])); // 標記編號固定，不會因為吃掉前面的而跳號
      u.flying = [];
      u.cur = null;
      u.pauseT = 0;
      u.eaten = 0;
      u.title = '全鍋掃蕩';
      u.sub = '標記的食物要被她掃光了！快搶，或用 📱 🥺 打斷';
      this.say(this.line('ultSweep'), 2.4, true);
    } else {
      u.phase = 'windup';
      u.hits = U.combo.hits(this.wave);
      u.title = '筷子連打';
      u.sub = `下一塊夾起來她會連打 ${u.hits} 下！每個 ❗ 都要點`;
      this.say(this.line('ultCombo'), 2.4, true);
    }
    FF.Audio.play('ult');
    FF.Haptics.vibrate('ult');
    this.flash = Math.max(this.flash, 0.6);
    this.shake = Math.max(this.shake, 8);
    const G = FF.CONFIG.gf;
    this.burst(G.x, G.y, 6, ['#fff'], { speed: 200, size: 26, life: 0.9, gravity: -60, emoji: '💢' });
  },

  updateUlt(dt) {
    const U = FF.ULT;
    const u = this.ult;
    const g = this.gf;
    u.t += dt;
    // 被手機、窗外意外吸走注意力：大招中斷（連打已經打下去的那一輪由 cancelStrike 處理）
    if (this.distracted() && u.phase !== 'striking') {
      this.endUlt('interrupted');
      return;
    }
    if (u.type === 'sweep') {
      this.updateSweepFlying(dt);
      if (u.phase === 'charge') {
        // 蓄力：筷子高舉微微發抖
        this.moveToward(g.tip, { x: 330 + Math.sin(this.t * 40) * 4, y: 250 }, 1200 * dt);
        if (u.t >= U.sweep.charge) {
          u.phase = 'sweep';
          u.t = 0;
          FF.Audio.play('swipe');
        }
      } else if (u.phase === 'sweep') {
        if (u.pauseT > 0) {
          u.pauseT -= dt;
          return;
        }
        const valid = f => f && f.state === 'pot' && !f.fly;
        // 開公筷時，你正在夾的那塊她搶不走
        const blocked = f => this.fx.chopsticks > 0 && this.player.state === 'reach' && this.player.target === f;
        if (!valid(u.cur) || blocked(u.cur)) u.cur = u.targets.find(f => valid(f) && !blocked(f)) || null;
        if (!u.cur) {
          if (!u.flying.length) this.endUlt('done');
          return;
        }
        if (this.moveToward(g.tip, u.cur, U.sweep.speed * dt)) {
          const f = u.cur;
          f.state = 'gf';
          u.flying.push({ food: f, from: { x: f.x, y: f.y }, t: 0 });
          u.targets = u.targets.filter(x => x !== f);
          u.cur = null;
          u.pauseT = U.sweep.pause;
          FF.Audio.play('swipe');
          this.burst(f.x, f.y, 8, ['#ff6fa5', '#fff', '#ffd18a'], { speed: 200, size: 5, life: 0.4 });
        }
      }
    } else {
      // 筷子連打
      if (u.phase === 'windup' || u.phase === 'armed') {
        this.moveToward(g.tip, { x: 360 + Math.sin(this.t * 7) * 18, y: 330 + Math.cos(this.t * 9) * 8 }, 1600 * dt);
      }
      if (u.phase === 'striking') {
        // 保險：那一塊已經不在筷子上（例如被其他事件清掉）就安靜收招
        const c = this.player.carry;
        const live = c && ((c.strike && c.strike.combo) || (c.feed && c.feed.combo));
        if (!live) this.endUlt('silent');
      } else if (u.phase === 'windup' && u.t >= U.combo.windup) {
        u.phase = 'armed';
        u.t = 0;
      } else if (u.phase === 'armed' && u.t >= U.combo.wait) {
        this.endUlt('giveup');
      }
    }
  },

  updateSweepFlying(dt) {
    const u = this.ult;
    const mouth = { x: FF.CONFIG.gf.x, y: FF.CONFIG.gf.y + 30 };
    for (const fl of u.flying) {
      fl.t += dt;
      const k = FF.util.ease(Math.min(1, fl.t / 0.28));
      fl.food.x = FF.util.lerp(fl.from.x, mouth.x, k);
      fl.food.y = FF.util.lerp(fl.from.y, mouth.y, k) - Math.sin(Math.PI * k) * 50;
      if (k >= 1) {
        fl.food.state = 'gone';
        this.anger -= FF.ULT.sweep.angerPerBite;
        this.stats.gfAte++;
        u.eaten++;
        FF.Audio.play('gfEat');
        this.float(mouth.x + 60, mouth.y - 30, '嗷嗚！', '#ff8fb1', 22, 0.7);
      }
    }
    u.flying = u.flying.filter(fl => fl.food.state === 'gf');
  },

  // 連打已就緒時，玩家夾起食物：設定多段打擊
  armComboStrike(c) {
    const U = FF.ULT.combo;
    const u = this.ult;
    u.phase = 'striking';
    c.strike = {
      phase: 'pending',
      at: U.firstAt,
      warn: U.warn + this.mods.gripWarn,
      timer: 0,
      combo: true,
      hits: u.hits,
      idx: 0,
      grace: 0,
    };
    this.gf.state = 'strikeAim';
    this.gf.target = null;
  },

  endUlt(result) {
    const U = FF.ULT;
    const u = this.ult;
    if (!u) return;
    const { pick } = FF.util;
    if (u.flying) {
      for (const fl of u.flying) {
        fl.food.state = 'gone';
        this.stats.gfAte++;
      }
    }
    this.ult = null;
    this.ultCd = U.cooldown * this.pm.ultCd;
    this.ultHot = 0;
    if (this.gf.state === 'ult') this.gf.state = 'return';
    if (result === 'silent') return;
    let calm = U.calm;
    let line = null;
    let cleared = false;
    switch (result) {
      case 'done':
        line = this.line('ultSweepDone');
        if (u.eaten <= 1) {
          cleared = true;
          this.float(270, 400, '掃蕩失敗！好料都被你搶走了', '#7dffb0', 24, 1.4);
        }
        break;
      case 'cleared':
        cleared = true;
        line = this.line('ultComboWin');
        this.score += U.combo.bonus;
        this.float(270, 600, `連打全閃！+${U.combo.bonus}`, '#7dffb0', 32, 1.5);
        FF.Audio.play('hero');
        FF.Haptics.vibrate('comboClear');
        break;
      case 'hit':
        line = this.line('ultComboLose');
        break;
      case 'giveup':
        calm = U.interruptCalm;
        line = this.line('ultComboGiveUp');
        break;
      case 'fed':
        cleared = true;
        line = this.line('ultFed');
        break;
      case 'cute':
        cleared = true;
        calm = 0; // 撒嬌本身已經大幅消氣
        line = this.line('ultCute');
        break;
      case 'interrupted':
        cleared = true;
        calm = U.interruptCalm;
        line = this.line('ultCancel');
        break;
    }
    if (cleared) this.stats.ultCleared++;
    if (calm > 0) {
      this.anger = Math.max(0, this.anger - calm);
      this.float(290, 300, `大招放完，消氣 -${calm}`, '#ffb3c7', 20, 1.4);
    }
    if (line) this.say(line, 2.4, true);
  },

  // ---------- 餵她吃 ----------
  faceHit(x, y) {
    const G = FF.CONFIG.gf;
    const F = FF.FEED;
    return y <= F.faceMaxY && Math.hypot(x - G.x, y - (G.y + 10)) <= F.faceR;
  },

  feed() {
    const p = this.player;
    const c = p.carry;
    if (this.over || this.paused || this.crash || p.state !== 'carry' || !c || c.feed) return false;
    const s = c.strike;
    const wasCombo = !!(s && s.combo);
    if (s && s.phase !== 'dodged') {
      c.strike = null;
      if (['strikeAim', 'strikeWarn', 'slamMiss'].includes(this.gf.state)) this.gf.state = 'return';
      this.gf.afterSlam = null;
    }
    c.feed = { t: 0, from: { x: c.food.x, y: c.food.y }, combo: wasCombo };
    FF.Audio.play('reach');
    return true;
  },

  updateFeed(dt) {
    const p = this.player;
    const c = p.carry;
    const f = c.food;
    const G = FF.CONFIG.gf;
    c.feed.t += dt;
    const k = FF.util.ease(Math.min(1, c.feed.t / FF.FEED.time));
    const mouth = { x: G.x, y: G.y + G.r * 0.48 };
    f.x = FF.util.lerp(c.feed.from.x, mouth.x, k);
    f.y = FF.util.lerp(c.feed.from.y, mouth.y, k) - Math.sin(Math.PI * k) * 40;
    p.tip.x = f.x;
    p.tip.y = f.y;
    if (k >= 1) this.feedGF(f, c);
  },

  feedGF(f, c) {
    const F = FF.FEED;
    const { pick } = FF.util;
    const p = this.player;
    const g = this.gf;
    const d = f.def;
    const st = this.stage(f);
    const G = FF.CONFIG.gf;
    f.state = 'gone';
    p.state = 'return';
    p.carry = null;
    const fav = d.id === this.favorite.id;
    const claimed = !!(this.claim && this.claim.id === f.id);
    let a;
    let sc;
    let kind;
    let line;
    if (st === 'raw') {
      a = F.anger.raw * this.mods.angerMul;
      sc = F.score.raw;
      this.stats.fedRaw++;
      kind = 'yuck';
      line = this.line('fedRaw');
    } else if (st === 'over') {
      a = F.anger.over;
      sc = F.score.over;
      kind = 'meh';
      line = this.line('fedOver');
    } else {
      a = F.anger.perfect + (fav ? F.favBonus : 0) + (d.rare ? F.rareBonus : 0);
      sc = F.score.perfect + (fav ? F.score.fav : 0) + (d.rare ? F.score.rare : 0);
      kind = 'love';
      this.stats.fedPerfect++;
      if (fav) this.stats.fedFav++;
      line = this.line(d.rare ? 'fedRare' : fav ? 'fedFav' : 'fedLove');
    }
    if (claimed && st !== 'raw') {
      a += F.claimBonus;
      this.claim = null;
      line = this.line('fedClaim');
    }
    // 連續餵會越來越沒感
    const mul = Math.max(F.minMul, 1 - F.perFatigue * this.feedFatigue);
    if (a < 0) {
      a *= mul * this.pm.feed; // 傲嬌模式餵食效果加倍
      if (mul < 0.5) {
        line = this.line('fedFull');
        if (kind === 'love') kind = 'full';
      }
    }
    this.feedFatigue += 1;
    this.anger = FF.util.clamp(this.anger + a, 0, 100);
    this.score += sc;
    this.stats.fed++;

    // 她的反應
    if (!['retract', 'ult'].includes(g.state)) {
      g.state = 'chew';
      g.chew = 0.7;
      g.target = null;
    }
    g.fedFx = { kind, t: 1.4 };
    const delta = Math.round(a);
    const fx = G.x + 120;
    if (delta < 0) this.float(fx, G.y + 50, `消氣 ${delta}`, '#ff8fb1', kind === 'love' ? 28 : 22, 1.2);
    else if (delta > 0) this.float(fx, G.y + 50, `她不爽 +${delta}`, '#ff5a5a', 24, 1.2);
    else this.float(fx, G.y + 50, '她沒感覺…', '#ddd', 20, 1.1);
    if (sc > 0) this.float(G.x - 110, G.y + 90, `貼心 +${sc}`, '#ffe066', 20, 1.1);
    if (kind === 'love') {
      const n = d.rare || fav ? 12 : 7;
      // 愛心從頭頂冒出來，不要擋住愛心眼
      this.burst(G.x, G.y - 55, n, ['#fff'], { speed: 170, size: 22, life: 1.1, gravity: -80, emoji: pick(['💕', '💗', '💖']) });
      this.burst(G.x, G.y - 55, 4, ['#fff'], { speed: 110, size: 18, life: 1.0, gravity: -80, emoji: '❤️' });
      FF.Audio.play('feed');
    } else if (kind === 'yuck') {
      this.burst(G.x + 40, G.y - 20, 4, ['#fff'], { speed: 120, size: 20, life: 0.9, gravity: 200, emoji: '💦' });
      FF.Audio.play('yuck');
      this.shake = Math.max(this.shake, 4);
    } else {
      this.burst(G.x + 40, G.y - 20, 2, ['#fff'], { speed: 80, size: 18, life: 0.9, gravity: -60, emoji: kind === 'full' ? '😮‍💨' : '💧' });
      FF.Audio.play('gfEat');
    }
    FF.Haptics.vibrate('feed');
    this.say(line, 2.2, true);
    this.challengeOnFeed(f, st, kind);
    if (c.feed.combo && this.ult && this.ult.type === 'combo') this.endUlt('fed');
  },
});
