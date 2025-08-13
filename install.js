// /install.js
// Install-Button auch im Browser sofort anzeigen; triggert native Installation wenn möglich.
let deferredPrompt = null;
function isStandalone(){ return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
function isIOSSafari(){ const ua = navigator.userAgent; return /iPad|iPhone|iPod/.test(ua) && /^((?!CriOS|FxiOS|EdgiOS).)*Safari/.test(ua); }

const bar  = document.getElementById('installBar');
const btn  = document.getElementById('installBtn');
const hint = document.getElementById('installHint');

document.addEventListener('DOMContentLoaded', ()=>{ if (!isStandalone()){ bar.style.display='flex'; hint.textContent = isIOSSafari()? 'Auf iPhone: Teilen-Icon → „Zum Home-Bildschirm“.' : 'Tippe auf „App installieren“.'; }});
window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt=e; if(!isStandalone()){ bar.style.display='flex'; hint.textContent='Tippe auf „App installieren“.'; }});
btn?.addEventListener('click', async ()=>{
  if (isIOSSafari() || !deferredPrompt){ hint.textContent = isIOSSafari()? 'Auf iPhone: Teilen-Icon → „Zum Home-Bildschirm“.' : 'Installation im Browser-Menü starten (oder Chrome verwenden).'; return; }
  deferredPrompt.prompt(); const choice = await deferredPrompt.userChoice; deferredPrompt=null;
  hint.textContent = (choice.outcome==='accepted')? 'Installiert – jetzt im Startbildschirm.' : 'Installation abgebrochen.';
});
window.addEventListener('appinstalled', ()=>{ bar.style.display='none'; });