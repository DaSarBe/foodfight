// 挑戰碼對決：戰帖的編碼／解碼、連結、勝負判定與嗆聲文案
// 碼的格式（位元組，base64url、不含補位）：
//   [0] 版本(高 4 位)｜對象性別(1 位，1＝男朋友)｜來自每日同題(1 位)｜保留 2 位
//   [1] 場地(2 位)｜她的模式(2 位)｜鍋底(2 位)
//   [2..5] 種子（uint32）
//   varint 分數、varint 存活秒數
//   暱稱長度(1 byte)＋暱稱 UTF-8（最多 10 個字、30 bytes）
//   [最後 2 bytes] CRC16 校驗（再 XOR 一個常數，避免全 0 通過）
// 校驗只防手打錯誤與傳錯，不是防作弊（碼誰都能自己編）；所以對決不上榜，也不給什麼獎勵。
window.FF = window.FF || {};

FF.Duel = (() => {
  // 順序固定寫死，之後新增場地／模式要往後加，不然舊戰帖會對不上
  const VENUE_IDS = ['city', 'market', 'beach', 'countdown'];
  const PERSONA_IDS = ['default', 'foodie', 'tsundere', 'fighter'];
  const BROTH_IDS = ['classic', 'milk', 'mala', 'yuanyang'];
  const PROD_URL = 'https://dasarbe.github.io/foodfight/';
  const XOR = 0xa5c3;

  const MSG = {
    empty: '戰帖是空的耶…你是不是忘了貼？',
    chars: '這串戰帖看起來被火鍋湯泡爛了，混進奇怪的字了。請朋友再傳一次吧！',
    short: '戰帖不完整，好像被貢丸吃掉了一半。請朋友把整串完整複製過來！',
    sum: '戰帖的字被筷子夾丟了幾個（校驗失敗）。請對方重新傳一份吧！',
    ver: '這張戰帖來自更新的版本，你的遊戲太舊啦！請重新整理頁面更新一下。',
    range: '這張戰帖的配置在我們的菜單上找不到，店員一臉疑惑。',
    fake: '這個戰績太誇張了，連服務員都不信…戰帖資料不合理。',
  };

  function crc16(bytes, n) {
    let c = 0xffff;
    for (let i = 0; i < n; i++) {
      c ^= bytes[i] << 8;
      for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
    }
    return c;
  }
  function b64enc(bytes) {
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64dec(str) {
    const s = str.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function pushVar(arr, n) {
    n = Math.max(0, Math.floor(n));
    do {
      let b = n & 0x7f;
      n = Math.floor(n / 128);
      if (n > 0) b |= 0x80;
      arr.push(b);
    } while (n > 0);
  }
  function readVar(bytes, pos) {
    let n = 0;
    let mul = 1;
    for (let i = 0; i < 5; i++) {
      if (pos.i >= bytes.length) return null;
      const b = bytes[pos.i++];
      n += (b & 0x7f) * mul;
      mul *= 128;
      if (!(b & 0x80)) return n;
    }
    return null;
  }

  // ---------- 暱稱 ----------
  const BAD = ['幹你', '幹妳', '幹他', '幹她', '幹您', '操你', '操妳', '肏', '機掰', '雞掰', '雞巴', '屌你', '三小', '他媽的', '去死', '賤人', '婊子',
    '智障', '腦殘', '妓女', 'fuck', 'shit', 'bitch', 'nigger', 'nigga', 'asshole', 'cunt', 'porn'];
  const NICK_MAX = 10;
  function cleanNick(raw) {
    let s = String(raw == null ? '' : raw)
      .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '')
      .replace(/[<>&"'`\\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    s = Array.from(s).slice(0, NICK_MAX).join('').trim();
    if (!s) return { ok: false, nick: '', reason: 'empty', msg: '暱稱不能是空白啦，連火鍋都有名字（牛奶鍋）。' };
    const flat = s.toLowerCase().replace(/[\s\-_.*,，。、!！?？~～·•|/]+/g, '');
    if (BAD.some(w => flat.includes(w))) return { ok: false, nick: s, reason: 'bad', msg: '這個暱稱太狂野了，連辣鍋都要說「冷靜」。換一個吧！' };
    return { ok: true, nick: s };
  }

  // ---------- 編碼 ----------
  function encode(d) {
    const v = Math.max(0, VENUE_IDS.indexOf(d.venue));
    const p = Math.max(0, PERSONA_IDS.indexOf(d.persona));
    const b = Math.max(0, BROTH_IDS.indexOf(d.broth));
    const arr = [];
    arr.push((FF.COMPETE.VERSION << 4) | ((d.partner === 'm' ? 1 : 0) << 3) | ((d.fromDaily ? 1 : 0) << 2));
    arr.push(v | (p << 2) | (b << 4));
    const seed = d.seed >>> 0;
    arr.push(seed >>> 24, (seed >>> 16) & 255, (seed >>> 8) & 255, seed & 255);
    pushVar(arr, d.score || 0);
    pushVar(arr, d.time || 0);
    const nick = d.nick ? cleanNick(d.nick) : { ok: false };
    const nb = nick.ok ? Array.from(new TextEncoder().encode(nick.nick)) : [];
    arr.push(nb.length);
    arr.push(...nb);
    const c = crc16(arr, arr.length) ^ XOR;
    arr.push(c >> 8, c & 255);
    return b64enc(Uint8Array.from(arr));
  }

  // 從輸入框貼上的東西抓出碼：可以是整個連結、`?duel=xxx`，或只有碼
  function extract(input) {
    let s = String(input == null ? '' : input).trim();
    const m = s.match(/[?&#]duel=([^&#\s]+)/);
    if (m) s = m[1];
    try { s = decodeURIComponent(s); } catch (e) { /* 保持原樣 */ }
    return s.replace(/^[\s"'「『（(]+|[\s"'」』）)。，,.!！]+$/g, '');
  }

  function decode(input) {
    const code = extract(input);
    if (!code) return { ok: false, reason: 'empty', msg: MSG.empty };
    if (!/^[A-Za-z0-9_-]+$/.test(code) || code.length % 4 === 1) return { ok: false, reason: 'chars', msg: MSG.chars };
    if (code.length < 14) return { ok: false, reason: 'short', msg: MSG.short };
    let bytes;
    try { bytes = b64dec(code); } catch (e) { return { ok: false, reason: 'chars', msg: MSG.chars }; }
    if (b64enc(bytes) !== code) return { ok: false, reason: 'chars', msg: MSG.chars }; // 非標準寫法（多餘的位元）一律不收
    if (bytes.length < 11) return { ok: false, reason: 'short', msg: MSG.short };
    const n = bytes.length - 2;
    const sum = ((bytes[n] << 8) | bytes[n + 1]) ^ XOR;
    if (crc16(bytes, n) !== sum) return { ok: false, reason: 'sum', msg: MSG.sum };
    const ver = bytes[0] >> 4;
    if (ver > FF.COMPETE.VERSION) return { ok: false, reason: 'ver', msg: MSG.ver };
    if (ver < 1) return { ok: false, reason: 'range', msg: MSG.range };
    const partner = bytes[0] & 8 ? 'm' : 'f';
    const fromDaily = !!(bytes[0] & 4);
    const venue = VENUE_IDS[bytes[1] & 3];
    const persona = PERSONA_IDS[(bytes[1] >> 2) & 3];
    const broth = BROTH_IDS[(bytes[1] >> 4) & 3];
    if (bytes[1] >> 6) return { ok: false, reason: 'range', msg: MSG.range };
    const seed = ((bytes[2] << 24) | (bytes[3] << 16) | (bytes[4] << 8) | bytes[5]) >>> 0;
    const pos = { i: 6 };
    const score = readVar(bytes, pos);
    const time = readVar(bytes, pos);
    if (score == null || time == null || pos.i >= n) return { ok: false, reason: 'short', msg: MSG.short };
    const nl = bytes[pos.i++];
    if (nl > 30 || pos.i + nl !== n) return { ok: false, reason: 'short', msg: MSG.short };
    let nick = '';
    if (nl) {
      try { nick = new TextDecoder('utf-8', { fatal: true }).decode(bytes.slice(pos.i, pos.i + nl)); } catch (e) { return { ok: false, reason: 'chars', msg: MSG.chars }; }
      const c = cleanNick(nick);
      nick = c.ok ? c.nick : '';
    }
    if (!FF.COMPETE.plausible(score, time)) return { ok: false, reason: 'fake', msg: MSG.fake };
    return { ok: true, data: { version: ver, partner, fromDaily, venue, persona, broth, seed, score, time, nick } };
  }

  // ---------- 連結 ----------
  const urlState = { base: null };
  function baseUrl() {
    if (urlState.base) return urlState.base;
    if (location.protocol === 'file:') return location.href.split(/[?#]/)[0];
    return PROD_URL;
  }
  const link = code => `${baseUrl()}?duel=${code}`;

  // 這一局結算出一張戰帖
  function fromResult(r, nick) {
    const c = r.comp || {};
    const code = encode({
      seed: r.seed, venue: r.venue.id, persona: r.persona.id, broth: r.broth.id, partner: c.partner || FF.G.partner(),
      nick: nick == null ? FF.Save.data.nick : nick, score: r.score, time: r.time, fromDaily: c.kind === 'daily',
    });
    return { code, url: link(code) };
  }

  // 接受戰帖後開局用的配置
  function compOpts(d) {
    return {
      kind: 'duel', seed: d.seed, venue: d.venue, persona: d.persona, broth: d.broth, partner: d.partner,
      challenger: { nick: d.nick, score: d.score, time: d.time, fromDaily: d.fromDaily },
    };
  }

  // ---------- 勝負與嗆聲 ----------
  const TAUNTS = {
    win: [
      '{nick} 說：「你居然贏我？我要回去磨筷子了。」',
      '你贏了！{nick} 的火鍋課要重修一學期。',
      '{nick} 的筷子默默流下了眼淚。（鍋裡的湯也是）',
      '漂亮！{nick} 現在正在偷偷看攻略。',
      '{nick} 看了結果沉默三秒，然後說：「再來一場。」',
    ],
    lose: [
      '{nick} 贏了。你的筷子需要一點心理諮商。',
      '輸給 {nick}？沒關係，火鍋還是熱的，你還有下一局。',
      '{nick} 微微一笑：「承讓，承讓。」好想夾他的肉片。',
      '你被 {nick} 打趴了！去練練手速再回嗆吧～',
      '{nick} 的筷子比你快一點點，真的只有一點點（大概）。',
    ],
    tie: [
      '平手！你跟 {nick} 默契好到連火鍋都不知道怎麼分勝負。',
      '同分？！你們是不是偷偷對過筷？',
    ],
  };
  const SAY = {
    win: '你贏了！回嗆一下，讓他知道誰才是火鍋之王',
    lose: '輸了不丟臉，回嗆才丟臉？（不，還是回嗆吧）',
    tie: '平手也要回嗆，不然怎麼分出勝負',
  };
  function judge(ch, r) {
    const diff = r.score - ch.score;
    const res = diff > 0 ? 'win' : diff < 0 ? 'lose' : 'tie';
    const nick = ch.nick || '對方';
    const taunt = FF.util.vpick(TAUNTS[res]);
    return {
      result: res,
      diff,
      nick,
      hasNick: !!ch.nick,
      taunt, // 含 {nick} 佔位字，顯示時用 fill()
      title: res === 'win' ? '對決獲勝！🏆' : res === 'lose' ? '對決落敗…😭' : '平手！🤝',
      say: SAY[res],
      theirs: { score: ch.score, time: ch.time },
    };
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // 把 {nick} 換成不會被性別字詞替換的元素（暱稱可能剛好含「她」「女友」）
  const fill = (text, nick) => esc(text).replace(/\{nick\}/g, `<b data-notr>${esc(nick)}</b>`);

  function shareText(r, d) {
    const label = `${r.venue.icon} ${r.venue.name}・${r.persona.icon} ${r.persona.name}・${r.broth.icon} ${r.broth.name}`;
    const nm = (FF.Save.data.nick || '').trim();
    return FF.G.t(`🍲 搶火鍋大作戰・對決戰帖\n${nm ? nm + ' 在' : '我在'}「${label}」拿了 ${r.score} 分，撐了 ${FF.Render.fmtTime(r.time)}！\n（對象是${FF.G.words().partner}）敢跟我決鬥嗎？👇\n${d.url}`);
  }

  return {
    encode, decode, extract, link, baseUrl, fromResult, compOpts, judge, fill, cleanNick, shareText, esc, MSG, NICK_MAX,
    VENUE_IDS, PERSONA_IDS, BROTH_IDS, urlState,
  };
})();
