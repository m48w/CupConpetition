// ホーム画面に追加するための、最小限の Service Worker。
// 試合のスコアは常に最新を見せたいので、何もキャッシュしない（画面の移動はそのままネットへ）。
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request));
});
