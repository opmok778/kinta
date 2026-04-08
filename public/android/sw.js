const SHELL_CACHE = "kinta-android-shell-v1";
const DATA_CACHE = "kinta-android-data-v1";
const APP_ASSETS = [
  "/android/index.html",
  "/android/detail.html",
  "/android/offline.html",
  "/android/app.css",
  "/android/app.js",
  "/android/detail.js",
  "/android/pwa.js",
  "/android/manifest.json",
  "/android/icon.svg",
  "/android/icon-maskable.svg"
];

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

async function networkFirst(request, cacheName, fallbackResponse) {
  try {
    const response = await fetch(request);
    if (cacheName && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (cacheName) {
      const cached = await caches.match(request);
      if (cached) {
        return cached;
      }
    }
    return fallbackResponse;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![SHELL_CACHE, DATA_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    if (url.pathname.endsWith("/session")) {
      event.respondWith(
        networkFirst(request, null, jsonResponse({ authenticated: false, offline: true }, 200))
      );
      return;
    }

    let fallback = jsonResponse({ error: "Offline", offline: true }, 503);
    if (url.pathname === "/api/overview") {
      fallback = jsonResponse(
        {
          metrics: {
            landListings: "-",
            tenantProfiles: "-",
            activeMarkets: "-",
            registeredUsers: "-",
            matchRequests: "-",
            avgTrustScore: "-"
          },
          offline: true
        },
        503
      );
    } else if (url.pathname === "/api/lands") {
      fallback = jsonResponse({ listings: [], offline: true }, 503);
    } else if (url.pathname === "/api/tenants") {
      fallback = jsonResponse({ tenants: [], offline: true }, 503);
    }

    event.respondWith(networkFirst(request, DATA_CACHE, fallback));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, SHELL_CACHE, caches.match("/android/offline.html"))
    );
    return;
  }

  event.respondWith(cacheFirst(request));
});
