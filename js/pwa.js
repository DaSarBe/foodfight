// 加到主畫面＋全螢幕提醒（PWA）：註冊 Service Worker、攔截安裝事件、iOS 圖解、提醒時機、全螢幕
window.FF = window.FF || {};

FF.PWA = (() => {
  let deferred = null;
  const listeners = [];
  const emit = () => listeners.forEach(f => { try { f(); } catch (e) { /* ignore */ } });
  const DAY = 86400000;
  let nowFn = () => Date.now();

  // 幽默詼諧的提醒文案（輪播）
  const LINES = [
    '加到主畫面再玩，沒有網址列擋著，才看得清楚對象的筷子是從哪裡伸過來的。',
    '全螢幕玩火鍋，視野大三成，被偷襲的機率少三成（數據是瞎掰的，但感覺是真的）。',
    '手機震動回饋，在全螢幕玩特別有感。筷子被打掉的時候，你的手也會一起痛。',
    '加到主畫面之後，點一下圖示就開吃，比對象回訊息還快。',
    '把火鍋放在主畫面，肚子餓的時候第一個想到的就是它（搶輸對象的時候也是）。',
    '網址列會偷偷吃掉你的螢幕，那是你的肉片位置啊！加到主畫面還給你。',
    '離線也能玩！沒訊號的火鍋店、地下室、山上，都能搶肉。',
    '圖示放主畫面，對象問你在玩什麼，你可以回「在研究食譜」。',
  ];

  const standalone = () => {
    try {
      return ['standalone', 'fullscreen', 'minimal-ui'].some(m => window.matchMedia(`(display-mode: ${m})`).matches) || navigator.standalone === true;
    } catch (e) {
      return false;
    }
  };
  const isIOS = () => {
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };
  const fsEnabled = () => !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);
  const S = () => FF.Save.data.pwa;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    S().installed = true;
    FF.Save.persist();
    emit();
  });

  // file:// 下不能註冊 Service Worker（也不需要），其他情況註冊失敗就算了
  function register() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return Promise.resolve(null);
    return navigator.serviceWorker.register('sw.js').then(reg => {
      FF.PWA.reg = reg;
      return reg;
    }).catch(() => null);
  }

  // 有辦法「做點什麼」才提醒：Android／桌面 Chrome 有安裝事件、iOS 有圖解
  const canAct = () => !!deferred || isIOS();

  // 該不該在結算時跳提醒：不在 standalone、沒按過「別再提醒」、至少玩過 2 局；按過「之後再說」要隔 3 天且再玩 2 局
  function shouldNag() {
    const s = S();
    const d = FF.Save.data;
    if (standalone() || s.installed || s.never) return false;
    if (!canAct()) return false;
    if (d.runs < 2) return false;
    if (s.later && (nowFn() - s.later < 3 * DAY || d.runs - s.laterRuns < 2)) return false;
    return true;
  }

  async function install() {
    if (!deferred) return 'none';
    const e = deferred;
    deferred = null;
    try {
      e.prompt();
      const r = await e.userChoice;
      if (r && r.outcome === 'accepted') {
        S().installed = true;
        FF.Save.persist();
        return 'accepted';
      }
      return 'dismissed';
    } catch (err) {
      return 'error';
    } finally {
      emit();
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      return true;
    } catch (e) {
      return false;
    }
  }

  let lineIdx = Math.floor(Math.random() * LINES.length);
  const nextLine = () => LINES[lineIdx++ % LINES.length];

  return {
    LINES, standalone, isIOS, fsEnabled, canAct, shouldNag, install, register, toggleFullscreen, nextLine,
    get canInstall() { return !!deferred; },
    onChange(fn) { listeners.push(fn); },
    later() { const s = S(); s.later = nowFn(); s.laterRuns = FF.Save.data.runs; FF.Save.persist(); },
    never() { S().never = true; FF.Save.persist(); },
    asked() { S().asked++; FF.Save.persist(); },
    setNow(fn) { nowFn = fn || (() => Date.now()); },
    reg: null,
  };
})();
