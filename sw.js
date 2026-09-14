// Nexora — Service Worker
// Версия кэша: меняйте при каждом обновлении сайта, чтобы сбросить старый кэш
const CACHE_NAME = 'nexora-cache-v1';

// Файлы "оболочки" приложения — то, что нужно, чтобы сайт открылся даже без интернета
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json'
];

// Установка: кладём файлы оболочки в кэш
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Активация: удаляем старые версии кэша
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Стратегия: "сеть, а если нет сети — кэш" (Firebase-запросы всегда идут напрямую в сеть)
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Firebase/Firestore/Telegram запросы не кэшируем — там нужны всегда свежие данные
  if (
    url.includes('firebaseio.com') ||
    url.includes('googleapis.com') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('telegram.org')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
