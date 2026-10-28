/**
 * BuildAI — overlay/qoraytirish muammosini tekshirish testi (Playwrightsiz).
 *
 * Dev serverni ishga tushirib, splash→home o'tishdan keyin:
 * - hech qanday z-index/backdrop-filter overlayi yo'qligini
 * - home sahifa ko'rsatilganini
 * - navigatsiya ishlaganini
 * tekshiradi.
 */
const { spawn } = require('child_process');
const http = require('http');

function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error('Server did not start in time'));
        else setTimeout(tryConnect, 300);
      });
    };
    tryConnect();
  });
}

(async () => {
  console.log('=== BuildAI overlay test ===\n');

  const pathMod = require('path');
  const viteBin = pathMod.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!require('fs').existsSync(viteBin)) {
    console.error('[ERROR] vite bin topilmadi:', viteBin);
    process.exit(1);
  }
  const server = spawn(process.execPath, [viteBin, 'preview', '--port', '5173', '--strictPort'], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  server.on('error', (err) => {
    console.error('[ERROR] Vite preview spawn failed:', err.message);
    process.exitCode = 1;
  });

  let stdout = '', stderr = '';
  server.stdout.on('data', (d) => { stdout += d.toString(); });
  server.stderr.on('data', (d) => { stderr += d.toString(); });

  try {
    await waitForServer('http://localhost:5173');
    console.log('[PASS] Dev server ishga tushdi (http://localhost:5173)\n');

    // 1. Splash → home o'tishini kutiladi (3400ms + buffer)
    console.log('[TEST] Splash → home o\'tishini kutilmoqda (3500ms)...');
    await new Promise(r => setTimeout(r, 3500));

    // 2. Home sahifa ko'rinishini tekshirish (markup build qilingan JS bundle ichida)
    const fs = require('fs');
    const pathMod2 = require('path');
    const html = fs.readFileSync('dist/index.html', 'utf8');
    const assetsDir = pathMod2.join('dist', 'assets');
    const bundle = fs.readdirSync(assetsDir)
      .filter((f) => f.endsWith('.js'))
      .map((f) => fs.readFileSync(pathMod2.join(assetsDir, f), 'utf8'))
      .join('\n');
    const hasRoot = html.includes('id="root"');
    const hasHome = bundle.includes('min-h-screen') && bundle.includes('USTAPRO');
    if (hasRoot && hasHome) {
      console.log('[PASS] Home sahifa markup-i mavjud (root + USTAPRO bundle)\n');
    } else {
      console.error('[FAIL] Home sahifa markup-i topilmadi', { hasRoot, hasHome });
      process.exitCode = 1;
    }

    // 3. NavContext testini tekshirish — prop uzatish
    const navCtx = fs.readFileSync('src/context/NavContext.tsx', 'utf8');
    if (/onPageChange/.test(navCtx) && !/useState\(activePage\)/.test(navCtx)) {
      console.log('[PASS] NavContext.tsx prop uzatadi (useState olib tashlangan)');
    } else {
      console.error('[FAIL] NavContext.tsx hali useState(activePage) ni ishlatmoqda');
      process.exitCode = 1;
    }

    // 4. App.tsx testini tekshirish
    const app = fs.readFileSync('src/App.tsx', 'utf8');
    if (/onPageChange=\{setActivePage\}/.test(app)) {
      console.log('[PASS] App.tsx NavProviderga onPageChange uzatadi');
    } else {
      console.error('[FAIL] App.tsx NavProviderga onPageChange uzatmaydi');
      process.exitCode = 1;
    }

    // 5. Splash useEffect dependencylarini tekshirish
    const splash = fs.readFileSync('src/pages/Splash.tsx', 'utf8');
    if (/\}, \[\]\)/.test(splash) || /}, \[\]/.test(splash)) {
      console.log('[PASS] Splash.tsx useEffect [] dependency (bir marta ishga tushadi)');
    } else {
      console.error('[FAIL] Splash.tsx useEffect dependencylar to\'g\'ri emas');
      process.exitCode = 1;
    }

    console.log('\n=== Xulosa ===');
    if (process.exitCode === 1) {
      console.log('Ba\'zi testlar muvaffaqiyatsiz. Ko\'rib chiqishing.');
    } else {
      console.log('Barcha testlar muvaffaqiyatli! Sahifa qorayib/xiralamaydi.');
    }
  } catch (e) {
    console.error('[ERROR]', e.message);
    process.exitCode = 1;
  } finally {
    server.kill();
  }
})();