// 對象外觀（捏臉＋服裝）、對象名字、筷子造型的資料與驗證（純資料，不碰畫面）
// 載入順序：要在 save.js 之前（存檔 sanitize 會用到這裡的清單）。畫法在 look-draw.js，邏輯在 look.js，介面在 ui-look.js。
window.FF = window.FF || {};

// ---------- 對象外觀 ----------
FF.LOOK = (() => {
  const L = (id, name, extra) => Object.assign({ id, name }, extra || {});
  const styleF = [
    L('long', '長直髮'), L('twin', '雙馬尾'), L('buns', '丸子頭'), L('short', '高馬尾'),
    L('bob', '鮑伯頭'), L('braid', '側麻花辮'), L('wave', '大波浪'),
  ];
  const styleM = [
    L('crew', '清爽短髮'), L('buzz', '圓寸'), L('spiky', '刺蝟頭'), L('crop', '運動平頭'),
    L('side', '旁分西裝頭'), L('manbun', '武士丸子頭'), L('curly', '爆炸捲毛'),
  ];
  const hairColors = [
    L('#2a2a33', '墨黑'), L('#4a2c22', '咖啡'), L('#7a4426', '栗色'), L('#c98a3a', '蜂蜜'), L('#e8c36a', '金黃'),
    L('#d0d0da', '銀灰'), L('#f08aa8', '粉紅'), L('#7a5cd6', '紫'), L('#3a8ad8', '湛藍'), L('#e8414f', '火紅'), L('#3fae6a', '薄荷'),
  ];
  const skins = [
    L('#ffe0c7', '白皙'), L('#ffd6d0', '粉嫩'), L('#f7cfa8', '自然'), L('#e8b98a', '小麥'),
    L('#c98f5f', '古銅'), L('#8f5e3c', '深棕'), L('#bfe8a8', '史萊姆綠'),
  ];
  const eyes = [L('round', '圓眼'), L('big', '閃亮大眼'), L('sleepy', '睡眼'), L('cat', '貓眼'), L('dot', '豆豆眼')];
  const brows = [L('auto', '預設'), L('thin', '細柳眉'), L('thick', '粗眉'), L('arch', '挑眉'), L('flat', '一字眉')];
  const accsF = [
    L('none', '無'), L('glasses', '圓框眼鏡'), L('shades', '墨鏡'), L('mask', '口罩'), L('clip', '髮夾'), L('ribbon', '側邊蝴蝶結'),
    L('bow', '頭頂大蝴蝶結'), L('catears', '貓耳髮箍'), L('flower', '小花'), L('headband', '運動頭帶'), L('bib', '圍兜兜'),
    L('scarf', '圍巾'), L('beanie', '毛帽'),
  ];
  const accsM = [
    L('none', '無'), L('glasses', '圓框眼鏡'), L('shades', '墨鏡'), L('mask', '口罩'), L('cap', '棒球帽'), L('beanie', '毛帽'),
    L('headband', '運動頭帶'), L('bib', '圍兜兜'), L('scarf', '圍巾'), L('catears', '貓耳髮箍'),
  ];
  const outfits = [
    L('tee', 'T 恤'), L('hoodie', '連帽衫'), L('stripe', '橫條紋'), L('collar', '襯衫領'), L('heart', '愛心印花'), L('overall', '背帶褲'),
  ];
  const shirtColors = [
    L('#ff8fb1', '蜜桃粉'), L('#6fb3e8', '天空藍'), L('#ffc94a', '檸檬黃'), L('#b89cff', '薰衣紫'), L('#e8414f', '辣椒紅'),
    L('#4fae6a', '森林綠'), L('#f4f4f4', '純白'), L('#33343c', '墨黑'), L('#ff9a3c', '橘子'), L('#2f4a8a', '海軍藍'),
  ];
  // 節慶服：會蓋掉上衣顏色，並加上對應的帽子（跟頭上的配件會打架的配件，穿節慶服時不畫）
  const fests = [
    L('none', '不穿', { icon: '👕' }),
    L('xmas', '聖誕裝', { icon: '🎄', shirt: '#d8262f' }),
    L('cny', '過年唐裝', { icon: '🧧', shirt: '#d7261e' }),
    L('halloween', '萬聖節', { icon: '🎃', shirt: '#ff8a1f' }),
    L('party', '生日派對', { icon: '🎉', shirt: '#4cc3e8' }),
  ];
  const HEAD_ACCS = ['bow', 'catears', 'flower', 'cap', 'beanie', 'headband'];

  const defaultsF = { on: false, photo: false, style: 'long', hair: '#4a2c22', skin: '#ffe0c7', eyes: 'round', brows: 'auto', blush: true, acc: 'clip', accColor: '#ff6fa5', outfit: 'tee', shirt: '#ff8fb1', fest: 'none' };
  const defaultsM = { on: false, photo: false, style: 'crew', hair: '#2a2a33', skin: '#ffe0c7', eyes: 'round', brows: 'auto', blush: true, acc: 'none', accColor: '#ffffff', outfit: 'tee', shirt: '#6fb3e8', fest: 'none' };

  const lists = g => ({
    style: g === 'm' ? styleM : styleF, acc: g === 'm' ? accsM : accsF, hair: hairColors, skin: skins, eyes, brows, outfit: outfits,
    shirt: shirtColors, accColor: shirtColors, fest: fests,
  });
  const HEX = /^#[0-9a-fA-F]{6}$/;
  const defaults = g => Object.assign({}, g === 'm' ? defaultsM : defaultsF);

  // 檢查一套外觀：缺的欄位、不認得的值都退回預設（舊存檔、損毀存檔、雲端還原都走這裡）
  function sanitize(raw, g) {
    const d = defaults(g);
    if (!raw || typeof raw !== 'object') return d;
    const ls = lists(g);
    d.on = raw.on === true;
    d.photo = raw.photo === true;
    ['style', 'acc', 'eyes', 'brows', 'outfit', 'fest'].forEach(k => {
      if (typeof raw[k] === 'string' && ls[k].some(o => o.id === raw[k])) d[k] = raw[k];
    });
    ['hair', 'skin', 'shirt', 'accColor'].forEach(k => {
      if (typeof raw[k] === 'string' && HEX.test(raw[k])) d[k] = raw[k].toLowerCase();
    });
    if (typeof raw.blush === 'boolean') d.blush = raw.blush;
    return d;
  }

  const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length) % arr.length];
  // 隨機一套（保留 on / photo 狀態由呼叫端決定）
  function random(g, rnd = Math.random) {
    const ls = lists(g);
    return {
      on: true, photo: false,
      style: pick(ls.style, rnd).id, hair: pick(ls.hair, rnd).id, skin: pick(ls.skin.slice(0, 6), rnd).id,
      eyes: pick(ls.eyes, rnd).id, brows: pick(ls.brows, rnd).id, blush: rnd() < 0.6,
      acc: pick(ls.acc, rnd).id, accColor: pick(ls.accColor, rnd).id, outfit: pick(ls.outfit, rnd).id,
      shirt: pick(ls.shirt, rnd).id, fest: rnd() < 0.25 ? pick(ls.fest.slice(1), rnd).id : 'none',
    };
  }

  return { styleF, styleM, hairColors, skins, eyes, brows, accsF, accsM, outfits, shirtColors, fests, HEAD_ACCS, lists, defaults, sanitize, random, HEX };
})();

// ---------- 對象名字 ----------
FF.Name = (() => {
  const MAX = 6;
  const BAD = ['幹你', '幹妳', '幹他', '幹她', '幹您', '操你', '操妳', '肏', '機掰', '雞掰', '雞巴', '屌你', '三小', '他媽的', '去死', '賤人', '婊子',
    '智障', '腦殘', '妓女', 'fuck', 'shit', 'bitch', 'nigger', 'nigga', 'asshole', 'cunt', 'porn'];
  // 回傳 { ok, name, msg }：空白＝ok 但 name 為 ''（用預設稱呼）
  function check(raw) {
    let s = String(raw == null ? '' : raw)
      .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '')
      .replace(/[<>&"'`\\{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    s = Array.from(s).slice(0, MAX).join('').trim();
    if (!s) return { ok: true, name: '' };
    const flat = s.toLowerCase().replace(/[\s\-_.*,，。、!！?？~～·•|/]+/g, '');
    if (BAD.some(w => flat.includes(w))) return { ok: false, name: '', msg: '這個名字太狂野了，連辣鍋都要說「冷靜」。換一個吧！' };
    return { ok: true, name: s };
  }
  const clean = raw => check(raw).name;
  return { MAX, check, clean, BAD };
})();

// ---------- 筷子造型（純外觀，不影響數值）----------
// price：用飯票買；ach：由成就解鎖（成就 id）；都沒寫＝一開始就有
FF.CHOPS = [
  { id: 'plain', name: '免洗筷', icon: '🥢', desc: '最樸實的選擇，店家附的，用完即丟（但你不會丟）。' },
  { id: 'steel', name: '鐵筷', icon: '🔩', price: 150, desc: '韓式風格，冰冰涼涼，夾肉時有種工業風的專業感。' },
  { id: 'lacquer', name: '紅漆筷', icon: '🏮', price: 300, desc: '紅漆配金環，吃火鍋像在吃滿漢全席。' },
  { id: 'spoon', name: '湯匙', icon: '🥄', price: 500, desc: '雙手各拿一支湯匙搶肉。理論上不方便，實際上更不方便。' },
  { id: 'fork', name: '叉子', icon: '🍴', price: 500, desc: '叉就對了！她會懷疑你是不是走錯餐廳。' },
  { id: 'tongs', name: '夾子', icon: '🦞', price: 800, desc: '燒烤店的專業夾子，夾得很有氣勢，彈簧還會晃。' },
  { id: 'saber', name: '光劍筷', icon: '⚔️', price: 1500, desc: '會發光的筷子。願原力與你同在，願肉片與你同在。' },
  { id: 'gold', name: '金筷', icon: '👑', ach: 'wingchun', desc: '成就解鎖：詠春傳人。閃亮亮的，閃躲得越多越亮（心理作用）。' },
  { id: 'scallion', name: '一雙蔥', icon: '🧅', ach: 'sucker', desc: '成就解鎖：好騙王。服務員送你的安慰獎：蔥。對，就是蔥。' },
  { id: 'rainbow', name: '彩虹筷', icon: '🌈', ach: 'anniv', desc: '成就解鎖：紀念日從來不會忘。通過全部紀念日挑戰才配拿的七彩筷。' },
];
FF.chopById = id => FF.CHOPS.find(c => c.id === id) || FF.CHOPS[0];
