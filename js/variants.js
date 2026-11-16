// 她的模式（女友個性）與鍋底：把 content.js 的倍率套進一局遊戲（掛在 FF.Game 上）
window.FF = window.FF || {};

FF.PERSONA_MUL_DEFAULTS = {
  think: 1, reach: 1, strike: 1, fake: 1, angerGain: 1, decay: 1, calm: 1, chew: 1, feed: 1, cute: 1, ult: 1, ultCd: 1, sat: 1,
};
FF.personaById = id => FF.PERSONAS.find(p => p.id === id) || FF.PERSONAS[0];
FF.brothById = id => FF.BROTHS.find(b => b.id === id) || FF.BROTHS[0];

Object.assign(FF.Game.prototype, {
  // 在建構子裡、其他 init 之前呼叫：決定這局的女友模式、鍋底、挑戰規則
  initVariants(opts) {
    const save = this.save;
    const ch = opts.challenge ? FF.CHALLENGES.find(c => c.id === opts.challenge) : null;
    this.challenge = ch || null;
    const setup = ch ? ch.setup : {};
    this.rules = Object.assign({ think: 1, reach: 1, strike: 1, decayMul: 1, satMul: 1 }, ch ? ch.rules : {});
    if (this.rules.noDecay) this.rules.decayMul = 0;
    // 挑戰模式固定設定；一般模式用玩家的選擇（未解鎖就退回預設）
    const comp = this.comp;
    // 競技模式：配置由戰帖／日期決定，沒解鎖也能玩（只限這局）
    const gfId = comp ? comp.persona : ch ? (setup.gf || 'default') : (save.unlockedGf || []).includes(save.gfType) ? save.gfType : 'default';
    const brothId = comp ? comp.broth : ch ? (setup.broth || 'classic') : (save.unlockedBroth || []).includes(save.broth) ? save.broth : 'classic';
    this.persona = FF.personaById(gfId);
    this.broth = FF.brothById(brothId);
    if (ch && setup.venue) this.venue = FF.VENUES.find(v => v.id === setup.venue) || this.venue;
    this.waveBase = ch ? setup.waveBase || 0 : 0;
    this.wave = 1 + this.waveBase;
    this.pm = Object.assign({}, FF.PERSONA_MUL_DEFAULTS, this.persona.mul);
    if (this.rules.calm != null) this.pm.calm *= this.rules.calm;
    if (this.rules.feed != null) this.pm.feed *= this.rules.feed;
    if (this.rules.anger != null) this.mods.angerMul *= this.rules.anger;
    this.mods.angerMul *= this.pm.angerGain * (this.broth.anger || 1);
    const pm = this.pm;
    const R = this.rules;
    // 套上倍率的難度曲線（每次呼叫都讀 FF.DIFF，方便除錯時覆寫）
    this.D = {
      gfThink: w => FF.DIFF.gfThink(w) * pm.think * R.think,
      gfReach: w => FF.DIFF.gfReach(w) * pm.reach * R.reach,
      strikeChance: w => Math.min(0.95, FF.DIFF.strikeChance(w) * pm.strike * R.strike),
      fakeChance: w => Math.min(0.7, FF.DIFF.fakeChance(w) * pm.fake),
      angerDecay: w => FF.DIFF.angerDecay(w) * pm.decay * (this.broth.angerDecay || 1) * R.decayMul,
      satDrain: w => FF.DIFF.satDrain(w) * pm.sat * this.broth.satDrain * R.satMul,
    };
    this.ultAngerMin = this.persona.ultAngerMin || FF.ULT.angerMin;
    this.initChallenge();
  },

  // 台詞：她的模式有專屬台詞時，大部分時候用專屬的
  line(key) {
    const own = this.persona && this.persona.lines[key];
    const base = FF.LINES[key] || [''];
    if (own && own.length && (FF.util.R() < 0.75 || !base.length)) return FF.util.pick(own);
    return FF.util.pick(base);
  },

  // ---------- 鍋底 ----------
  // 這塊食物現在的熟度速度（含辣鍋事件、加湯）
  cookRate(f) {
    const b = this.broth;
    let k = b.split ? (f.x < FF.CONFIG.pot.x ? b.split.left : b.split.right) : b.cook;
    if (this.fx.spicy > 0) k *= b.spicyMul;
    if (this.fx.soup > 0) k *= 0.5;
    return k;
  },

  // 鴛鴦鍋：食物留在自己那一半（被打掉、飛回鍋裡的落地後才決定在哪邊）
  brothConstrain(f) {
    if (!this.broth.split || f.fly) return;
    const P = FF.CONFIG.pot;
    const gap = 24;
    if (f.side == null) f.side = f.x < P.x ? -1 : 1;
    if (f.side < 0 && f.x > P.x - gap) {
      f.x = P.x - gap;
      f.vx = -Math.abs(f.vx);
    } else if (f.side > 0 && f.x < P.x + gap) {
      f.x = P.x + gap;
      f.vx = Math.abs(f.vx);
    }
  },
});
