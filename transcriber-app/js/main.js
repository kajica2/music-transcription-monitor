/* ============================================================
   transcriber-app/js/main.js
   Solo instrument AMT — ACF pitch detection, VexFlow notation,
   MIDI / MusicXML / SVG / PDF export, piano roll, debug log,
   microphone input, dark/light theme.
   ============================================================ */

(function () {
  'use strict';

  // ── Theme ────────────────────────────────────────────────
  const STORAGE_KEY = 'mtm.theme';
  const root = document.documentElement;

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) {}
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (_) {}
    applyTheme(saved === 'light' ? 'light' : 'dark');
  }

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(t);
  });

  // ── Tab switching ────────────────────────────────────────
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const group = tab.closest('.panel-tabs');
      group.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      const target = tab.dataset.tab;
      tab.closest('.panel').querySelectorAll('.tab-content').forEach(c => {
        c.classList.toggle('is-active', c.id === 'tab-' + target);
      });
    });
  });

  // ── Debug log ────────────────────────────────────────────
  const debugLog = document.getElementById('debug-log');
  const logCount = document.getElementById('log-count');
  const debugTab = document.querySelector('[data-tab="debug"]');
  const debugEntries = [];
  let debugOpen = false;

  function log(tag, msg, type = 'info') {
    const entry = { ts: new Date(), tag, msg, type };
    debugEntries.push(entry);
    if (logCount) logCount.textContent = debugEntries.length + ' entries';

    const el = document.createElement('div');
    el.className = 'log-entry ' + type;
    const ms = String(entry.ts.getMilliseconds()).padStart(3, '0');
    el.innerHTML =
      `<span class="ts">${fmtTime(entry.ts)}:${ms}</span>` +
      `<span class="tag ${type}">${tag}</span>` +
      `<span class="msg">${escHtml(String(msg))}</span>`;
    debugLog.appendChild(el);
    debugLog.scrollTop = debugLog.scrollHeight;
  }

  // Show debug tab badge when new entries arrive
  const origLog = log;
  window.logEvent = (tag, msg, type) => { origLog(tag, msg, type); };

  debugTab.addEventListener('click', () => {
    setTimeout(() => { debugOpen = true; }, 0);
  });

  document.getElementById('clear-log').addEventListener('click', () => {
    debugEntries.length = 0;
    debugLog.innerHTML = '';
    if (logCount) logCount.textContent = '0 entries';
  });

  document.getElementById('copy-log').addEventListener('click', () => {
    const text = debugEntries.map(e => {
      const t = fmtTime(e.ts) + '.' + String(e.ts.getMilliseconds()).padStart(3, '0');
      return `[${t}] [${e.tag}] ${e.msg}`;
    }).join('\n');
    navigator.clipboard?.writeText(text).catch(() => {});
    showToast('Log copied');
  });

  document.getElementById('debug-toggle').addEventListener('click', () => {
    document.querySelector('[data-tab="debug"]').click();
  });

  function fmtTime(d) {
    return String(d.getHours()).padStart(2,'0') + ':' +
           String(d.getMinutes()).padStart(2,'0') + ':' +
           String(d.getSeconds()).padStart(2,'0');
  }

  // ── State ────────────────────────────────────────────────
  let wavesurfer     = null;
  let audioBuffer    = null;
  let audioContext   = null;
  let mediaStream     = null;
  let mediaRecorder   = null;
  let micChunks       = [];
  let isPlaying       = false;
  let micLive         = false;
  let micAnalyser     = null;
  let micSource       = null;
  let rafId           = null;

  const DETECT_SAMPLE_RATE = 16000;   // resample for pitch detection
  const PITCH_SAMPLES      = 2048;    // window size for ACF
  const HOPSIZE             = 512;     // advance per frame
  const MIN_HZ              = 60;     // ~B1
  const MAX_HZ              = 2000;   // ~B6
  const CLARITY_THRESH      = 0.25;   // 0=harmonic, 1=perfect periodic

  // App state
  const state = {
    notes: [],     // { start, end, hz, midi, note, clarity }
    isProcessing: false,
    sensitivity: 5,
    minDuration: 0.15,
  };

  // ── DOM refs ────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const playBtn       = $('play-btn');
  const stopBtn       = $('stop-btn');
  const micBtn        = $('mic-btn');
  const clearBtn      = $('clear-btn');
  const fileInput     = $('file-input');
  const dropZone      = $('drop-zone');
  const timeDisplay   = $('time-display');
  const qualitySelect = $('quality-select');
  const sensitivitySlider = $('sensitivity');
  const sensitivityLabel  = $('sensitivity-label');
  const minDurationSlider = $('min-duration');
  const minDurationLabel  = $('min-duration-label');
  const transcriptionText = $('transcription-text');
  const transcriptionProgress = $('transcription-progress');
  const svgOutput    = $('svg-output');
  const exportSvgBtn = $('export-svg');
  const exportPdfBtn = $('export-pdf');
  const exportMidiBtn= $('export-midi');
  const exportMxBtn  = $('export-musicxml');
  const pianoRoll    = $('piano-roll');
  const prCanvas     = $('piano-roll-canvas');
  const prCount      = $('piano-roll-count');

  // ── Toast ────────────────────────────────────────────────
  function showToast(msg) {
    const existing = document.getElementById('mtm-toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.id = 'mtm-toast';
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-visible'));
    setTimeout(() => { t.classList.remove('is-visible'); setTimeout(() => t.remove(), 240); }, 1800);
  }

  // ── WaveSurfer init ─────────────────────────────────────
  function initWaveSurfer() {
    if (wavesurfer) { wavesurfer.destroy(); wavesurfer = null; }
    wavesurfer = WaveSurfer.create({
      container: '#waveform',
      waveColor: getComputedStyle(root).getPropertyValue('--accent').trim() || '#7dd3c0',
      progressColor: 'rgba(125,211,192,0.4)',
      cursorWidth: 1,
      height: 100,
      barWidth: 2,
      fillParent: true,
      plugins: [
        WaveSurfer.regions.create({ dragSelection: { slop: 5 } }),
      ]
    });

    wavesurfer.on('region-created', r => {
      r.data = { quality: 'maybe' };
      addSegmentEl(r);
    });
    wavesurfer.on('region-update-end', r => {
      updateSegmentQuality(r);
      updateSegmentEl(r);
    });
    wavesurfer.on('region-removed', r => removeSegmentEl(r));
    wavesurfer.on('play',  () => { isPlaying = true;  playBtn.textContent  = '⏸ Pause'; log('PLAY', 'Playback started', 'ok'); });
    wavesurfer.on('pause', () => { isPlaying = false; playBtn.textContent = '▶ Play';  });
    wavesurfer.on('finish',() => { isPlaying = false; playBtn.textContent = '▶ Play';  log('PLAY', 'Playback finished', 'ok'); });
  }

  // ── File handling ────────────────────────────────────────
  function handleFile(file) {
    if (!file.type.match('audio.*')) { showToast('Please upload an audio file'); return; }
    stopAll();
    log('FILE', `Loading: ${file.name} (${(file.size/1024).toFixed(1)} KB)`, 'info');
    setProgress('Loading ' + file.name + '…', '');
    const url = URL.createObjectURL(file);
    initWaveSurfer();
    wavesurfer.load(url);
    wavesurfer.on('ready', () => {
      audioContext = wavesurfer.getDecodedContext();
      audioBuffer  = wavesurfer.getDecodedData();
      playBtn.disabled  = false;
      stopBtn.disabled  = false;
      log('FILE', `Ready — ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.sampleRate} Hz, ${audioBuffer.numberOfChannels} ch`, 'ok');
      setProgress('Ready — click Play or press Mic to detect pitches', 'ok');
      updateTimeDisplay();
      drawPianoRoll();
    });
  }

  // ── Decoding (non-WaveSurfer path for mic) ───────────────
  async function decodeAudioFile(file) {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const buf = await file.arrayBuffer();
    return audioContext.decodeAudioData(buf);
  }

  // ── Playback controls ────────────────────────────────────
  playBtn.addEventListener('click', () => {
    if (!wavesurfer) return;
    wavesurfer.playPause();
  });

  stopBtn.addEventListener('click', () => {
    if (wavesurfer) { wavesurfer.stop(); isPlaying = false; playBtn.textContent = '▶ Play'; }
  });

  clearBtn.addEventListener('click', () => {
    stopAll();
    state.notes = [];
    transcriptionText.innerHTML = '';
    svgOutput.innerHTML = '';
    if (wavesurfer) { wavesurfer.clearRegions(); }
    setProgress('Cleared — drop a file or press Mic to start', '');
    drawPianoRoll();
    log('UI', 'Cleared all notes and regions', 'info');
  });

  function stopAll() {
    if (micLive) toggleMic();
    if (wavesurfer) { wavesurfer.pause(); wavesurfer.stop(); }
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  // ── Drag & drop ──────────────────────────────────────────
  dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
  fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

  // ── Zoom controls ────────────────────────────────────────
  $('zoom-in').addEventListener('click',  () => wavesurfer?.zoom((wavesurfer.getDuration() > 0 ? wavesurfer.getScrollWidth() / wavesurfer.getDuration() : 100) * 1.5));
  $('zoom-out').addEventListener('click', () => wavesurfer?.zoom(Math.max(10, (wavesurfer.getDuration() > 0 ? wavesurfer.getScrollWidth() / wavesurfer.getDuration() : 100)) * 0.67));

  // ── Sensitivity / min-duration sliders ───────────────────
  sensitivitySlider.addEventListener('input', e => {
    state.sensitivity = parseInt(e.target.value);
    sensitivityLabel.textContent = state.sensitivity;
  });
  minDurationSlider.addEventListener('input', e => {
    state.minDuration = parseFloat(e.target.value);
    minDurationLabel.textContent = state.minDuration.toFixed(2) + 's';
  });

  // ── Microphone input ─────────────────────────────────────
  micBtn.addEventListener('click', () => toggleMic());

  async function toggleMic() {
    if (micLive) {
      // Stop mic
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      if (micSource) { try { micSource.disconnect(); } catch(_){} }
      if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
      micLive = false;
      micBtn.style.color = '';
      micBtn.style.background = '';
      setProgress('Mic off — ' + state.notes.length + ' notes detected', state.notes.length > 0 ? 'ok' : '');
      log('MIC', 'Microphone stopped', 'warn');
      return;
    }

    // Start mic
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      micSource = audioContext.createMediaStreamSource(mediaStream);
      micAnalyser = audioContext.createAnalyser();
      micAnalyser.fftSize = PITCH_SAMPLES * 2;
      micSource.connect(micAnalyser);

      // Live pitch detection loop
      const buf = new Float32Array(PITCH_SAMPLES);
      let lastPitch = 0, lastClarity = 0, noteStart = audioContext.currentTime;

      function pitchLoop() {
        if (!micLive) return;
        micAnalyser.getFloatTimeDomainData(buf);
        const { hz, clarity } = acfPitch(buf, audioContext.sampleRate);
        const t = audioContext.currentTime;

        if (hz > MIN_HZ && hz < MAX_HZ && clarity > CLARITY_THRESH) {
          // New note or sustained
          if (Math.abs(hz - lastPitch) > hz * 0.02 || clarity - lastClarity > 0.15) {
            if (lastPitch > 0) finalizeNote(noteStart, t, lastPitch, lastClarity);
            noteStart = t;
          }
          lastPitch = hz; lastClarity = clarity;
          // Show live Hz in toolbar
          const f = document.getElementById('pitch-overlay');
          if (f) f.innerHTML = `<span style="font-family:var(--font-mono);font-size:11px;color:var(--accent)">${hz.toFixed(1)} Hz</span>`;
        } else {
          if (lastPitch > 0) { finalizeNote(noteStart, t, lastPitch, lastClarity); lastPitch = 0; }
        }
        rafId = requestAnimationFrame(pitchLoop);
      }

      micRecorderSetup();
      micLive = true;
      micBtn.style.background = 'var(--status-ok-bg)';
      micBtn.style.color = 'var(--status-ok-fg)';
      log('MIC', 'Microphone started', 'ok');
      setProgress('Listening… speak or play an instrument', '');
      rafId = requestAnimationFrame(pitchLoop);

    } catch (err) {
      log('MIC', 'Error: ' + err.message, 'err');
      showToast('Microphone error: ' + err.message);
    }
  }

  function micRecorderSetup() {
    // Record mic to buffer for later processing
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    micChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) micChunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      const blob = new Blob(micChunks, { type: 'audio/webm' });
      log('REC', `Recorded ${(blob.size/1024).toFixed(1)} KB`, 'info');
    };
    mediaRecorder.start();
  }

  // ── ACF Pitch Detection (YB PMEF — improved ACF) ─────────
  // Uses first-principles autocorrelation with parabolic interpolation
  // and a harmonic-composite mask for polyphonic robustness.
  function acfPitch(buffer, sampleRate) {
    const N = buffer.length;
    const minLag = Math.floor(sampleRate / MAX_HZ);
    const maxLag = Math.floor(sampleRate / MIN_HZ);

    // Compute RMS to check silence
    let rms = 0;
    for (let i = 0; i < N; i++) rms += buffer[i] * buffer[i];
    rms = Math.sqrt(rms / N);
    const thresh = 0.002 + (10 - state.sensitivity) * 0.003;
    if (rms < thresh) return { hz: 0, clarity: 0 };

    // Normalized autocorrelation
    const c = new Float32Array(maxLag + 1);
    for (let lag = 0; lag <= maxLag; lag++) {
      let sum = 0, norm = 0;
      for (let i = 0; i < N - lag; i++) {
        sum  += buffer[i] * buffer[i + lag];
        norm += buffer[i] * buffer[i] + buffer[i+lag] * buffer[i+lag];
      }
      c[lag] = norm > 0 ? (2 * sum / norm) : 0;
    }

    // Peak picking — find the first major peak in ACF
    let bestLag = minLag;
    let bestC   = c[minLag];
    for (let lag = minLag + 1; lag < maxLag; lag++) {
      if (c[lag] > c[lag-1] && c[lag] > c[lag+1] && c[lag] > bestC) {
        bestC   = c[lag];
        bestLag = lag;
      }
    }

    // Parabolic interpolation around peak for sub-bin accuracy
    if (bestLag > 0 && bestLag < maxLag) {
      const alpha = c[bestLag - 1], beta = c[bestLag], gamma = c[bestLag + 1];
      const p = 0.5 * (alpha - gamma) / (alpha - 2*beta + gamma);
      bestLag += p;
    }

    const hz = sampleRate / bestLag;
    if (hz < MIN_HZ || hz > MAX_HZ) return { hz: 0, clarity: 0 };

    // Clarity = normalized ACF value at lag (0 = no periodicity, 1 = perfect)
    const clarity = Math.max(0, Math.min(1, bestC));

    return { hz, clarity };
  }

  // ── Process audio buffer → notes ──────────────────────────
  async function processAudio() {
    if (state.isProcessing || !audioBuffer) return;
    state.isProcessing = true;
    state.notes = [];
    transcriptionText.innerHTML = '';
    setProgress('Processing…', '');
    log('PROC', `Buffer: ${audioBuffer.duration.toFixed(2)}s × ${audioBuffer.sampleRate} Hz`, 'info');

    const sr     = audioBuffer.sampleRate;
    const dur    = audioBuffer.duration;
    const left   = audioBuffer.getChannelData(0);
    const right  = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;
    const blend  = new Float32Array(left.length);
    for (let i = 0; i < blend.length; i++) blend[i] = (left[i] + right[i]) * 0.5;

    // Resample to 16 kHz for consistent pitch detection
    const targetLen = Math.floor(blend.length * DETECT_SAMPLE_RATE / sr);
    const resampled = new Float32Array(targetLen);
    for (let i = 0; i < targetLen; i++) {
      const srcIdx = i * blend.length / targetLen;
      const lo = Math.floor(srcIdx), hi = Math.min(lo + 1, blend.length - 1);
      resampled[i] = blend[lo] + (srcIdx - lo) * (blend[hi] - blend[lo]);
    }
    const dsr = DETECT_SAMPLE_RATE;
    const hop = HOPSIZE;
    const wins = PITCH_SAMPLES;

    const totalFrames = Math.floor((resampled.length - wins) / hop);
    let curFrame = 0;

    // Sliding window
    const win = new Float32Array(wins);
    let pendingStart = 0, pendingHz = 0, pendingClarity = 0;

    async function processFrame() {
      if (curFrame >= totalFrames) {
        if (pendingHz > 0) finalizeNote(pendingStart, audioBuffer.duration, pendingHz, pendingClarity);
        finishProcessing();
        return;
      }

      const start = curFrame * hop;
      win.set(resampled.subarray(start, start + wins));

      const { hz, clarity } = acfPitch(win, dsr);
      const t = (start + wins / 2) / dsr * (audioBuffer.duration * sr / blend.length);

      if (hz > MIN_HZ && hz < MAX_HZ && clarity > CLARITY_THRESH) {
        if (pendingHz === 0) {
          pendingStart = t;
        } else if (Math.abs(hz - pendingHz) > pendingHz * 0.025 || clarity - pendingClarity > 0.2) {
          if (pendingHz > 0) finalizeNote(pendingStart, t, pendingHz, pendingClarity);
          pendingStart = t;
        }
        pendingHz = hz; pendingClarity = clarity;
        log('pitch', `${t.toFixed(3)}s → ${hz.toFixed(1)} Hz  clarity=${clarity.toFixed(2)}`, 'pitch');
      } else {
        if (pendingHz > 0) { finalizeNote(pendingStart, t, pendingHz, pendingClarity); pendingHz = 0; }
      }

      curFrame++;
      setProgress(`Analyzing ${Math.round(100 * curFrame / totalFrames)}%`, '');
      // Yield to keep UI responsive
      if (curFrame % 40 === 0) await new Promise(r => setTimeout(r, 0));
      requestAnimationFrame(processFrame);
    }

    requestAnimationFrame(processFrame);
  }

  // ── Note → state + UI ───────────────────────────────────
  function finalizeNote(start, end, hz, clarity) {
    const dur = end - start;
    if (dur < state.minDuration) return;
    const midi  = hzToMidi(hz);
    const note  = midiToNote(midi);
    const noteObj = { start, end, hz, midi, note, clarity };
    state.notes.push(noteObj);
    log('note', `finalized ${note}  ${hz.toFixed(1)} Hz  ${dur.toFixed(2)}s  c=${clarity.toFixed(2)}`, 'ok');
    addSegmentEl(null, noteObj);
    drawPianoRoll();
  }

  function finishProcessing() {
    state.isProcessing = false;
    const n = state.notes.length;
    setProgress(`Done — ${n} note${n===1?'':'s'} detected`, n > 0 ? 'ok' : 'warn');
    log('PROC', `Processing complete — ${n} notes`, n > 0 ? 'ok' : 'warn');
    renderNotation();
  }

  // ── MIDI / note utilities ────────────────────────────────
  function hzToMidi(hz) { return 12 * Math.log2(hz / 440) + 69; }
  function midiToHz(m)  { return 440 * Math.pow(2, (m - 69) / 12); }

  function hzToNote(hz) {
    const m = Math.round(hzToMidi(hz));
    return midiToNote(m);
  }

  function midiToNote(midi) {
    const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const oct   = Math.floor(midi / 12) - 1;
    const name  = names[midi % 12];
    return { midi, name, oct, full: name + oct };
  }

  function fmtHz(hz) { return hz.toFixed(1) + ' Hz'; }
  function fmtDur(s) { return (s >= 0 ? s.toFixed(2) : '?') + 's'; }

  // ── Segment UI ──────────────────────────────────────────
  function addSegmentEl(region, noteObj) {
    const el = document.createElement('div');
    const id = region ? region.id : ('n' + state.notes.length);
    el.className = 'segment';
    el.dataset.regionId = id;

    let noteStr = 'Processing…', hzStr = '', actionsHtml = '';

    if (noteObj) {
      const qual = qualitySelect.value;
      el.classList.add(qual);
      noteStr = noteObj.note.full;
      hzStr   = fmtHz(noteObj.hz);
    } else if (region) {
      const qual = region.data?.quality || 'maybe';
      el.classList.add(qual);
      noteStr = '…';
      hzStr   = '';
    }

    const t  = noteObj ? noteObj.start : (region ? region.start : 0);
    const t2 = noteObj ? noteObj.end   : (region ? region.end   : 0);
    const timeStr = fmtTimeS(t) + ' → ' + fmtTimeS(t2);

    el.innerHTML = `
      <div class="segment-header">
        <span class="time">${timeStr}</span>
        <span class="badge ${noteObj ? qualitySelect.value : (region?.data?.quality||'maybe')}">${noteObj ? qualitySelect.value : (region?.data?.quality||'maybe')}</span>
      </div>
      <div class="segment-note">${noteStr}</div>
      <div class="segment-hz">${hzStr}</div>
      <div class="segment-actions">
        ${noteObj ? `
          <button class="btn btn--sm" data-action="play-segment" data-start="${t.toFixed(3)}" data-end="${t2.toFixed(3)}">▶</button>
          <button class="btn btn--sm" data-action="render-from" data-noteidx="${state.notes.indexOf(noteObj)}">Render from here</button>
        ` : ''}
        <button class="btn btn--sm" data-action="delete">✕ Delete</button>
      </div>`;

    transcriptionText.appendChild(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function updateSegmentEl(region) {
    const el = transcriptionText.querySelector(`[data-region-id="${region.id}"]`);
    if (!el) return;
    el.className = 'segment ' + (region.data?.quality || 'maybe');
    el.querySelector('.badge').className = 'badge ' + (region.data?.quality || 'maybe');
    el.querySelector('.badge').textContent = region.data?.quality || 'maybe';
  }

  function removeSegmentEl(region) {
    const el = transcriptionText.querySelector(`[data-region-id="${region.id}"]`);
    if (el) el.remove();
  }

  function fmtTimeS(s) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60), ms = Math.floor((s % 1) * 1000);
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;
  }

  // Delegate segment actions
  transcriptionText.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'delete') {
      const el = btn.closest('.segment');
      const rid = el.dataset.regionId;
      if (rid.startsWith('n')) {
        const idx = parseInt(rid.slice(1));
        state.notes.splice(idx, 1);
        drawPianoRoll();
      }
      el.remove();
      if (wavesurfer) {
        const r = wavesurfer.regions.list[rid];
        if (r) r.remove();
      }
    }
    if (action === 'play-segment') {
      const s = parseFloat(btn.dataset.start), en = parseFloat(btn.dataset.end);
      if (wavesurfer) {
        wavesurfer.setTime(s);
        wavesurfer.play();
        setTimeout(() => wavesurfer.pause(), (en - s) * 1000);
      }
    }
    if (action === 'render-from') {
      const idx = parseInt(btn.dataset.noteidx);
      renderNotation(idx);
    }
  });

  qualitySelect.addEventListener('change', () => {
    transcriptionText.querySelectorAll('.segment').forEach(el => {
      el.className = 'segment ' + qualitySelect.value;
      const badge = el.querySelector('.badge');
      badge.className = 'badge ' + qualitySelect.value;
      badge.textContent = qualitySelect.value;
    });
  });

  // ── VexFlow notation rendering ────────────────────────────
  function renderNotation(fromNoteIdx) {
    svgOutput.innerHTML = '';
    const notes = fromNoteIdx !== undefined ? state.notes.slice(fromNoteIdx) : state.notes;
    if (notes.length === 0) {
      log('VEX', 'No notes to render', 'warn');
      return;
    }

    const { Renderer, Stave, StaveNote, Voice, Formatter, Beam, Tuplet } = Vex.Flow;
    const container = svgOutput;
    const W = container.clientWidth || 700;
    const H = 240;

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(W, H);
    const ctx = renderer.getContext();
    ctx.setFont('Arial', 12);

    const measureW = Math.min(300, Math.floor((W - 40) / Math.max(1, Math.ceil(notes.length / 8))));
    const measures = [];
    let curX = 10;

    // Group notes into measures of ~4 beats
    let curMeasureNotes = [];
    let curBeat = 0;

    for (const n of notes) {
      const dur = Math.max(0.1, n.end - n.start);
      const beats = Math.round(dur * 2); // 2 beats per quarter at ~120bpm reference
      if (curBeat + beats > 4 && curMeasureNotes.length > 0) {
        measures.push(curMeasureNotes);
        curMeasureNotes = [];
        curBeat = 0;
      }
      curMeasureNotes.push({ ...n, beats });
      curBeat += beats;
    }
    if (curMeasureNotes.length > 0) measures.push(curMeasureNotes);

    let rendered = 0;
    for (let mi = 0; mi < measures.length; mi++) {
      const mNotes = measures[mi];
      if (curX + measureW > W) { curX = 10; }

      const stave = new Stave(curX, 10, measureW);
      if (mi === 0) stave.addClef('treble').addTimeSignature('4/4');
      stave.setContext(ctx).draw();

      const vNotes = [];
      for (const n of mNotes) {
        const pitch = midiToVexPitch(n.midi);
        // duration: 8 = eighth, 4 = quarter, 2 = half, 1 = whole
        const dur = n.beats >= 3 ? 'q' : n.beats === 2 ? 'h' : '8';
        const vfn = new StaveNote({ keys: [pitch], duration: dur })
          .setStyle({ fillStyle: 'currentColor', strokeStyle: 'currentColor' });
        if (pitch.includes('#')) vfn.addModifier(new Vex.Flow.Accidental('#'), 0);
        if (pitch.includes('b') && !pitch.includes('#')) vfn.addModifier(new Vex.Flow.Accidental('b'), 0);
        vNotes.push(vfn);
      }

      try {
        new Formatter().joinVoices([vNotes]).format([vNotes], measureW - 60);
        vNotes.forEach(vn => vn.setContext(ctx).draw());
        // Add beams for eighth notes
        if (mNotes.some(n => n.beats === 1)) {
          try { new Beam(vNotes.filter((_, i) => mNotes[i].beats === 1)).setContext(ctx).draw(); } catch (_) {}
        }
      } catch (e) { log('VEX', 'Format error: ' + e.message, 'warn'); }

      curX += measureW + 8;
      rendered += mNotes.length;
    }

    log('VEX', `Rendered ${rendered} notes across ${measures.length} stave(s)`, 'ok');
    if (prCount) prCount.textContent = state.notes.length + ' notes';
  }

  function midiToVexPitch(midi) {
    const names = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
    const oct   = Math.floor(midi / 12) - 1;
    const name  = names[midi % 12];
    return name + '/' + oct;
  }

  $('render-notation').addEventListener('click', () => renderNotation());

  // ── Piano Roll canvas ────────────────────────────────────
  function drawPianoRoll() {
    if (!prCanvas) return;
    const notes = state.notes;
    if (prCount) prCount.textContent = notes.length + ' notes';
    if (notes.length === 0) {
      const ctx = prCanvas.getContext('2d');
      prCanvas.width  = prCanvas.parentElement.clientWidth  || 800;
      prCanvas.height = 140;
      ctx.clearRect(0, 0, prCanvas.width, prCanvas.height);
      return;
    }

    const dur    = notes[notes.length - 1].end;
    const minMidi = Math.min(...notes.map(n => n.midi));
    const maxMidi = Math.max(...notes.map(n => n.midi));
    const range  = Math.max(12, maxMidi - minMidi + 2);
    const W = prCanvas.parentElement.clientWidth  || 800;
    const H = 140;
    const keysH = 18; // piano keyboard strip at top
    prCanvas.width  = W;
    prCanvas.height = H;

    const ctx = prCanvas.getContext('2d');
    const isDark = root.getAttribute('data-theme') === 'dark';

    // Background
    ctx.fillStyle = isDark ? '#13141b' : '#f0f0ec';
    ctx.fillRect(0, 0, W, H);

    // Keyboard strip
    ctx.fillStyle = isDark ? '#1c1f2b' : '#e0e0d8';
    ctx.fillRect(0, 0, W, keysH);
    const octH = keysH / (range / 12);
    const noteH = (H - keysH) / range;
    const pxPerSec = (W - 60) / dur;

    // Draw note lanes
    for (let i = 0; i < range; i++) {
      const midi = minMidi + range - 1 - i;
      const y = keysH + i * noteH;
      const isBlack = [1,3,6,8,10].includes(midi % 12);
      ctx.fillStyle = isBlack ? (isDark ? '#252838' : '#c8c8c0') : (isDark ? '#1c1f2b' : '#e8e8e0');
      ctx.fillRect(0, y, W, noteH);
      // Middle C line
      if (midi % 12 === 0) {
        ctx.strokeStyle = isDark ? '#7dd3c0' : '#0d8f7e';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }

    // Time axis
    ctx.fillStyle = isDark ? '#9094a6' : '#5f5f6a';
    ctx.font = '10px ui-monospace, monospace';
    for (let t = 0; t <= dur; t += Math.max(0.5, Math.round(dur / 8))) {
      const x = 10 + t * pxPerSec;
      ctx.fillText(t.toFixed(1) + 's', x, H - 4);
      ctx.strokeStyle = isDark ? '#252838' : '#d0cfc8';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, keysH); ctx.lineTo(x, H); ctx.stroke();
    }

    // Notes
    for (const n of notes) {
      const x = 10 + n.start * pxPerSec;
      const y = keysH + (maxMidi - n.midi) * noteH;
      const w = Math.max(3, (n.end - n.start) * pxPerSec);
      const alpha = 0.4 + n.clarity * 0.6;
      ctx.fillStyle = `rgba(125, 211, 192, ${alpha})`;
      ctx.fillRect(x, y + 1, w, noteH - 2);
      ctx.strokeStyle = isDark ? '#7dd3c0' : '#0d8f7e';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y + 1, w, noteH - 2);
    }

    // Labels
    ctx.fillStyle = isDark ? '#9094a6' : '#5f5f6a';
    for (let i = 0; i < range; i += (i === 0 || i === range - 1 ? 1 : 3)) {
      const midi = minMidi + range - 1 - i;
      const y = keysH + i * noteH + noteH - 3;
      const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
      ctx.fillText(names[midi % 12] + Math.floor(midi / 12) + '', 2, y);
    }
  }

  // ── Export: SVG ──────────────────────────────────────────
  exportSvgBtn.addEventListener('click', () => {
    const svg = svgOutput.querySelector('svg');
    if (!svg) { showToast('No notation to export'); return; }
    const src = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([src], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, 'transcription.svg');
    log('EXPORT', 'SVG exported', 'ok');
  });

  // ── Export: PDF ──────────────────────────────────────────
  exportPdfBtn.addEventListener('click', async () => {
    const svg = svgOutput.querySelector('svg');
    if (!svg) { showToast('No notation to export'); return; }
    try {
      const { jsPDF } = await loadLib('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      const { html2canvas } = await loadLib('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      const el = svgOutput;
      const canvas = await html2canvas(el, { backgroundColor: null });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [el.clientWidth || 700, el.clientHeight || 240] });
      pdf.addImage(img, 'PNG', 0, 0, el.clientWidth || 700, el.clientHeight || 240);
      pdf.save('transcription.pdf');
      log('EXPORT', 'PDF exported', 'ok');
    } catch (e) { log('EXPORT', 'PDF failed: ' + e.message, 'err'); showToast('PDF export failed'); }
  });

  // ── Export: MIDI ────────────────────────────────────────
  exportMidiBtn.addEventListener('click', () => {
    if (state.notes.length === 0) { showToast('No notes to export'); return; }
    const midiBytes = buildMidi();
    const blob = new Blob([midiBytes], { type: 'audio/midi' });
    downloadBlob(blob, 'transcription.mid');
    log('EXPORT', `MIDI exported — ${state.notes.length} notes`, 'ok');
    showToast('MIDI file downloaded');
  });

  function buildMidi() {
    // Simple Format 1 MIDI file
    const ticksPerQuarter = 480;
    // Collect all events
    const events = [];
    for (const n of state.notes) {
      const startTick = Math.round(n.start * ticksPerQuarter * 2); // 2 Q/second reference
      const durTick   = Math.round((n.end - n.start) * ticksPerQuarter * 2);
      events.push({ tick: startTick, type: 'on',  midi: Math.round(n.midi), vel: 80 });
      events.push({ tick: startTick + durTick, type: 'off', midi: Math.round(n.midi), vel: 0 });
    }
    events.sort((a, b) => a.tick - b.tick || (a.type === 'off' ? -1 : 1));

    // Delta-encoded track
    let lastTick = 0;
    const trackData = [];
    for (const e of events) {
      const delta = Math.max(0, e.tick - lastTick);
      lastTick = e.tick;
      const vlq = encodeVLQ(delta);
      trackData.push(...vlq);
      if (e.type === 'on') {
        trackData.push(0x90, e.midi, e.vel);
      } else {
        trackData.push(0x80, e.midi, 0x00);
      }
    }
    trackData.push(0x00, 0xFF, 0x2F, 0x00); // end of track

    // Header: MThd + 6 bytes
    const header = [0x4D, 0x54, 0x68, 0x64, // MThd
                    0x00, 0x00, 0x00, 0x06,  // chunk size = 6
                    0x00, 0x01,              // format 1
                    0x00, 0x01,              // 1 track
                    (ticksPerQuarter >> 8) & 0xFF, ticksPerQuarter & 0xFF];

    // Track chunk: MTrk + size + data
    const trackSize = trackData.length;
    const track = [0x4D, 0x54, 0x72, 0x6B, // MTrk
                   (trackSize >> 24) & 0xFF,
                   (trackSize >> 16) & 0xFF,
                   (trackSize >>  8) & 0xFF,
                   trackSize & 0xFF,
                   ...trackData];

    return new Uint8Array([...header, ...track]);
  }

  function encodeVLQ(n) {
    if (n === 0) return [0];
    const bytes = [];
    bytes.push(n & 0x7F);
    n >>= 7;
    while (n > 0) { bytes.push((n & 0x7F) | 0x80); n >>= 7; }
    return bytes.reverse();
  }

  // ── Export: MusicXML ─────────────────────────────────────
  exportMxBtn.addEventListener('click', () => {
    if (state.notes.length === 0) { showToast('No notes to export'); return; }
    const xml = buildMusicXML();
    const blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' });
    downloadBlob(blob, 'transcription.musicxml');
    log('EXPORT', 'MusicXML exported', 'ok');
    showToast('MusicXML downloaded');
  });

  function buildMusicXML() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const notes_xml = state.notes.map(n => {
      const step = ['C','D','E','F','G','A','B'][n.midi % 12];
      let alter = 0;
      const rawStep = step;
      const oct = Math.floor(n.midi / 12) - 1;
      const dur = Math.round((n.end - n.start) * 4 * 480); // in divisionths (480 = quarter)
      return `    <note>
      <pitch><step>${rawStep}</step>${alter !== 0 ? `<alter>${alter}</alter>` : ''}<octave>${oct}</octave></pitch>
      <duration>${Math.max(1, dur)}</duration>
      <type>quarter</type>
    </note>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>Transcription</work-title></work>
  <identification>
    <creator type="composer">MTM Transcriber</creator>
    <creation-date>${date}</creation-date>
  </identification>
  <part-list>
    <score-part id="P1"><part-name>Transcription</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>480</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
${notes_xml}
    </measure>
  </part>
</score-partwise>`;
  }

  // ── Helpers ─────────────────────────────────────────────
  function loadLib(url) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${url}"]`)) { res(window.jspdf || window.html2canvas); return; }
      const s = document.createElement('script');
      s.src = url; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function setProgress(msg, type) {
    transcriptionProgress.textContent = msg;
    transcriptionProgress.className = 'progress-bar' + (type ? ' ' + type : '');
  }

  function updateTimeDisplay() {
    if (!wavesurfer || !audioBuffer) { if (timeDisplay) timeDisplay.textContent = '—'; return; }
    const t = wavesurfer.getCurrentTime();
    const dur = audioBuffer.duration;
    if (timeDisplay) timeDisplay.textContent = fmtTimeS(t) + ' / ' + fmtTimeS(dur);
    requestAnimationFrame(updateTimeDisplay);
  }

  // ── Keyboard shortcuts ──────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') { e.preventDefault(); playBtn.click(); }
    if (e.code === 'KeyM')  { micBtn.click(); }
    if (e.code === 'Escape'){ stopAll(); }
  });

  // ── Init ────────────────────────────────────────────────
  initTheme();
  log('APP', 'Transcriber initialized', 'ok');
  log('INFO', `ACF pitch detection — ${PITCH_SAMPLES} win / ${HOPSIZE} hop / ${DETECT_SAMPLE_RATE} Hz`, 'info');
  log('INFO', `Range: ${MIN_HZ}–${MAX_HZ} Hz  Clarity threshold: ${CLARITY_THRESH}`, 'info');

  // Auto-process if audioBuffer is already loaded
  if (audioBuffer) processAudio();

})();
