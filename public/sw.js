// Offline support for the installed app. The schedule data is bundled into the JS, so once the
// page and its static assets are cached the app works fully offline.
// - pages: network first, cached copy when offline (always fresh when online)
// - /_next/static: cache first (file names are content-hashed, so they never change)
// - everything else same-origin (icons, manifest): stale-while-revalidate

const CACHE = "hdo-v3";
// "/" is redirected by the server to a language URL, so the language pages are what gets cached.
// (Caching "/" itself would store a redirected response, which browsers refuse for navigations.)
const LOCALE_PAGES = ["/cs", "/en", "/ru"];
const PRECACHE = [...LOCALE_PAGES, "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
const LAST_PAGE = "/__last-page"; // remembers the last language page, to open it offline from "/"

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  const path = new URL(request.url).pathname;
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected) {
      cache.put(request, response.clone());
      if (LOCALE_PAGES.includes(path)) cache.put(LAST_PAGE, new Response(path));
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Offline "/" (the installed app's start URL): the language page used last, else English.
    const last = await cache.match(LAST_PAGE);
    return (await cache.match(last ? await last.text() : "/en")) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached ?? Response.error());
  return cached ?? network;
}
