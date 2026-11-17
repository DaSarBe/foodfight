// 對象是女朋友還是男朋友？你自己又是男友還是女友？（不預設異性戀，兩個設定各自獨立）
// 文案怎麼換：所有文案「原文」都照預設（對象是女友、你是男友）寫，顯示時才由 FF.G.t 一次換掉：
//   女朋友／女友／她／小姐／寵妻 → 指「對象」，隨 partner 變成 男朋友／男友／他／先生／寵夫
//   男朋友／男友／先生       → 指「你自己」，隨 me 變成 女朋友／女友／小姐
// 所以不用維護兩份文案；DOM 由 MutationObserver 自動換（原文存在 WeakMap，切換時從原文重換，不會越換越亂），
// 畫布文字由 CanvasRenderingContext2D 的 fillText／strokeText／measureText 包一層。
// 換了性別後不自然的少數台詞，在 OVERRIDES 寫男友專屬版本（以原文為鍵）。
// 規則：丟給畫面（DOM／畫布）的字串一律放原文，不要先 FF.G.t 再丟（會換兩次）；
//       只有不經過畫面的出口（分享文字、剪貼簿）才自己呼叫 FF.G.t。暱稱要放進 data-notr 的元素，畫布上用 ctx.__notr = true。
window.FF = window.FF || {};

FF.G = (() => {
  let override = null; // 競技局（戰帖）的對象性別，只在這一局有效，不寫進存檔
  const save = () => (FF.Save && FF.Save.data) || {};
  const opp = g => (g === 'f' ? 'm' : 'f');

  // 對象是男朋友時，把原文裡女生口吻或不自然的「詞」換成男生版（子字串取代，所以長句被換行拆開也沒關係）
  const OVERRIDES = {
    '閨蜜': '兄弟',
    '討厭啦': '你很煩欸',
    '英雄救美': '英雄救帥',
    '夫妻臉': '情侶臉',
    '辣妹': '猛男',
    '減肥喔': '減脂喔',
  };
  const OV_KEYS = Object.keys(OVERRIDES);
  const OV_RE = new RegExp(OV_KEYS.join('|'), 'g');

  // 男朋友的專屬口吻（對象是男朋友時，台詞優先用這份；沒有列到的 key 才用共用的 FF.LINES）
  // 原文一樣照「對象是女友、你是男友」的稱呼寫（會經過 FF.G.t 換成實際稱呼）
  const MALE_LINES = {
    start: ['今天我請客，但你別想贏我', '先說好，蝦子都是我的，兄弟也一樣', '開動！手腳快一點，別讓我等'],
    claim: ['這塊我的，誰動誰是狗', '這個我要，不要跟我搶喔', '那塊留給我，男人說話算話'],
    steal: ['欸！那是我先看到的！', '你很故意欸，兄弟', '我筷子都伸過去了耶！', '靠，你搶我的？'],
    claimStolen: ['我不是說那是我的嗎！？', '好，你完了', '你今天膽子很大喔'],
    eat: ['嗯，讚啦', '這家真的可以', '燙燙燙…但是香', '哈，好吃'],
    eatFav: ['我最愛這個了！', '靠，太幸福了吧', '還是你最懂我'],
    strike: ['想得美', '給我放下', '哈，打到了', '你的筷子太慢了啦，兄弟'],
    angry: ['我真的要發火了喔', '你今天是來吃火鍋還是來找碴的？', '再搶一個試試看，男人也是會生氣的'],
    hungry: ['你怎麼都不吃？在減脂喔？', '你都讓我吃，夠意思欸', '多吃一點啦，不要客氣'],
    cute: ['哼…算了，原諒你一次', '你很煩欸', '好啦好啦，不氣了不氣了'],
    fedLove: ['啊——嗯！好吃', '你今天怎麼這麼乖', '嘿嘿，再一口', '好啦，原諒你一點點'],
    fedFull: ['我吃不下了啦，你自己吃', '你是在養豬嗎？', '夠了夠了，換你吃'],
    ultCute: ['…好啦，不掃了', '你這樣撒嬌我怎麼放大招啦，噁心死了'],
    ultComboLose: ['連打成功！耶！', '跟我鬥？你還早一百年', '哈，下次再練練'],
    chWin: ['耶，今天你過關了！', '嘿嘿，算你有心', '這個紀念日我記住了'],
    chLose: ['唉…下次再努力吧', '你喔…真的是', '我們再來一次吧，兄弟'],
  };

  const RE = /女朋友|男朋友|女友|男友|寵妻|小姐|先生|她/g;
  const QUICK = new RegExp('[她女男]|寵妻|小姐|先生|' + OV_KEYS.join('|'));
  const UNITS = new RegExp('女朋友|男朋友|女友|男友|寵妻|小姐|先生|' + OV_KEYS.join('|') + '|[\\s\\S]', 'gu');

  function partner() { return override || (save().partner === 'm' ? 'm' : 'f'); }
  function me() {
    const s = save().me;
    return s === 'm' || s === 'f' ? s : opp(partner());
  }
  // 預設狀態（對象是女友、你是男友）時，原文就是顯示文字
  const isDefault = () => partner() === 'f' && me() === 'm';

  function swap(m) {
    const p = partner() === 'f';
    const y = me() === 'm';
    switch (m) {
      case '女朋友': return p ? '女朋友' : '男朋友';
      case '女友': return p ? '女友' : '男友';
      case '她': return p ? '她' : '他';
      case '小姐': return p ? '小姐' : '先生';
      case '寵妻': return p ? '寵妻' : '寵夫';
      case '男朋友': return y ? '男朋友' : '女朋友';
      case '男友': return y ? '男友' : '女友';
      case '先生': return y ? '先生' : '小姐';
      default: return m;
    }
  }

  function t(s) {
    if (typeof s !== 'string' || !QUICK.test(s)) return s;
    if (partner() === 'm') s = s.replace(OV_RE, k => OVERRIDES[k]);
    if (isDefault()) return s;
    return s.replace(RE, swap);
  }

  // 換行用：把「女友」這類詞當一個單位，不會被拆在兩行之間
  const units = s => String(s).match(UNITS) || [];

  // ---------- DOM ----------
  const state = new WeakMap(); // 文字節點 → { src 原文, out 目前顯示 }
  function skip(n) {
    const el = n.nodeType === 1 ? n : n.parentElement;
    return !el || !!el.closest('[data-notr]') || el.tagName === 'SCRIPT' || el.tagName === 'STYLE';
  }
  function doText(n) {
    if (skip(n)) return;
    const st = state.get(n);
    const src = st && n.nodeValue === st.out ? st.src : n.nodeValue;
    if (!st && !QUICK.test(src)) return;
    const out = t(src);
    if (out !== n.nodeValue) n.nodeValue = out;
    state.set(n, { src, out });
  }
  function doAttrs(el) {
    if (!el.getAttribute) return;
    for (const a of ['aria-label', 'title', 'placeholder']) {
      const v = el.getAttribute(a);
      if (v == null) continue;
      const key = 'data-src-' + a;
      const prev = el.getAttribute(key);
      const cur = el.getAttribute(a);
      // 這個屬性上一次是我們換的就從原文重換；否則把現在的值當原文
      const src = prev != null && el.__ffOut && el.__ffOut[a] === cur ? prev : cur;
      if (prev == null && !QUICK.test(src)) continue;
      const out = t(src);
      el.setAttribute(key, src);
      (el.__ffOut = el.__ffOut || {})[a] = out;
      if (out !== cur) el.setAttribute(a, out);
    }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    if (skip(root)) return;
    doAttrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) doText(n);
      else doAttrs(n);
    }
  }
  function refresh() {
    walk(document.getElementById('game'));
    document.body.classList.toggle('partner-m', partner() === 'm');
  }

  let started = false;
  function start() {
    if (started || typeof MutationObserver === 'undefined') return;
    started = true;
    const root = document.getElementById('game');
    new MutationObserver(list => {
      for (const m of list) {
        if (m.type === 'characterData') doText(m.target);
        else if (m.type === 'childList') m.addedNodes.forEach(n => walk(n));
      }
    }).observe(root, { subtree: true, childList: true, characterData: true });
    refresh();
  }

  // ---------- 畫布：包一層，所有 fillText／strokeText／measureText 都會換 ----------
  if (typeof CanvasRenderingContext2D !== 'undefined') {
    const P = CanvasRenderingContext2D.prototype;
    ['fillText', 'strokeText', 'measureText'].forEach(fn => {
      const orig = P[fn];
      P[fn] = function (text, ...rest) {
        if (!this.__notr && typeof text === 'string') text = t(text);
        return orig.call(this, text, ...rest);
      };
    });
  }

  return {
    t,
    units,
    partner,
    me,
    start,
    refresh,
    OVERRIDES,
    MALE_LINES,
    isDefault,
    // 稱呼（給程式組字用；也都是以「顯示出來的字」為準，不要再丟進 t）
    words() {
      const p = partner() === 'f';
      return { partner: p ? '女朋友' : '男朋友', pn: p ? '女友' : '男友', ta: p ? '她' : '他', me: me() === 'm' ? '男友' : '女友', icon: p ? '👧' : '👦' };
    },
    setPartner(g) {
      const s = save();
      s.partner = g === 'm' ? 'm' : 'f';
      FF.Save.persist();
      refresh();
    },
    setMe(g) {
      const s = save();
      s.me = g === 'm' || g === 'f' ? g : 'auto';
      FF.Save.persist();
      refresh();
    },
    // 競技局：這一局的對象性別以戰帖為準（null＝回到存檔設定）
    setOverride(g) {
      const next = g === 'm' || g === 'f' ? g : null;
      if (next === override) return;
      override = next;
      refresh();
    },
    get override() { return override; },
  };
})();
