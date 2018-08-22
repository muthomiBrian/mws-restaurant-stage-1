const staticCacheName = 'mws-restaurant-stage-1-static-v5';
const contentImgsCache = 'mws-restaurant-stage-1-imgs-v5';
const mapCache = 'mws-restaurant-stage-1-map-v5';
const allCaches = [
  staticCacheName,
  contentImgsCache,
  mapCache
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      return cache.addAll([
        '.',
        './restaurant.html',
        './js/main.js',
        './js/dbhelper.js',
        './js/restaurant_info.js',
        './js/idb.js',
        './css/styles.css',
        'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
        'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css'
      ]);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('mws-') &&
                   !allCaches.includes(cacheName);
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.url.toString().endsWith('jpg')) {
    event.respondWith(serveImg(event.request));
    return;
  };

  if (event.request.url.toString().endsWith('png') && event.request.referrer) {
    event.respondWith(serveMapImg(event.request));
    return;
  }

  if (event.request.url.toString().endsWith('MNlT0A')) {
    event.respondWith(serveMapImg(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (event.request.url.includes('?id=')) {
        const storageUrl = event.request.url.replace(/\?id=[0-9]+$/,'');
        return caches.open(staticCacheName).then((cache) => {
          return cache.match(storageUrl).then((response) => {
            if (response) return response;
            return fetch(event.request).then((networkResponse) => {
              cache.put(storageUrl, networkResponse.clone());
              return networkResponse;
            }).catch(e => console.log(e));
          });
        });
      }
      return response || fetch(event.request).catch(e => console.log(e));
    })
  );
});

function serveMapImg(request){
  return caches.open(mapCache).then((cache) => {
    return cache.match(request.url).then((response) => {
      if (response) return response;
      return fetch(request).then((networkResponse) => {
        cache.put(request.url, networkResponse.clone());
        return networkResponse;
      }).catch(e => console.log(e));
    });
  });
};

function serveImg(request) {
  const storageUrl = request.url.replace(/-[0-9]+\S[0-9]x.jpg$/, '');

  return caches.open(contentImgsCache).then((cache) => {
    return cache.match(storageUrl).then((response) => {
      if (response) return response;
      return fetch(request).then((networkResponse) => {
        cache.put(storageUrl, networkResponse.clone());
        return networkResponse;
      }).catch(e => console.log(e));
    });
  });
};