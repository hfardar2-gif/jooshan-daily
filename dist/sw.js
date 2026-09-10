const CACHE = "jooshan-daily-v5";
const ASSETS = ["./", "./index.html", "./styles.css", "./push-config.js", "./prayers.js", "./app.js", "./jooshan.md", "./manifest.webmanifest", "./icon.svg"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match("./index.html"))));
});
self.addEventListener("push", event => {
  const data = event.data?.json() || {};
  event.waitUntil(self.registration.showNotification(data.title || "صد روز با جوشن کبیر", {
    body: data.body || "وقت خواندن بند امروز جوشن کبیر است.",
    icon: "./icon.svg",
    badge: "./icon.svg",
    tag: "jooshan-daily-reminder",
    data: { url: data.url || "./" }
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(openClients => {
    const existing = openClients.find(client => "focus" in client);
    return existing ? existing.focus() : clients.openWindow(event.notification.data?.url || "./");
  }));
});
