// 競技模式：對決（戰帖）與每日同題共用的規則（掛在 FF.Game 上）
//  - 能力統一：所有永久升級固定在 FF.COMPETE.level 級，不受玩家商店升級影響；不能用道具
//  - 場地／她的模式／鍋底由戰帖或日期決定，沒解鎖也能玩（只限這局）
//  - 飯票獎勵比一般局少；不計入一般最高紀錄與場地解鎖
//  - 同種子＋同配置＋同操作＝同一局（見 rng.js）
window.FF = window.FF || {};

FF.COMPETE = {
  VERSION: 1,           // 戰帖格式版本
  level: 3,
  ticketMul: 0.3,       // 一般局算出來的飯票 × 0.3
  ticketCap: 25,        // 每局最多 25 張
  ticketMin: 3,         // 保底 3 張（安慰獎）
  upgrades() {
    const o = {};
    FF.UPGRADES.forEach(u => (o[u.id] = Math.min(u.max, FF.COMPETE.level)));
    return o;
  },
  tickets(total, comp) {
    const C = FF.COMPETE;
    return Math.max(C.ticketMin, Math.min(C.ticketCap, Math.round(total * C.ticketMul)));
  },
  // 合理性檢查（戰帖、排行榜上傳共用）：存活時間上限 30 分鐘；分數不可能高過「基本分 + 時間 × 每秒最高得分」
  // 模擬玩家（統一 Lv.3）最高約 28 分／秒，這裡放寬到 50 分／秒（firestore.rules 的數值要一起改）
  limits: { maxTime: 1800, scorePerSec: 50, scoreBase: 200, maxScore: 60000 },
  plausible(score, time) {
    const L = FF.COMPETE.limits;
    if (!Number.isFinite(score) || !Number.isFinite(time) || score < 0 || time < 0) return false;
    if (time > L.maxTime || score > L.maxScore) return false;
    return score <= L.scoreBase + time * L.scorePerSec;
  },
};

Object.assign(FF.Game.prototype, {
  // 一局結束時（end() 裡、發飯票之前）：記錄每日成績、判定對決勝負
  finishCompete(r) {
    const c = this.comp;
    r.comp = {
      kind: c.kind, seed: c.seed, venue: c.venue, persona: c.persona, broth: c.broth, partner: FF.G.partner(),
      practice: !!c.practice, dateKey: c.dateKey || '', challenger: c.challenger || null,
    };
    if (c.kind === 'daily') {
      r.comp.official = FF.Daily.recordRun(c, r);
      r.comp.streak = FF.Daily.streak();
    }
    if (c.challenger) r.duel = FF.Duel.judge(c.challenger, r);
  },
});
