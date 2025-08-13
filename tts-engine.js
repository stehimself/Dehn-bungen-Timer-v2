// /tts-engine.js
// FIX: Kein dynamic import mehr (der brach auf GitHub Pages).
// Wir laden espeak.js klassisch via <script>-Injection und initialisieren dann.
// Stelle sicher, dass in /tts die vier Dateien liegen: espeak.js, espeak.wasm, espeak.worker.js, espeak.data

export class TtsEngine {
  constructor({sampleRate=44100, voice='de', rate=160, pitch=50}={}){
    this.sampleRate = sampleRate;               // Ziel-Samplerate
    this.voice = voice;                         // z.B. 'de'
    this.rate = rate;                           // 80..450 (eSpeak Skala)
    this.pitch = pitch;                         // 0..99
    this._mod = null;                           // espeak Modul (window.espeak)
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    this._loaded = false;                       // wurde espeak initialisiert?
  }

  // Hilfsfunktion: Script-Datei laden (klassisch, kein ES-Module nötig)
  _loadScript(src){
    return new Promise((resolve, reject)=>{
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = ()=>resolve();
      s.onerror = ()=>reject(new Error('Script nicht ladbar: '+src));
      document.head.appendChild(s);
    });
  }

  // eSpeak-WASM laden (einmalig)
  async load(){
    if (this._loaded) return;

    // 1) espeak.js klassisch laden (stellt window.espeak bereit)
    if (!window.espeak) {
      await this._loadScript('./tts/espeak.js'); // <-- Pfad prüfen (Gross/Kleinschreibung!)
    }
    if (!window.espeak?.initialize) {
      throw new Error('espeak.js geladen, aber window.espeak.initialize fehlt');
    }

    // 2) espeak initialisieren (Pfad zu .wasm/.worker/.data)
    await window.espeak.initialize({
      wasmPath: './tts/espeak.wasm',
      workerPath: './tts/espeak.worker.js',
      dataPath: './tts/espeak.data'
    });

    this._mod = window.espeak;
    this._loaded = true;
  }

  // Text → WAV (Uint8Array)
  async synthWav(text){
    if (!this._loaded) throw new Error('TTS nicht geladen');
    const wav = await this._mod.synthesize({
      text,
      voice: this.voice,
      rate: this.rate,
      pitch: this.pitch,
      sampleRate: this.sampleRate
    });
    return wav; // Uint8Array (RIFF/WAV)
  }

  // Text → AudioBuffer
  async synthBuffer(text){
    const wav = await this.synthWav(text);
    const buf = await this._ctx.decodeAudioData(wav.buffer.slice(0));
    return buf;
  }

  // Dreiklang-Gong synthetisch erzeugen (ohne Datei)
  async makeGongBuffer(duration=1.6){
    const ctx = new OfflineAudioContext(1, Math.ceil(this.sampleRate*duration), this.sampleRate);
    const hit = (freq, t0, g1=0.6, g2=0.15, d1=1.2, d2=1.0) => {
      const osc1 = new OscillatorNode(ctx, {type:'sine', frequency:freq});
      const osc2 = new OscillatorNode(ctx, {type:'sine', frequency:freq*2.01});
      const g1n = new GainNode(ctx, {gain:0.0001});
      const g2n = new GainNode(ctx, {gain:0.0001});
      osc1.connect(g1n).connect(ctx.destination);
      osc2.connect(g2n).connect(ctx.destination);
      g1n.gain.setValueAtTime(0.0001, t0);
      g1n.gain.exponentialRampToValueAtTime(g1, t0+0.02);
      g1n.gain.exponentialRampToValueAtTime(0.0001, t0+d1);
      g2n.gain.setValueAtTime(0.0001, t0);
      g2n.gain.exponentialRampToValueAtTime(g2, t0+0.02);
      g2n.gain.exponentialRampToValueAtTime(0.0001, t0+d2);
      osc1.start(t0); osc1.stop(t0+d1+0.1);
      osc2.start(t0); osc2.stop(t0+d2+0.1);
    };
    hit(660, 0.00);
    hit(784, 0.25);
    hit(988, 0.50);
    return ctx.startRendering();
  }
}