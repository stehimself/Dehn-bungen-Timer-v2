# /tts/README.txt
Lege die eSpeak NG (WASM) Dateien hier ab (keine Preset-Audios nötig):
- espeak.js           // Loader (stellt window.espeak bereit)
- espeak.wasm         // WebAssembly Binary
- espeak.worker.js    // Worker für Synthese
- espeak.data         // Sprachdaten (inkl. Deutsch)

Wichtig:
- Die Dateinamen müssen zu den Pfaden in tts-engine.js passen (./tts/espeak.*).
- Deutsch-Textbeispiele: „fünfzig“, „vierzig“, „dreissig“, „zwanzig“, „zehn … eins“.
- Falls Umlaute Probleme machen, kannst du „fuenfzig“ statt „fünfzig“ verwenden.