const CACHE_NAME = 'mayaworld-v1';
const PRECACHE_URLS = [
  '/Newfolder/index.html',
  '/Newfolder/css/styles.css',
  '/Newfolder/js/engine/game.js',
  '/Newfolder/js/engine/map.js',
  '/Newfolder/js/engine/camera.js',
  '/Newfolder/js/engine/clock.js',
  '/Newfolder/js/engine/AssetLoader.js',
  '/Newfolder/js/engine/AudioManager.js',
  '/Newfolder/js/entities/player.js',
  '/Newfolder/js/entities/npc.js',
  '/Newfolder/js/systems/journal.js',
  '/Newfolder/js/systems/samsara.js',
  '/Newfolder/js/systems/vidya.js',
  '/Newfolder/js/systems/vritti.js',
  '/Newfolder/js/systems/ritual.js',
  '/Newfolder/js/systems/corruption.js',
  '/Newfolder/js/data/maps.js',
  '/Newfolder/js/data/dialogues.js',
  '/Newfolder/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('fonts.googleapis.com')) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});
