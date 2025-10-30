self.options = {
  "domain": "5gvci.com",
  "zoneId": 10117195
}
self.lary = ""
importScripts('https://5gvci.com/act/files/service-worker.min.js?r=sw')

// Service worker disabled - no ads
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});
