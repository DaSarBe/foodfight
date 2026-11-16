// 帶種子的亂數：mulberry32。同一個種子＋同配置＋同操作，就會跑出同一局
window.FF = window.FF || {};

FF.Rng = {
  mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  // 字串轉 32 位元整數（FNV-1a），每日同題用日期當種子來源
  hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  },
  // 一般模式的隨機種子（只在開局時用一次，不影響遊戲內容的可重現性）
  randomSeed() {
    try {
      const a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return a[0] >>> 0;
    } catch (e) {
      return Math.floor(Math.random() * 4294967296) >>> 0;
    }
  },
};
