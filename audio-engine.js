// /audio-engine.js
// Mischt beliebige AudioBuffer-Events (TTS + Gong) zu EINER WAV (Blob-URL) via OfflineAudioContext.

export class AudioEngine {
  constructor(sampleRate = 44100){
    this.sampleRate = sampleRate;                                   // // Ziel-SR
  }

  // Schedule-Builder: 50/40/30/20 + 10..1 + Gong (für totalSec)
  buildCountdownSchedule(totalSec){
    const evts = [];
    [50,40,30,20].forEach(n=>{ if (totalSec >= n) evts.push({ t: totalSec - n, key: String(n) }); });
    for (let n=10; n>=1; n--){ if (totalSec >= n) evts.push({ t: totalSec - n, key: String(n) }); }
    evts.push({ t: totalSec, key:'gong' });
    return { duration: totalSec + 1, events: evts };
  }

  // Render: map(key→AudioBuffer) + Schedule → WAV-URL
  async renderToWavUrl(schedule, buffers){
    const ch = 1;
    const frames = Math.ceil(schedule.duration * this.sampleRate);
    const oac = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(ch, frames, this.sampleRate);

    for (const e of schedule.events){
      const buf = buffers[e.key];
      if (!buf) continue;
      const src = new AudioBufferSourceNode(oac, {buffer: buf});
      const g = new GainNode(oac, {gain: e.gain ?? 1.0});
      src.connect(g).connect(oac.destination);
      src.start(Math.max(0, e.t));
    }

    const mixed = await oac.startRendering();
    const wavBlob = this._bufferToWav(mixed);
    return URL.createObjectURL(wavBlob);
  }

  _bufferToWav(abuf){
    const numCh = abuf.numberOfChannels, sr = abuf.sampleRate, bd = 16, fmt = 1;
    const samples = abuf.length, bytesPerSample = bd/8, blockAlign = numCh * bytesPerSample, byteRate = sr * blockAlign;
    const dataSize = samples * blockAlign, buffer = new ArrayBuffer(44 + dataSize), view = new DataView(buffer);
    let off = 0; const w = s => { for (let i=0;i<s.length;i++) view.setUint8(off++, s.charCodeAt(i)); };
    w('RIFF'); view.setUint32(off, 36 + dataSize, true); off += 4; w('WAVE');
    w('fmt '); view.setUint32(off, 16, true); off += 4; view.setUint16(off, fmt, true); off += 2;
    view.setUint16(off, numCh, true); off += 2; view.setUint32(off, sr, true); off += 4;
    view.setUint32(off, byteRate, true); off += 4; view.setUint16(off, blockAlign, true); off += 2;
    view.setUint16(off, bd, true); off += 2; w('data'); view.setUint32(off, dataSize, true); off += 4;
    const chData = Array.from({length:numCh}, (_,c)=>abuf.getChannelData(c));
    for (let i=0;i<samples;i++){ for (let c=0;c<numCh;c++){ const s = Math.max(-1, Math.min(1, chData[c][i])); view.setInt16(off, s*32767, true); off += 2; } }
    return new Blob([view], {type:'audio/wav'});
  }
}