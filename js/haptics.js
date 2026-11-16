// 手機震動回饋：navigator.vibrate，不支援（例如 iOS Safari）就靜默略過
window.FF = window.FF || {};

FF.Haptics = (() => {
  let enabled = true;
  const supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  function vibrate(name) {
    if (!enabled || !supported) return;
    // 使用者還沒碰過頁面時瀏覽器會擋下並在 console 警告，先自己略過
    const ua = navigator.userActivation;
    if (ua && !ua.hasBeenActive) return;
    const pattern = FF.VIBES[name];
    if (!pattern) return;
    try { navigator.vibrate(pattern); } catch (e) { /* 忽略 */ }
  }

  return {
    supported,
    vibrate,
    setEnabled(v) {
      enabled = !!v;
      // 關閉時停止正在進行的震動；使用者還沒互動過時瀏覽器會擋下並在 console 報錯，所以略過
      const ua = typeof navigator !== 'undefined' && navigator.userActivation;
      if (!enabled && supported && !(ua && !ua.hasBeenActive)) {
        try { navigator.vibrate(0); } catch (e) { /* 忽略 */ }
      }
    },
    get enabled() { return enabled; },
  };
})();
