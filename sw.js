// Service Worker：讓遊戲可以安裝、可以離線玩
// 快取策略（避免更新後玩家卡在舊版）：
//  - 同網域的 HTML／JS／CSS／圖片：network-first。有網路就一律向伺服器要最新的（cache: 'no-cache'＝每次都重新驗證，沒變就 304，很省），
//    成功後才更新快取；網路失敗或超過 4 秒沒回應才用快取。所以部署新版後，玩家重新整理（或下次打開）就是新版，不會被舊快取卡住。
//  - 快取名稱帶版本號，啟用新版 SW 時會刪掉所有舊版本的快取。
//  - 不是同網域的請求（Firebase、Google 登入、gstatic SDK…）完全不碰，不快取、不攔截。
//  - 只處理 GET。
const VERSION = 'v3-1';
const CACHE = 'foodfight-' + VERSION;
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/config.js', 'js/venues.js', 'js/content.js', 'js/save.js', 'js/gender.js', 'js/rng.js', 'js/audio.js', 'js/music.js', 'js/haptics.js',
  'js/game.js', 'js/variants.js', 'js/challenge.js', 'js/progress.js', 'js/events.js', 'js/specials.js', 'js/compete.js', 'js/duel.js',
  'js/daily.js', 'js/render.js', 'js/scenes.js', 'js/share.js', 'js/firebase-config.js', 'js/cloud.js', 'js/cloud-firebase.js', 'js/pwa.js',
  'js/ui-panels.js', 'js/ui.js', 'js/ui-extra.js', 'js/main.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 逐一加入，某個檔案抓失敗也不要讓整個安裝失敗
    await Promise.all(CORE.map(u => fetch(u, { cache: 'reload' }).then(r => (r.ok ? cache.put(u, r) : null)).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('foodfight-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

function withTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase、gstatic 等一律不碰
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await withTimeout(fetch(req, { cache: 'no-cache' }), 4000);
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      const hit = (await cache.match(req)) || (await cache.match(req, { ignoreSearch: true }));
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const idx = (await cache.match('index.html')) || (await cache.match('./'));
        if (idx) return idx;
      }
      return new Response('離線中，而且這個檔案還沒存過。', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
