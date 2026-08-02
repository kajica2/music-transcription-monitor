// e2e test for the v0.3.1 fix: long-audio file must NOT freeze the page
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE = 'https://h4p7yeq4ht5ni.space.minimax.io';
const SHOTS = '/tmp/dashboard-shots';
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

/* ---------- Generate a 30-second WAV file: C major scale, 30 notes ---------- */
function genWav(durSec, freqs, durEach, sr) {
  sr = sr || 22050; // use 22050 to keep file size small
  var numSamples = Math.floor(durSec * sr);
  var numCh = 1;
  var bytesPerSample = 2;
  var blockAlign = numCh * bytesPerSample;
  var byteRate = sr * blockAlign;
  var dataSize = numSamples * blockAlign;
  var headerSize = 44;
  var totalSize = headerSize + dataSize;
  var ab = new ArrayBuffer(totalSize);
  var view = new DataView(ab);
  function ws(off, str) { for (var i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); }
  ws(0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  ws(8, 'WAVE');
  ws(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  ws(36, 'data');
  view.setUint32(40, dataSize, true);
  // C major scale, ascending 2 octaves (15 notes), each 2 sec = 30 sec
  // Or simpler: 30 notes of 1 sec each
  var off = 44;
  var noteSamples = Math.floor(durEach * sr);
  for (var n = 0; n < freqs.length; n++) {
    var f = freqs[n];
    for (var k = 0; k < noteSamples && (off - 44) / 2 < numSamples; k++) {
      var t = k / sr;
      var env = 1;
      var attack = Math.min(0.02 * sr, noteSamples * 0.1);
      var release = Math.min(0.1 * sr, noteSamples * 0.3);
      if (k < attack) env = k / attack;
      else if (k > noteSamples - release) env = (noteSamples - k) / release;
      var sample = 0.3 * env * Math.sin(2 * Math.PI * f * t);
      var int16 = sample < 0 ? Math.max(-1, sample) * 0x8000 : Math.min(1, sample) * 0x7FFF;
      view.setInt16(off, int16, true);
      off += 2;
    }
  }
  return Buffer.from(ab);
}

const TEST_WAV = '/tmp/test30s-cmajor.wav';
// 30 notes across 2 octaves of C major: C4..C6
function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
const midiNotes = [];
for (var m = 60; m <= 60 + 29; m++) midiNotes.push(midiToFreq(m)); // C4..D#6
const wav = genWav(30, midiNotes, 1.0, 22050);
fs.writeFileSync(TEST_WAV, wav);
console.log('  Wrote test WAV: ' + TEST_WAV + ' (' + wav.length + ' bytes, 30s)');

/* ---------- Puppeteer test ---------- */
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(BASE + '/tester.html', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));

  // Upload the 30s WAV
  console.log('  Uploading 30s WAV…');
  const fileInput = await page.$('#file-input');
  await fileInput.uploadFile(TEST_WAV);
  await new Promise((r) => setTimeout(r, 500));
  const statusAfterLoad = await page.$eval('#status', (el) => el.textContent);
  console.log('  Status after upload: ' + statusAfterLoad);

  // Click Analyze
  console.log('  Clicking Analyze…');
  const t0 = Date.now();
  await page.click('#analyze-btn');

  // Poll the page every 200ms to verify it's responsive
  const responsivenessChecks = [];
  for (let i = 0; i < 100; i++) {  // 20s ceiling — enough for a 30s file
    await new Promise((r) => setTimeout(r, 200));
    const statusNow = await page.$eval('#status', (el) => el.textContent);
    // Probe responsiveness by calling a no-op evaluate (this is what tests "is the page hung")
    const tickStart = Date.now();
    try {
      await page.evaluate(() => 1 + 1);
    } catch (e) {
      responsivenessChecks.push({ t: Date.now() - t0, status: statusNow, responsive: false, err: e.message });
      continue;
    }
    const tickDur = Date.now() - tickStart;
    responsivenessChecks.push({ t: Date.now() - t0, status: statusNow, responsive: tickDur < 500, eval_ms: tickDur });
    // Check if analysis completed
    if (/Analysis complete/.test(statusNow)) {
      console.log('  ✓ Analysis completed in ' + (Date.now() - t0) + 'ms');
      break;
    }
  }

  const allResponsive = responsivenessChecks.every((c) => c.responsive);
  const finalStatus = responsivenessChecks[responsivenessChecks.length - 1].status;
  const maxEvalMs = Math.max.apply(null, responsivenessChecks.map((c) => c.eval_ms || 0));
  console.log('  All polls responsive: ' + allResponsive + ' (max eval=' + maxEvalMs + 'ms)');
  console.log('  Final status: ' + finalStatus);

  // Verify the final state — notes, synth output
  const sNotes = await page.$eval('#s-notes', (el) => el.textContent);
  const outputPlayEnabled = await page.$eval('#output-play', (el) => !el.disabled);
  console.log('  Detected notes: ' + sNotes);
  console.log('  Output (synth) player enabled: ' + outputPlayEnabled);

  // Test that the page is still responsive after analysis
  await new Promise((r) => setTimeout(r, 200));
  const tickAfterAnalysis = Date.now();
  await page.evaluate(() => 1 + 1);
  const evalAfterMs = Date.now() - tickAfterAnalysis;
  console.log('  Post-analysis eval latency: ' + evalAfterMs + 'ms');

  await page.screenshot({ path: path.join(SHOTS, 'tester-v3-long.png'), fullPage: false });

  await browser.close();

  const pass = allResponsive
    && /Analysis complete/.test(finalStatus)
    && sNotes !== '—' && sNotes !== '0'
    && outputPlayEnabled
    && errors.length === 0;
  console.log('');
  if (errors.length) {
    console.log('  ✗ Errors:');
    errors.forEach((e) => console.log('    ' + e));
  } else {
    console.log('  ✓ No runtime errors');
  }
  console.log('');
  console.log(pass ? '  RESULT: PASS ✓' : '  RESULT: FAIL ✗');
  process.exit(pass ? 0 : 1);
})();
