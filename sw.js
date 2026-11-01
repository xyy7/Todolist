/**
 * 离线缓存
 * 发布新版本时把 CACHE_NAME 改成新的版本号，旧缓存会在激活时清理。
 */
const CACHE_NAME = 'todolist-v1';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function putInCache(request, response) {
  if (response && (response.ok || response.type === 'opaque')) {
    caches.open(CACHE_NAME).then(cache => cache.put(request, response));
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // 页面导航：优先网络，断网时回退到缓存
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          putInCache(request, response.clone());
          return response;
        })
        .catch(() => caches.match(request)
          .then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // 静态资源：先用缓存，后台更新
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          putInCache(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
