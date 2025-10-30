
// Service worker disabled to prevent unwanted redirects
// Google AdSense will be used instead for monetization
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});
