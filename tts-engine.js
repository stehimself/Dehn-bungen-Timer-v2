// /tts-engine.js
// TTS komplett im Browser ohne Preset-Files mit eSpeak NG (WASM) + Gong-Erzeugung via WebAudio.
// Du musst die eSpeak-WASM-Bundles in /tts/ hosten (siehe README unten).

export class TtsEngine {
  constructor({sampleRate=44100, voice='de', rate=160, pitch=50}={}){
    this.sampleRate = sampleRate;         // // Ziel-Samplerate
    this.voice = voice;                   // // z.B. 'de'
    this.rate = rate;                     // // 80..450 (eSpeak Skala)
    this.pitch = pitch;                   // // 0..99
    this._mod = null;                     // // eSpeak Modul
    this._ctx = new (window.AudioContext || window.webkitAudioContext)(); // // zum Dekodieren
  }

  // eSpeak-WASM laden (einmalig)
  async load(){
    if (this._mod) return;
    // eSpeak Initialisierung (der folgende Loader setzt voraus, dass du die eSpeak-Dateien hostest)
    // Erwartete Dateien in /tts/:
    //   - espeak.wasm
    //   - espeak.worker.js
    //   - espeak.data (Stimmen-Daten)
    //   - espeak.js (Loader)
    // HINWEIS: Dateinamen ggf. an deinen Build anpassen.
    await this._ensureEspeakLoaded();
    this._mod = window.espeak;           // // global vom Loader
    await this._mod.initialize({
      wasmPath: './tts/espeak.wasm',
      workerPath: './tts/espeak.worker.js',
      dataPath: './tts/espeak.data'
    });
  }

  async _ensureEspeakLoaded(){
    if (window.espeak?.initialize) return;
    await import('./tts/espeak.js');     // // dynamischer Import des Loaders
  }

  // Text → WAV (Uint8Array)
  async synthWav(text){
    if (!this._mod) throw new Error('TTS nicht geladen');
    // eSpeak API: synthesize({text, voice, rate, pitch, sampleRate}) → Uint8Array (WAV)
    const wav = await this._mod.synthesize({
      text,
      voice: this.voice,
      rate: this.rate,
      pitch: this.pitch,
      sampleRate: this.sampleRate,
      // optional: flags/phonemes etc.
    });
    return wav; // Uint8Array (RIFF/WAV)
  }

  // Text → AudioBuffer
  async synthBuffer(text){
    const wav = await this.synthWav(text);
    const buf = await this._ctx.decodeAudioData(wav.buffer.slice(0));
    // Falls Samplerate ≠ Ziel, wird später beim Offline-Render noch resampled – ok.
    return buf;
  }

  // Kleiner Dreiklang-Gong synthetisch als AudioBuffer (ohne Dateien)
  makeGongBuffer(duration=1.6){
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