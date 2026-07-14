/* Service Worker – טיול אריאל 2026
   אסטרטגיה: את דף המסלול תמיד מנסים קודם מהרשת (כדי לקבל עדכונים),
   ואם אין אינטרנט – מגישים מהמטמון. תמונות, פונטים ומשאבים חיצוניים
   נשמרים במטמון אחרי הטעינה הראשונה, כך שהאתר עובד גם בלי קליטה. */

var CACHE = 'ariel-trip-v3';
var PRECACHE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  /* בקשות ל-AI (Gemini) ולמזג אוויר – תמיד רשת, בלי מטמון */
  if (/generativelanguage\.googleapis\.com|api\.open-meteo\.com|vcheck=/.test(req.url)) return;

  /* רשימת תמונות היומן (GitHub API): רשת קודם כדי לקבל תמונות חדשות, מטמון כגיבוי באופליין */
  if (/api\.github\.com/.test(req.url)) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }

  /* ניווט לדף עצמו: רשת קודם, מטמון כגיבוי */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  /* כל השאר (תמונות, פונטים, מפות): מטמון קודם, ואם אין – רשת + שמירה */
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
