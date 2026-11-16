// Offline-Cache: App-Shell wird vorab gecacht, danach "stale-while-revalidate".
const CACHE = "gym-tracker-v10";
const SHELL = ["./", "index.html", "css/app.css", "js/app.js", "js/db.js", "js/logic.js", "js/plan.js", "js/charts.js", "js/art.js", "js/images.js", "js/meals.js", "js/nutrition.js", "js/alternatives.js", "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  const u = new URL(r.url);
  const cdnImg = u.hostname === "cdn.jsdelivr.net" && /\.(jpg|jpeg|png|webp)$/i.test(u.pathname);
  if (r.method !== "GET" || (u.origin !== location.origin && !cdnImg)) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(r, { ignoreSearch: true });
    const net = fetch(r).then((res) => { if (res.ok || res.type === "opaque") c.put(r, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
