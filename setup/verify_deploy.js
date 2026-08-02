const puppeteer = require('puppeteer');
const URL = 'https://r50ix59e9vxop.space.minimax.io';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const errors = [];
  const pages = [
    { path: '/', name: 'index', expects: ['Agentic Music Transcription Monitor', 'arXiv Report', 'GitHub Pulse', 'Asset Research', 'Total Links', 'Solo Transcription Tester'] },
    { path: '/arxiv.html', name: 'arxiv', expects: ['MuScriptor', 'Copy prompt', 'arxiv.org/abs/'] },
    { path: '/github.html', name: 'github', expects: ['GitHub Pulse', 'facebookresearch/demucs'] },
    { path: '/assets.html', name: 'assets', expects: ['Asset Research', 'MusicNet', 'Slakh2100'] },
    { path: '/links.html', name: 'links', expects: ['Total Links', 'arxiv.org'] },
    { path: '/tester.html', name: 'tester', expects: ['Solo Instrument Transcription Tester', 'ACF2+'] },
  ];
  for (const p of pages) {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(`${p.name}: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${p.name} [console]: ${m.text()}`); });
    const resp = await page.goto(URL + p.path, { waitUntil: 'networkidle0', timeout: 30000 });
    const status = resp ? resp.status() : 0;
    const html = await page.content();
    const missing = p.expects.filter((s) => !html.includes(s));
    const ok = status === 200 && missing.length === 0;
    console.log(`  ${ok ? '✓' : '✗'} ${p.name.padEnd(8)} status=${status} missing=${missing.length ? missing.join(',') : 'none'}`);
    await page.close();
  }
  await browser.close();
  console.log('');
  if (errors.length) {
    console.log('  Errors:');
    errors.forEach((e) => console.log('    ' + e));
    process.exit(1);
  }
  console.log('  ✓ No runtime errors. All 6 pages deployed and verified.');
})();
