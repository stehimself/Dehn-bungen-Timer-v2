// /app.js
// Orchestriert: TTS (eSpeak-WASM) → AudioBuffer je Zahl → mit Gong zu EINER WAV mischen → loopend abspielen.
// Keine Preset-Audiodateien nötig.

import { TtsEngine } from './tts-engine.js';
import { AudioEngine } from './audio-engine.js';

const secondsInput = document.getElementById('seconds');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const timeLeft = document.getElementById('timeLeft');
const statusEl  = document.getElementById('status');
const ttsState  = document.getElementById('ttsState');
const genState  = document.getElementById('genState');
const player    = document.getElementById('player');

const tts = new TtsEngine({ sampleRate:44100, voice:'de', rate:160, pitch:50 }); // // deutsche Stimme
const ae  = new AudioEngine(44100);

let urlObject = null, loopSeconds = 60, running = false, paused = false, t0 = 0, expectedEnd = 0;

// Anzeige-Helpers
function setReady(sec){ timeLeft.textContent = String(sec); statusEl.textContent = 'Bereit'; }
let uiTicker = null;
function startUiTicker(){ stopUiTicker(); uiTicker = setInterval(()=>{ if (!running || paused) return; const now=performance.now(); const remain=Math.max(0, Math.ceil((expectedEnd-now)/1000)); timeLeft.textContent = String(remain); }, 200); }
function stopUiTicker(){ if (uiTicker){ clearInterval(uiTicker); uiTicker=null; } }
function revokeOldUrl(){ if (urlObject){ try{ URL.revokeObjectURL(urlObject); }catch(e){} urlObject=null; } }

// TTS laden
(async function init(){
  try{
    ttsState.textContent = 'lade TTS (WASM)…';
    await tts.load(); // // lädt /tts/espeak.* Bundles
    ttsState.innerHTML = '<span class="ok">ok</span> – TTS bereit';
    setReady(Number(secondsInput.value||60));
  }catch(err){
    ttsState.innerHTML = `<span class="err">Fehler</span> – ${err.message}`;
  }
  if ('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(()=>{}); }
})();

// Zahlentexte (Schweizer Schreibweise für 30: "dreissig")
const TEXTS = {
  '50': 'fünfzig', '40':'vierzig', '30':'dreissig', '20':'zwanzig',
  '10':'zehn','9':'neun','8':'acht','7':'sieben','6':'sechs','5':'fuenf','4':'vier','3':'drei','2':'zwei','1':'eins'
};

// Erzeuge alle benötigten AudioBuffer dynamisch (TTS + Gong)
async function buildBuffers(){
  const entries = Object.entries(TEXTS);
  const buffers = {};
  // Zahlen via TTS
  for (const [k, txt] of entries){
    buffers[k] = await tts.synthBuffer(txt); // // Text → AudioBuffer
  }
  // Gong synthetisch
  buffers['gong'] = await tts.makeGongBuffer(1.6);
  return buffers;
}

async function generateAndPlay(sec){
  genState.textContent = 'generiere WAV…';
  statusEl.textContent = 'Generiere…';
  running = false; paused = false; stopUiTicker(); revokeOldUrl();
  player.loop = true; player.pause(); player.removeAttribute('src'); player.load();

  // 1) Alle benötigten Buffer erstellen (einmal pro Start – dauert wenige Sekunden)
  const buffers = await buildBuffers();

  // 2) Schedule bauen und mischen
  const schedule = ae.buildCountdownSchedule(sec);
  const url = await ae.renderToWavUrl(schedule, buffers);
  urlObject = url; loopSeconds = sec;

  // 3) Abspielen (loopend)
  player.src = urlObject;
  try{
    await player.play();
    running = true; paused = false;
    t0 = performance.now();
    expectedEnd = t0 + sec*1000;
    startUiTicker();
    statusEl.textContent = 'Läuft (Loop)';
    genState.innerHTML = `<span class="ok">ok</span> – Länge ~${sec}s (loop)`;
  }catch(e){
    statusEl.innerHTML = `<span class="err">Autoplay blockiert</span>`;
    genState.innerHTML = `<span class="warn">warte auf Klick</span>`;
  }
}

// Buttons
startBtn.addEventListener('click', async ()=>{
  const sec = Math.max(10, Number(secondsInput.value||60));
  await generateAndPlay(sec);
});
pauseBtn.addEventListener('click', async ()=>{
  if (!running && !paused) return;
  if (!paused){ player.pause(); paused = true; statusEl.textContent = 'Pausiert'; }
  else { try{ await player.play(); paused = false; statusEl.textContent = 'Läuft (Loop)'; }catch(e){} }
});
resetBtn.addEventListener('click', ()=>{
  running = false; paused = false; player.pause();
  player.removeAttribute('src'); player.load(); revokeOldUrl(); stopUiTicker();
  setReady(Number(secondsInput.value||60));
});

// Defensive Aktualisierung (bei Loop-Ende)
player.addEventListener('ended', ()=>{
  t0 = performance.now(); expectedEnd = t0 + loopSeconds*1000;
});

// Media Session (Sperrbildschirm)
if ('mediaSession' in navigator){
  navigator.mediaSession.metadata = new MediaMetadata({ title:'Dehnuebungen Timer', artist:'Ayurveda Room', album:'Timer' });
  navigator.mediaSession.setActionHandler('play', async ()=>{ try{ await player.play(); paused=false; statusEl.textContent='Läuft (Loop)'; }catch(e){} });
  navigator.mediaSession.setActionHandler('pause', ()=>{ player.pause(); paused=true; statusEl.textContent='Pausiert'; });
}