// Firebase 設定：把 Firebase 主控台「專案設定 → 你的應用程式 → SDK 設定與配置」裡的內容貼在下面（見 FIREBASE_SETUP.md）。
// 目前是空的 placeholder：沒填的話，排行榜、雲端存檔等雲端功能會自動隱藏（或顯示「尚未開放」），
// 遊戲其他部分完全不受影響，也不會去下載 Firebase SDK。
// 這些設定值本來就是公開的（不是密碼），真正的保護在 Firestore 安全規則（firestore.rules）。
window.FF = window.FF || {};

FF.FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

// 從 Google 的 CDN（gstatic）以 ES module 動態載入的 SDK 版本
FF.FIREBASE_SDK_VERSION = '10.14.1';
