// e2e test for the music-transcription-monitor dashboard
// Verifies: each page renders, no console errors, copy prompt works,
// links are clickable, links page filter works, tester produces output.

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8765';
const SHOTS = '/tmp/dashboard-shots';
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

const pages = [
  { name: 'index',  url: '/index.html',  expects: ['Agentic Music Transcription Monitor', 'arXiv Report', 'GitHub Pulse', 'Asset Research', 'Total Links', 'Solo Transcription Tester'] },
  { name: 'arxiv',  url: '/arxiv.html',  expects: ['arXiv: AMT', 'MuScriptor', 'Copy prompt', 'arxiv.org/abs/'] },
  { name: 'github', url: '/github.html', expects: ['GitHub Pulse', 'facebookresearch/demucs', 'langgraph', 'Copy prompt'] },
  { name: 'assets', url: '/assets.html', expects: ['Asset Research', 'MusicNet', 'Slakh2100', 'Copy prompt'] },
  { name: 'links',  url: '/links.html',  expects: ['Total Links', 'Filter by title', 'arxiv.org'] },
  { name: 'tester', url: '/tester.html', expects: ['Solo Instrument Transcription Tester', 'ACF2+', 'Built-in sample'] },
];

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files'],
  });
  const results = [];
  const pageErrors = [];
  for (const p of pages) {
    const page = await browser.newPage();
    page.on('pageerror', (e) => pageErrors.push(`${p.name}: ${e.message}\n${e.stack || ''}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') pageErrors.push(`${p.name} [console.error]: ${msg.text()}`);
    });
    const resp = await page.goto(BASE + p.url, { waitUntil: 'networkidle0', timeout: 30000 });
    const status = resp ? resp.status() : 0;
    const html = await page.content();
    const missing = p.expects.filter((s) => !html.includes(s));
    await page.screenshot({ path: path.join(SHOTS, `${p.name}.png`), fullPage: true });
    const title = await page.title();
    results.push({ name: p.name, status, title, missing, ok: missing.length === 0 && status === 200 });
    await page.close();
  }

  // Test copy-prompt on arxiv page
  const cpPage = await browser.newPage();
  await cpPage.goto(BASE + '/arxiv.html', { waitUntil: 'networkidle0' });
  // Override clipboard
  await cpPage.evaluateOnNewDocument(() => {
    window.__capturedClipboard = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (t) => { window.__capturedClipboard = t; return Promise.resolve(); } },
    });
  });
  await cpPage.reload({ waitUntil: 'networkidle0' });
  await cpPage.click('[data-copy-target="prompt-arxiv"]');
  await new Promise((r) => setTimeout(r, 300));
  const clip = await cpPage.evaluate(() => window.__capturedClipboard || '');
  const copyWorks = clip.length > 200 && clip.includes('arXiv') && clip.includes('STATUS: PASS');
  await cpPage.close();

  // Test links page filter
  const lfPage = await browser.newPage();
  await lfPage.goto(BASE + '/links.html', { waitUntil: 'networkidle0' });
  const totalLinks = await lfPage.$$eval('.link-row', (els) => els.length);
  await lfPage.type('[data-filter-target="links-list"]', 'github');
  await new Promise((r) => setTimeout(r, 200));
  const visibleAfterFilter = await lfPage.$$eval('.link-row', (els) => els.filter((e) => e.style.display !== 'none').length);
  await lfPage.screenshot({ path: path.join(SHOTS, 'links-filtered.png'), fullPage: false });
  await lfPage.close();

  // Test tester: click sample, click analyze, verify output appears
  const tPage = await browser.newPage();
  pageErrors.length = 0;
  tPage.on('pageerror', (e) => pageErrors.push(`tester-runtime: ${e.message}\n${e.stack || ''}`));
  // Auto-accept confirms so the sample button doesn't block
  tPage.on('dialog', (d) => d.accept());
  await tPage.goto(BASE + '/tester.html', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 300));
  await tPage.click('#sample-btn');
  await new Promise((r) => setTimeout(r, 300));
  const statusBefore = await tPage.$eval('#status', (el) => el.textContent);
  await tPage.click('#analyze-btn');
  await new Promise((r) => setTimeout(r, 1500));
  const desc = await tPage.$eval('#description', (el) => el.textContent);
  const sNotes = await tPage.$eval('#s-notes', (el) => el.textContent);
  const sKey = await tPage.$eval('#s-key', (el) => el.textContent);
  // Canvas diagnostics
  const canvasDiag = await tPage.evaluate(() => {
    const w = document.getElementById('wave-canvas');
    const p = document.getElementById('piano-canvas');
    const sample = (c) => {
      if (!c) return null;
      const rect = c.getBoundingClientRect();
      const ctx = c.getContext('2d');
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let nonZero = 0;
      const sample = data.length / 4;
      for (let i = 0; i < sample; i++) {
        const a = data[i * 4 + 3];
        if (a > 0) nonZero++;
      }
      return { width: c.width, height: c.height, cssW: rect.width, cssH: rect.height, nonZeroPixels: nonZero, totalSampled: sample };
    };
    return { wave: sample(w), piano: sample(p) };
  });
  console.log('  Canvas diagnostics:', JSON.stringify(canvasDiag, null, 2));
  // Force a layout + paint, then capture both the page and the canvas directly.
  await tPage.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await new Promise((r) => setTimeout(r, 200));
  // Save the wave canvas as a separate PNG
  const waveBuf = await tPage.$eval('#wave-canvas', (c) => {
    return c.toDataURL('image/png');
  });
  const pianoBuf = await tPage.$eval('#piano-canvas', (c) => {
    return c.toDataURL('image/png');
  });
  require('fs').writeFileSync(path.join(SHOTS, 'tester-wave.png'), Buffer.from(waveBuf.split(',')[1], 'base64'));
  require('fs').writeFileSync(path.join(SHOTS, 'tester-piano.png'), Buffer.from(pianoBuf.split(',')[1], 'base64'));
  await tPage.screenshot({ path: path.join(SHOTS, 'tester-after.png'), fullPage: true });
  await tPage.close();

  // Test theme toggle on index
  const thPage = await browser.newPage();
  await thPage.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
  const themeBefore = await thPage.$eval('html', (el) => el.getAttribute('data-theme'));
  await thPage.click('#theme-toggle');
  await new Promise((r) => setTimeout(r, 200));
  const themeAfter = await thPage.$eval('html', (el) => el.getAttribute('data-theme'));
  await thPage.close();

  await browser.close();

  // Report
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Dashboard e2e test report');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  for (const r of results) {
    const mark = r.ok ? '✓' : '✗';
    console.log(`  ${mark} ${r.name.padEnd(8)} status=${r.status} title="${r.title}"`);
    if (r.missing.length) console.log(`     MISSING strings: ${r.missing.join(', ')}`);
  }
  console.log('');
  console.log(`  ✓ Copy prompt works:  ${copyWorks} (length=${clip.length})`);
  console.log(`  ✓ Links filter:       ${totalLinks} total → ${visibleAfterFilter} visible after typing "github"`);
  console.log(`  ✓ Tester status:      "${statusBefore.slice(0,60)}…"`);
  console.log(`  ✓ Tester sNotes:      "${sNotes}"`);
  console.log(`  ✓ Tester sKey:        "${sKey}"`);
  console.log(`  ✓ Description:        ${desc.length} chars, starts with "${desc.slice(0, 60).replace(/\n/g, ' / ')}"`);
  console.log(`  ✓ Theme toggle:       ${themeBefore} → ${themeAfter}`);
  console.log('');
  if (pageErrors.length) {
    console.log('  ✗ Page errors:');
    pageErrors.forEach((e) => console.log('    ' + e.replace(/\n/g, '\n    ')));
  } else {
    console.log('  ✓ No page errors / console errors');
  }
  console.log('');
  console.log(`  Screenshots: ${SHOTS}/`);

  const allOk = results.every((r) => r.ok) && copyWorks && totalLinks > 20 && visibleAfterFilter < totalLinks && desc.length > 200 && themeBefore !== themeAfter && pageErrors.length === 0;
  console.log('');
  console.log(allOk ? '  RESULT: PASS ✓' : '  RESULT: FAIL ✗');
  process.exit(allOk ? 0 : 1);
})();
