// e2e test for v0.3.2: debug log + freeze-free analysis on long files
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE = 'https://ytmvynxhqf9v6.space.minimax.io';
const SHOTS = '/tmp/dashboard-shots';
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

function genWav(durSec, freqs, durEach, sr) {
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

// 60s of C major arpeggios — 60 notes
const midiNotes = [];
for (var m = 60; m <= 60 + 59; m++) midiNotes.push(midiToFreq(m));
const TEST_WAV = '/tmp/test60s.wav';
fs.writeFileSync(TEST_WAV, genWav(60, midiNotes, 1.0, 22050));
console.log('  Wrote test WAV: ' + TEST_WAV + ' (' + (fs.statSync(TEST_WAV).size / 1024 / 1024).toFixed(2) + ' MB, 60s)');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(BASE + '/tester.html', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));

  // Verify debug log is present
  const debugLogExists = await page.$('#debuglog-body') !== null;
  const debugLogInitial = await page.$$eval('#debuglog-body .debuglog__line', (els) => els.length);
  console.log('  Debug log panel present: ' + debugLogExists);
  console.log('  Initial debug log lines: ' + debugLogInitial);

  // Upload the 60s file
  console.log('  Uploading 60s WAV…');
  const fileInput = await page.$('#file-input');
  await fileInput.uploadFile(TEST_WAV);
  await new Promise((r) => setTimeout(r, 500));
  const statusAfterLoad = await page.$eval('#status', (el) => el.textContent);
  console.log('  Status after upload: ' + statusAfterLoad);

  // Verify the debug log captured the upload event
  const debugLogAfterLoad = await page.$$eval('#debuglog-body .debuglog__line', (els) => els.length);
  console.log('  Debug log lines after upload: ' + debugLogAfterLoad);

  // Click Analyze
  console.log('  Clicking Analyze…');
  const t0 = Date.now();
  await page.click('#analyze-btn');

  // Poll responsiveness + log size every 200ms
  const checks = [];
  let maxEval = 0;
  let finalLogCount = 0;
  for (let i = 0; i < 250; i++) {  // 50s ceiling
    await new Promise((r) => setTimeout(r, 200));
    const statusNow = await page.$eval('#status', (el) => el.textContent);
    const tickStart = Date.now();
    try {
      await page.evaluate(() => 1 + 1);
    } catch (e) {
      checks.push({ t: Date.now() - t0, status: statusNow, responsive: false, err: e.message });
      continue;
    }
    const tickDur = Date.now() - tickStart;
    maxEval = Math.max(maxEval, tickDur);
    checks.push({ t: Date.now() - t0, status: statusNow, responsive: tickDur < 500, eval_ms: tickDur });
    finalLogCount = await page.$$eval('#debuglog-body .debuglog__line', (els) => els.length);
    const lastLogText = await page.$$eval('#debuglog-body .debuglog__line .debuglog__msg', (els) =>
      els.length ? els[els.length - 1].textContent : '');
    if (/Analysis complete/.test(statusNow) && /synth output ready/.test(lastLogText)) {
      console.log('  ✓ Analysis + synth complete in ' + (Date.now() - t0) + 'ms');
      break;
    }
  }

  const allResponsive = checks.every((c) => c.responsive);
  const finalStatus = checks[checks.length - 1].status;
  console.log('  All polls responsive: ' + allResponsive + ' (max eval=' + maxEval + 'ms)');
  console.log('  Final status: ' + finalStatus);
  console.log('  Final debug log line count: ' + finalLogCount);

  // Verify the final state
  const sNotes = await page.$eval('#s-notes', (el) => el.textContent);
  const outputPlayEnabled = await page.$eval('#output-play', (el) => !el.disabled);
  const debugLogVisible = await page.$$eval('#debuglog-body .debuglog__line', (els) =>
    els.filter((e) => e.offsetParent !== null).length);
  console.log('  Detected notes: ' + sNotes);
  console.log('  Output (synth) player enabled: ' + outputPlayEnabled);

  // Read a few log lines to confirm content
  const logLines = await page.$$eval('#debuglog-body .debuglog__line', (els) =>
    els.slice(-10).map((e) => e.textContent.trim().replace(/\s+/g, ' '))
  );
  console.log('  Last 10 log lines:');
  logLines.forEach((l) => console.log('    ' + l));

  // Take a screenshot showing the debug log
  await page.screenshot({ path: path.join(SHOTS, 'tester-v0.3.2-debuglog.png'), fullPage: true });

  await browser.close();

  const pass = allResponsive
    && /Analysis complete/.test(finalStatus)
    && outputPlayEnabled
    && sNotes !== '—' && sNotes !== '0'
    && finalLogCount > 20  // we should have lots of log lines
    && debugLogInitial >= 2 // initial boot lines
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
