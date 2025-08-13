// /sw.js
// Cache-Update-Flow inkl. Update-Hinweis (Version bei jedem Release erhöhen!)
const STATIC = 'static-v1';
const ASSETS = [
  './','./index.html','./app.js','./audio-engine.js','./tts-engine.js','./install.js',
  './manifest.webmanifest','./offline.html',
  './icons/icon-192.png','./icons/icon-512.png','./icons/icon-512-maskable.png',
  // TTS-Bundles (du hostest die Dateien in /tts/)
  './tts/espeak.js','./tts/espeak.wasm','./tts/espeak.worker.js','./tts/espeak.data'
];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(STATIC).then(c=>c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil((async()=>{ const keys=await caches.keys(); await Promise.all(keys.map(k=>k!==STATIC?caches.delete(k):null)); await self.clients.claim(); const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true}); clients.forEach(c=>c.postMessage({type:'SW_ACTIVATED'})); })()); });
self.addEventListener('fetch',e=>{ e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(net=>{ const copy=net.clone(); caches.open(STATIC).then(c=>c.put(e.request,copy)); return net; }).catch(()=>caches.match('./offline.html')))); });