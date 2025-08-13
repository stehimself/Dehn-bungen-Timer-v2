// /sw.js – prüfe, dass die TTS-Dateien gecacht werden (Pfad & Namen GENAU gleich wie im Repo!)
const STATIC = 'static-v4';
const ASSETS = [
  './','./index.html','./app.js','./audio-engine.js','./tts-engine.js','./install.js',
  './manifest.webmanifest','./offline.html',
  './icons/icon-192.png','./icons/icon-512.png','./icons/icon-512-maskable.png',
  './tts/espeak.js','./tts/espeak.wasm','./tts/espeak.worker.js','./tts/espeak.data'
];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(STATIC).then(c=>c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil((async()=>{ const keys=await caches.keys(); await Promise.all(keys.map(k=>k!==STATIC?caches.delete(k):null)); await self.clients.claim(); })()); });
self.addEventListener('fetch',e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(net=>{ const copy=net.clone(); caches.open(STATIC).then(c=>c.put(e.request,copy)).catch(()=>{}); return net; }).catch(()=>caches.match('./offline.html'))));
});