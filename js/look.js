// 對象外觀、名字、照片頭像、筷子櫃的邏輯（資料在 look-data.js，畫法在 look-draw.js，介面在 ui-look.js）
window.FF = window.FF || {};

// ---------- 外觀 ----------
FF.Look = (() => {
  const S = () => FF.Save.data;
  const darken = (hex, f) => {
    const n = parseInt(hex.slice(1), 16);
    const c = k => Math.max(0, Math.min(255, Math.round(((n >> k) & 255) * f)));
    return `rgb(${c(16)},${c(8)},${c(0)})`;
  };
  const mix = (hex, to, k) => {
    const a = parseInt(hex.slice(1), 16);
    const b = parseInt(to.slice(1), 16);
    const c = s => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
    return `rgb(${c(16)},${c(8)},${c(0)})`;
  };

  // 自訂外觀 → 畫圖用的 ap（跟 persona.look 同一種格式，另外多了 skin／eyes／brows／blush／outfit／fest）
  function toAp(L, male) {
    const fest = FF.LOOK.fests.find(f => f.id === L.fest);
    const ap = {
      hair: L.hair, style: L.style, shirt: fest && fest.shirt ? fest.shirt : L.shirt, acc: L.acc, accColor: L.accColor, male: !!male,
      skin: L.skin, eyes: L.eyes, brows: L.brows, blush: L.blush, outfit: L.outfit, fest: L.fest, custom: true,
    };
    return ap;
  }

  // 這個性別現在實際用的外觀：自訂開著就用自訂，不然跟著模式
  function apFor(persona, g, opts) {
    const male = g === 'm';
    const base = (male && persona.lookM) || persona.look;
    if (opts && opts.follow) return base;
    const L = (opts && opts.look) || S().look[g];
    return L && L.on ? toAp(L, male) : base;
  }

  const get = g => S().look[g === 'm' ? 'm' : 'f'];
  const isCustom = g => !!get(g).on;

  // 改外觀（會存檔、累計「造型師」成就用的次數）。只有自訂模式下改的才算
  function patch(g, obj, opts) {
    const L = get(g);
    const wasOn = L.on;
    Object.assign(L, obj);
    L.on = true;
    const clean = FF.LOOK.sanitize(L, g);
    Object.assign(L, clean);
    if (!(opts && opts.silent)) S().life.styled = (S().life.styled || 0) + 1;
    FF.Save.persist();
    return !wasOn;
  }
  function setMode(g, on) {
    get(g).on = !!on;
    FF.Save.persist();
  }
  function reset(g) {
    const L = get(g);
    const keepPhoto = L.photo;
    Object.assign(L, FF.LOOK.defaults(g), { photo: keepPhoto, on: false });
    FF.Save.persist();
  }
  function randomize(g, rnd) {
    const L = get(g);
    Object.assign(L, FF.LOOK.random(g, rnd), { photo: L.photo });
    S().life.styled = (S().life.styled || 0) + 1;
    FF.Save.persist();
  }

  // 名字
  function setName(g, raw) {
    const r = FF.Name.check(raw);
    if (!r.ok) return r;
    S().names[g === 'm' ? 'm' : 'f'] = r.name;
    FF.Save.persist();
    FF.G.refresh();
    return r;
  }
  const nameOf = g => S().names[g === 'm' ? 'm' : 'f'] || '';

  return { toAp, apFor, get, isCustom, patch, setMode, reset, randomize, setName, nameOf, darken, mix };
})();

// ---------- 照片頭像（只存在這台裝置，另一個 localStorage key，不進存檔、不上傳雲端、不進戰帖）----------
FF.Photo = (() => {
  const KEY = 'foodfight_photo_v1';
  const OK = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
  const MAX_LEN = 90000; // dataURL 字元數上限（約 65KB）
  let data = null;
  const imgs = {}; // g → { src, img, state: 'loading'|'ok'|'bad' }

  function load() {
    data = { f: '', m: '' };
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && typeof raw === 'object') {
        for (const g of ['f', 'm']) if (typeof raw[g] === 'string' && raw[g].length <= MAX_LEN && OK.test(raw[g])) data[g] = raw[g];
      }
    } catch (e) { /* 損毀就當沒有 */ }
    return data;
  }
  const d = () => data || load();
  const has = g => !!d()[g === 'm' ? 'm' : 'f'];
  const raw = g => d()[g === 'm' ? 'm' : 'f'];

  // 回傳 false＝寫入失敗（空間不足）
  function set(g, url) {
    const k = g === 'm' ? 'm' : 'f';
    if (typeof url !== 'string' || url.length > MAX_LEN || !OK.test(url)) return false;
    const prev = d()[k];
    d()[k] = url;
    if (!write()) { d()[k] = prev; return false; }
    delete imgs[k];
    return true;
  }
  function remove(g) {
    const k = g === 'm' ? 'm' : 'f';
    d()[k] = '';
    write();
    delete imgs[k];
  }
  function write() {
    try {
      localStorage.setItem(KEY, JSON.stringify(d()));
      return true;
    } catch (e) {
      return false; // QuotaExceededError、無痕模式
    }
  }
  // 畫圖用：解碼好才回傳 Image，解碼中或壞掉回傳 null（壞掉的照片當沒有，不會讓遊戲當掉）
  function img(g) {
    const k = g === 'm' ? 'm' : 'f';
    const src = d()[k];
    if (!src) return null;
    let e = imgs[k];
    if (!e || e.src !== src) {
      const im = new Image();
      e = imgs[k] = { src, img: im, state: 'loading' };
      im.onload = () => { e.state = im.naturalWidth > 0 ? 'ok' : 'bad'; };
      im.onerror = () => { e.state = 'bad'; };
      im.src = src;
    }
    return e.state === 'ok' ? e.img : null;
  }
  // 這個性別現在要不要用照片（有照片、開關開著、圖是好的）
  const active = g => has(g) && !!FF.Look.get(g).photo && !!img(g);
  return { load, has, raw, set, remove, img, active, KEY, get data() { return d(); } };
})();

// ---------- 筷子櫃 ----------
FF.Chops = (() => {
  const S = () => FF.Save.data;
  const owned = id => {
    const c = FF.chopById(id);
    if (!c.price && !c.ach) return true;
    if (c.ach) return S().achievements.includes(c.ach);
    return S().chops.own.includes(c.id);
  };
  const status = c => ({
    owned: owned(c.id), equipped: S().chops.equip === c.id, price: c.price || 0,
    cond: c.ach ? (FF.ACHIEVEMENTS.find(a => a.id === c.ach) || {}) : null,
  });
  function buy(id) {
    const c = FF.chopById(id);
    if (!c.price || owned(id) || S().tickets < c.price) return false;
    S().tickets -= c.price;
    S().chops.own.push(id);
    FF.Save.persist();
    if (FF.Progress) FF.Progress.recheck();
    return true;
  }
  function equip(id) {
    if (!FF.CHOPS.some(c => c.id === id) || !owned(id)) return false;
    S().chops.equip = id;
    FF.Save.persist();
    return true;
  }
  const equipped = () => {
    const id = S().chops.equip;
    return owned(id) ? id : 'plain';
  };
  const ownedCount = () => FF.CHOPS.filter(c => owned(c.id)).length;
  return { owned, status, buy, equip, equipped, ownedCount };
})();
