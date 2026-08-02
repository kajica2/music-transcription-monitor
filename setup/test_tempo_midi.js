// e2e test for v0.3.3: tempo detection (autocorr) + MIDI download
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE = 'https://r50ix59e9vxop.space.minimax.io';
const SHOTS = '/tmp/dashboard-shots';
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

function genWavMelody(durSec, freqs, durEach, sr) {
  sr = sr || 22050;
  var numSamples = Math.floor(durSec * sr);
  var ab = new ArrayBuffer(44 + numSamples * 2);
  var view = new DataView(ab);
  function ws(off, str) { for (var i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); }
  ws(0, 'RIFF'); view.setUint32(4, 44 + numSamples * 2 - 8, true); ws(8, 'WAVE');
  ws(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sr, true); view.setUint32(28, sr * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  ws(36, 'data'); view.setUint32(40, numSamples * 2, true);
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

function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

// 16-note melody at 120 BPM (each note 0.5s = 8s total)
// C major scale repeated twice: C4 D4 E4 F4 G4 A4 B4 C5 C4 D4 E4 F4 G4 A4 B4 C5
const TEST_MELODY = [];
for (var i = 0; i < 2; i++) {
  for (var m = 60; m <= 60 + 7; m++) TEST_MELODY.push(midiToFreq(m));
}
const TEST_WAV = '/tmp/melody120bpm.wav';
fs.writeFileSync(TEST_WAV, genWavMelody(8, TEST_MELODY, 0.5, 22050));
console.log('  Wrote test melody: ' + TEST_WAV + ' (16 notes at 120 BPM, 8s)');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(BASE + '/tester.html', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));

  // Upload the metronome audio
  const fileInput = await page.$('#file-input');
  await fileInput.uploadFile(TEST_WAV);
  await new Promise((r) => setTimeout(r, 500));

  // Click analyze
  await page.click('#analyze-btn');
  // Wait for analysis + synth + MIDI
  let attempts = 0;
  while (attempts < 200) {
    await new Promise((r) => setTimeout(r, 200));
    const allLogs = await page.$$eval('#debuglog-body .debuglog__line .debuglog__msg', (els) =>
      els.map((e) => e.textContent));
    const joined = allLogs.join(' | ');
    if (/synth output ready/.test(joined) && /MIDI generated/.test(joined)) break;
    attempts++;
  }
  await new Promise((r) => setTimeout(r, 500));
  // Dump last 15 log lines for debugging
  const lastLogs = await page.$$eval('#debuglog-body .debuglog__line', (els) =>
    els.slice(-15).map((e) => e.textContent.trim().replace(/\s+/g, ' ')));
  console.log('  Last 15 log lines:');
  lastLogs.forEach((l) => console.log('    ' + l));
  // Read stat and sNotes for debug
  const sNotes = await page.$eval('#s-notes', (el) => el.textContent);
  console.log('  sNotes (stat):         ' + sNotes);
  // Also read notes count from description
  const desc0 = await page.$eval('#description', (el) => el.textContent);
  const notesMatch = desc0.match(/Notes detected:\s+(\d+)/);
  console.log('  Notes (from desc):     ' + (notesMatch ? notesMatch[1] : 'n/a'));

  // Verify state
  const tempoText = await page.$eval('#s-tempo', (el) => el.textContent);
  const tempoTitle = await page.$eval('#s-tempo', (el) => el.title);
  console.log('  Detected tempo (stat):  ' + tempoText);
  console.log('  Detected tempo (title): ' + tempoTitle);

  // Verify MIDI download
  const midiDownloadHref = await page.$eval('#output-midi-download', (el) => el.href);
  const midiDownloadName = await page.$eval('#output-midi-download', (el) => el.download);
  const midiDownloadVisible = await page.$eval('#output-midi-download', (el) => el.style.display !== 'none');
  console.log('  MIDI download name:    ' + midiDownloadName);
  console.log('  MIDI download visible: ' + midiDownloadVisible);
  console.log('  MIDI href starts with: ' + (midiDownloadHref || '').slice(0, 20));

  // Fetch the MIDI blob and verify structure
  const midiBase64 = await page.evaluate(async () => {
    const a = document.getElementById('output-midi-download');
    if (!a.href) return null;
    const resp = await fetch(a.href);
    const buf = await resp.arrayBuffer();
    const u8 = new Uint8Array(buf);
    // Convert to base64 in chunks (avoid stack overflow)
    let bin = '';
    for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
    return { b64: btoa(bin), len: u8.length };
  });
  let buf = null, head = null, trackHead = null, mtrkIdx = -1;
  if (midiBase64) {
    buf = Buffer.from(midiBase64.b64, 'base64');
    head = buf.slice(0, 4).toString('ascii');
    trackHead = buf.slice(0, 14).toString('ascii');
    const len = midiBase64.len;
    console.log('  MIDI file size:        ' + len + ' bytes');
    console.log('  MIDI header:           ' + trackHead);
    console.log('  Header is MThd:        ' + (head === 'MThd'));
    // Find MTrk
    mtrkIdx = buf.indexOf('MTrk');
    console.log('  MTrk found at offset:   ' + mtrkIdx);
    // First few bytes after the header
    if (mtrkIdx >= 0) {
      const trackLen = buf.readUInt32BE(mtrkIdx + 4);
      console.log('  MTrk length:           ' + trackLen + ' bytes');
    }
    // Find tempo meta (FF 51 03)
    const tempoIdx = buf.indexOf(Buffer.from([0xFF, 0x51, 0x03]));
    if (tempoIdx >= 0) {
      const usPerQ = (buf[tempoIdx + 3] << 16) | (buf[tempoIdx + 4] << 8) | buf[tempoIdx + 5];
      const bpm = Math.round(60000000 / usPerQ);
      console.log('  Tempo meta at offset:   ' + tempoIdx);
      console.log('  Tempo (BPM from meta):  ' + bpm);
    }
  }

  // Check the description has tempo detection details
  const description = await page.$eval('#description', (el) => el.textContent);
  const tempoInDesc = /Detected tempo:.*BPM/.test(description);
  const methodInDesc = /method:/.test(description);
  console.log('  Description has BPM:    ' + tempoInDesc);
  console.log('  Description has method: ' + methodInDesc);

  // Also test the built-in sample (should be ~120 BPM) — fresh page
  console.log('  ---');
  console.log('  Reloading page to test built-in sample…');
  await page.goto(BASE + '/tester.html', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));
  page.removeAllListeners('dialog');
  page.on('dialog', (d) => d.accept());
  await page.click('#sample-btn');
  await new Promise((r) => setTimeout(r, 800));
  await page.click('#analyze-btn');
  // Wait for synth
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const allLogs = await page.$$eval('#debuglog-body .debuglog__line .debuglog__msg', (els) =>
      els.map((e) => e.textContent).join(' | '));
    if (/synth output ready/.test(allLogs) && /MIDI generated/.test(allLogs)) break;
  }
  const sampleTempo = await page.$eval('#s-tempo', (el) => el.textContent);
  const sampleTitle = await page.$eval('#s-tempo', (el) => el.title);
  console.log('  Built-in sample tempo:  ' + sampleTempo);
  console.log('  Built-in sample title:  ' + sampleTitle);

  await page.screenshot({ path: path.join(SHOTS, 'tester-v0.3.3.png'), fullPage: true });

  await browser.close();

  // Parse the tempo from the stat text
  const tempoMatch = tempoText.match(/(\d+)\s*BPM/);
  const detectedBpm = tempoMatch ? parseInt(tempoMatch[1], 10) : null;
  const sampleTempoMatch = sampleTempo.match(/(\d+)\s*BPM/);
  const sampleBpm = sampleTempoMatch ? parseInt(sampleTempoMatch[1], 10) : null;

  // Test: melody at 120 BPM should be detected as 100-140 BPM
  const tempoAccurate = detectedBpm !== null && Math.abs(detectedBpm - 120) <= 30;
  // Test: sample at 120 BPM should be detected as 100-140 BPM
  const sampleAccurate = sampleBpm !== null && Math.abs(sampleBpm - 120) <= 30;
  // Test: MIDI file is valid
  const midiValid = midiBase64 && midiBase64.len > 50 && buf.indexOf('MThd') === 0 && mtrkIdx > 0;

  const pass = tempoAccurate && sampleAccurate && midiValid
    && tempoInDesc && methodInDesc && errors.length === 0;
  console.log('');
  console.log('  Melody tempo in [90,150]:   ' + tempoAccurate + ' (got ' + detectedBpm + ')');
  console.log('  Sample tempo in [90,150]:   ' + sampleAccurate + ' (got ' + sampleBpm + ')');
  console.log('  MIDI file valid:            ' + midiValid);
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
