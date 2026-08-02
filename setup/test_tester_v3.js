// e2e test for the v0.3 tester — play/stop on both players, crop
const puppeteer = require('puppeteer');
const path = require('path');

const BASE = 'https://abr6ix00b1yoh.space.minimax.io';
const SHOTS = '/tmp/dashboard-shots';
if (!require('fs').existsSync(SHOTS)) require('fs').mkdirSync(SHOTS, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', (d) => d.accept()); // auto-OK the sample-button confirm()

  await page.goto(BASE + '/tester.html', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));

  // Click "Use built-in sample" (C major scale)
  await page.click('#sample-btn');
  await new Promise((r) => setTimeout(r, 400));

  const inputStatus = await page.$eval('#status', (el) => el.textContent);
  console.log('  After sample load: ' + inputStatus);

  // Check input player is enabled
  const inputPlayEnabled = await page.$eval('#input-play', (el) => !el.disabled);
  const inputStopEnabled = await page.$eval('#input-stop', (el) => !el.disabled);
  console.log('  Input player Play enabled: ' + inputPlayEnabled + ', Stop enabled: ' + inputStopEnabled);

  // Check crop controls are enabled
  const cropStartEnabled = await page.$eval('#crop-start', (el) => !el.disabled);
  const cropEndEnabled = await page.$eval('#crop-end', (el) => !el.disabled);
  console.log('  Crop start enabled: ' + cropStartEnabled + ', Crop end enabled: ' + cropEndEnabled);

  // Check initial crop = full clip
  const cropStartInitial = await page.$eval('#crop-start-val', (el) => el.textContent);
  const cropEndInitial = await page.$eval('#crop-end-val', (el) => el.textContent);
  console.log('  Initial crop: ' + cropStartInitial + ' → ' + cropEndInitial);

  // Check input audio src is set
  const inputSrc = await page.$eval('#input-audio', (el) => el.src || '');
  const hasInputAudio = inputSrc.startsWith('blob:');
  console.log('  Input audio src is blob URL: ' + hasInputAudio + ' (' + inputSrc.slice(0, 40) + '...)');

  // Click play, wait 600ms, check currentTime > 0, then stop
  await page.click('#input-play');
  await new Promise((r) => setTimeout(r, 600));
  const t1 = await page.$eval('#input-audio', (el) => el.currentTime);
  const isPaused1 = await page.$eval('#input-audio', (el) => el.paused);
  console.log('  After 600ms playing: currentTime=' + t1.toFixed(2) + 's, paused=' + isPaused1);

  await page.click('#input-stop');
  await new Promise((r) => setTimeout(r, 100));
  const t2 = await page.$eval('#input-audio', (el) => el.currentTime);
  const isPaused2 = await page.$eval('#input-audio', (el) => el.paused);
  console.log('  After Stop: currentTime=' + t2.toFixed(2) + 's, paused=' + isPaused2);

  // Now set a crop window: 0.5s to 2.0s (only the first 3 notes of the scale)
  await page.evaluate(() => {
    const s = document.getElementById('crop-start');
    const e = document.getElementById('crop-end');
    // The clip is 4.0s. 0.5s = 12.5%, 2.0s = 50%
    s.value = '12.5';
    s.dispatchEvent(new Event('input', { bubbles: true }));
    e.value = '50';
    e.dispatchEvent(new Event('input', { bubbles: true }));
    s.dispatchEvent(new Event('change', { bubbles: true }));
    e.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 1000)); // let analysis run

  const cropStartSet = await page.$eval('#crop-start-val', (el) => el.textContent);
  const cropEndSet = await page.$eval('#crop-end-val', (el) => el.textContent);
  const cropLengthSet = await page.$eval('#crop-length', (el) => el.textContent);
  const sNotesAfter = await page.$eval('#s-notes', (el) => el.textContent);
  const sKeyAfter = await page.$eval('#s-key', (el) => el.textContent);
  console.log('  After crop to ' + cropStartSet + ' → ' + cropEndSet + ' (length ' + cropLengthSet + ')');
  console.log('  → Detected notes: ' + sNotesAfter + ', key: ' + sKeyAfter);

  // Capture the cropped-state wave + piano so we can see the crop overlay
  await new Promise((r) => setTimeout(r, 400));
  const waveCrop = await page.$eval('#wave-canvas', (c) => c.toDataURL('image/png'));
  const pianoCrop = await page.$eval('#piano-canvas', (c) => c.toDataURL('image/png'));
  require('fs').writeFileSync(path.join(SHOTS, 'tester-v3-wave-cropped.png'), Buffer.from(waveCrop.split(',')[1], 'base64'));
  require('fs').writeFileSync(path.join(SHOTS, 'tester-v3-piano-cropped.png'), Buffer.from(pianoCrop.split(',')[1], 'base64'));

  // Check output audio (synthesized) is now enabled
  const outputPlayEnabled = await page.$eval('#output-play', (el) => !el.disabled);
  const outputSrc = await page.$eval('#output-audio', (el) => el.src || '');
  const hasOutputAudio = outputSrc.startsWith('blob:');
  console.log('  Output player Play enabled: ' + outputPlayEnabled + ', src is blob: ' + hasOutputAudio);

  // Play the synthesized output
  if (outputPlayEnabled) {
    await page.click('#output-play');
    await new Promise((r) => setTimeout(r, 600));
    const tOut = await page.$eval('#output-audio', (el) => el.currentTime);
    const isPausedOut = await page.$eval('#output-audio', (el) => el.paused);
    console.log('  Synth playing after 600ms: currentTime=' + tOut.toFixed(2) + 's, paused=' + isPausedOut);
    await page.click('#output-stop');
    await new Promise((r) => setTimeout(r, 100));
  }

  // Reset crop
  await page.click('#crop-reset');
  await new Promise((r) => setTimeout(r, 1500));
  const sNotesReset = await page.$eval('#s-notes', (el) => el.textContent);
  console.log('  After crop reset: ' + sNotesReset + ' notes');

  // Canvas diagnostic after reset
  const canvasDiag = await page.evaluate(() => {
    const w = document.getElementById('wave-canvas');
    const p = document.getElementById('piano-canvas');
    const sample = (c) => {
      if (!c) return null;
      const rect = c.getBoundingClientRect();
      const ctx = c.getContext('2d');
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let nonZero = 0;
      const total = data.length / 4;
      for (let i = 0; i < total; i++) {
        if (data[i * 4 + 3] > 0) nonZero++;
      }
      return { width: c.width, height: c.height, cssW: rect.width, cssH: rect.height, nonZeroPixels: nonZero, totalSampled: total };
    };
    return { wave: sample(w), piano: sample(p) };
  });
  console.log('  Canvas diag (after reset):', JSON.stringify(canvasDiag));

  // Capture screenshots
  await page.screenshot({ path: path.join(SHOTS, 'tester-v3-cropped.png'), fullPage: true });

  // Save wave + piano canvases
  const wave = await page.$eval('#wave-canvas', (c) => c.toDataURL('image/png'));
  const piano = await page.$eval('#piano-canvas', (c) => c.toDataURL('image/png'));
  require('fs').writeFileSync(path.join(SHOTS, 'tester-v3-wave.png'), Buffer.from(wave.split(',')[1], 'base64'));
  require('fs').writeFileSync(path.join(SHOTS, 'tester-v3-piano.png'), Buffer.from(piano.split(',')[1], 'base64'));

  await browser.close();

  console.log('');
  if (errors.length) {
    console.log('  ✗ Errors:');
    errors.forEach((e) => console.log('    ' + e));
  } else {
    console.log('  ✓ No runtime errors');
  }

  const pass = inputPlayEnabled && inputStopEnabled && cropStartEnabled && cropEndEnabled
             && hasInputAudio && t1 > 0.1 && !isPaused1 && t2 < 0.1 && isPaused2
             && sNotesAfter !== '—' && outputPlayEnabled && hasOutputAudio
             && sNotesReset === '8' && errors.length === 0;
  console.log('');
  console.log(pass ? '  RESULT: PASS ✓' : '  RESULT: FAIL ✗');
  process.exit(pass ? 0 : 1);
})();
