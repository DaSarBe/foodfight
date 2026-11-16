// 紀念日挑戰：特殊規則、過關／失敗判定、專屬結算文案（掛在 FF.Game 上）
// 關卡資料在 content.js 的 FF.CHALLENGES
window.FF = window.FF || {};

Object.assign(FF.Game.prototype, {
  initChallenge() {
    const ch = this.challenge;
    this.chal = null;
    this.failWhy = null;
    if (!ch) return;
    this.anger = ch.setup.anger;
    this.chal = { eaten: 0, fed: 0, limit: ch.setup.time || 0, warned: false };
    // 挑戰的節奏比較緊湊：事件提早一點出現
    this.waiterTimer = Math.min(this.waiterTimer, 30);
  },

  showChallengeIntro() {
    const ch = this.challenge;
    this.showBanner(`${ch.icon} ${ch.name}`, `${ch.rule}\n🎯 ${ch.goalText}`);
    this.banner.life = 4;
  },

  // 每幀檢查過關／失敗
  updateChallenge() {
    const ch = this.challenge;
    if (!ch || this.over) return;
    const g = ch.goal;
    const c = this.chal;
    let win = false;
    if (g.type === 'survive') win = this.t >= g.time;
    else if (g.type === 'feed') win = c.fed >= g.count;
    else if (g.type === 'rare') win = this.stats.rareEaten >= g.count;
    else if (g.type === 'score') win = this.score >= g.score;
    else if (g.type === 'calm') win = this.t > 1 && this.anger <= g.anger;
    if (win) {
      this.end('win');
      return;
    }
    if (c.limit) {
      const left = c.limit - this.t;
      if (left <= 10 && !c.warned) {
        c.warned = true;
        this.float(270, 400, '⏰ 剩 10 秒！', '#ffe066', 32, 1.4);
        FF.Audio.play('warn');
      }
      if (left <= 0) this.challengeFail('time');
    }
  },

  challengeFail(why) {
    if (this.over) return;
    this.failWhy = why;
    this.end('fail');
  },

  // 玩家自己吃了一口
  challengeOnEat() {
    const ch = this.challenge;
    if (!ch || this.over) return;
    const g = ch.goal;
    if (g.type !== 'feed') return;
    this.chal.eaten++;
    const left = g.eatLimit - this.chal.eaten;
    const B = FF.CONFIG.bowl;
    if (left < 0) {
      this.later(0.05, () => this.challengeFail('eat'));
    } else if (left <= 2) {
      this.float(B.x, B.y - 100, left === 0 ? '再吃一口她就翻臉！' : `只能再吃 ${left} 口！`, '#ff9a9a', 22, 1.4);
    }
  },

  // 餵了她一口
  // kind：love（她覺得好吃）、full（剛好熟但她吃飽了）、meh（煮太老）、yuck（生的）
  challengeOnFeed(f, st, kind) {
    const ch = this.challenge;
    if (!ch || this.over || ch.goal.type !== 'feed') return;
    if (kind === 'love') {
      this.chal.fed++;
      this.float(270, 300, `🎂 餵食 ${this.chal.fed}/${ch.goal.count}`, '#ffe066', 26, 1.3);
    } else if (kind === 'full') {
      this.float(270, 300, '她吃飽了，這口不算！等一下再餵', '#ffd0a0', 20, 1.4);
    } else {
      this.float(270, 300, '要剛好熟的才算喔', '#ffd0a0', 20, 1.2);
    }
  },

  // HUD 用的目標進度
  challengeStatus() {
    const ch = this.challenge;
    if (!ch) return null;
    const g = ch.goal;
    const c = this.chal;
    const fmt = FF.Render.fmtTime;
    let text;
    let frac;
    if (g.type === 'survive') {
      text = `撐過 ${g.time} 秒　${fmt(this.t)} / ${fmt(g.time)}`;
      frac = this.t / g.time;
    } else if (g.type === 'feed') {
      text = `餵她 ${c.fed}/${g.count}　自己吃 ${c.eaten}/${g.eatLimit}`;
      frac = c.fed / g.count;
    } else if (g.type === 'rare') {
      text = `吃到稀有食材 ${this.stats.rareEaten}/${g.count}`;
      frac = this.stats.rareEaten / g.count;
    } else if (g.type === 'score') {
      text = `分數 ${this.score}/${g.score}`;
      frac = this.score / g.score;
    } else {
      text = `怒氣降到 ${g.anger} 以下（現在 ${Math.round(this.anger)}）`;
      frac = Math.min(1, Math.max(0, (ch.setup.anger - this.anger) / (ch.setup.anger - g.anger)));
    }
    const left = c.limit ? Math.max(0, c.limit - this.t) : null;
    return { text, frac: Math.max(0, Math.min(1, frac)), left };
  },

  // 結算：標題、評語、首次過關獎勵
  finishChallenge(reason, r) {
    const ch = this.challenge;
    const s = this.save;
    const win = reason === 'win';
    let txt;
    if (win) txt = ch.win;
    else if (reason === 'quit') txt = FF.ENDINGS.quit;
    else txt = ch.lose[reason === 'fail' ? this.failWhy : reason] || ch.lose.time || ch.lose.anger;
    r.title = txt.title;
    r.line = FF.util.pick(txt.lines);
    const firstClear = win && !s.challenges.cleared.includes(ch.id);
    if (firstClear) {
      s.challenges.cleared.push(ch.id);
      r.tickets.challenge = ch.reward;
    }
    s.challenges.plays++;
    const st = this.challengeStatus();
    const idx = FF.CHALLENGES.indexOf(ch);
    const next = FF.CHALLENGES[idx + 1];
    r.challenge = {
      id: ch.id, icon: ch.icon, name: ch.name, win, firstClear, goalText: ch.goalText,
      progress: st.text, reward: ch.reward,
      next: win && next ? next.id : null,
    };
    const stars = win ? 5 : Math.max(1, Math.min(4, Math.round(st.frac * 4)));
    r.grade = {
      grade: win ? '過' : '敗',
      title: win ? `${ch.name}・過關` : `${ch.name}・失敗`,
      stars,
      color: win ? '#e0a800' : '#9a9a9a',
      comment: r.line,
    };
    const quips = [`🎯 目標：${ch.goalText}`, `📋 你的成績：${st.text}`];
    if (firstClear) quips.push(`🎉 首次過關！獲得 🎫 ${ch.reward}${next ? `，解鎖下一關「${next.name}」` : '，全部紀念日都過關了！'}`);
    r.quips = quips;
  },
});
