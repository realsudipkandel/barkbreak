'use strict';

/**
 * Capture Chrome Web Store screenshots for Paw Pause (current on-page pet).
 *
 * Produces:
 *   store/screenshots/screenshot-page-1280x800.png   — dog on a demo webpage
 *   store/screenshots/screenshot-popup-1280x800.png  — hydrated toolbar popup
 *   store/screenshots/screenshot-onboarding-1280x800.png — name & look step
 *   store/screenshots/promo-small-440x280.png
 *
 * Usage:
 *   node scripts/capture-store-screenshots.js
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('../../scripts/cws-assets/node_modules/playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'store', 'screenshots');
const SCREEN_W = 1280;
const SCREEN_H = 800;
const DEMO_ORIGIN = 'https://example.com';

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildSeedState(nowMs) {
  return {
    schemaVersion: 4,
    settings: {
      dogName: 'Kabs',
      dogType: 'black_cat',
      personality: 'calm',
      sound: false,
      size: 'medium',
      attentionFrequency: 'default',
      popupMinutes: 30,
      appearDelaySeconds: 0,
      scope: 'all',
      visible: true,
      onboardingComplete: true,
      quietHoursEnabled: false,
      quietStart: '22:00',
      quietEnd: '08:00',
    },
    sites: [DEMO_ORIGIN],
    pauseUntil: null,
    fullUntil: null,
    lastFedAt: nowMs - 60_000,
    lastRequestAt: null,
    requestsToday: { date: new Date(nowMs).toISOString().slice(0, 10), count: 1 },
    engagedMsToday: { date: new Date(nowMs).toISOString().slice(0, 10), ms: 12 * 60_000 },
    breakEndsAt: null,
    lastBreakOfferedDate: null,
    excitement: {
      mood: 'playful',
      finds: ['sock', 'leaf', 'tennis_ball', 'rubber_duck', 'golden_ball'],
      recentActions: ['fetch', 'water', 'pet'],
      fetchStreak: 2,
      squeakCount: 1,
      lastBarkAt: null,
      lastRareAt: null,
      lastUltraAt: null,
      raresToday: { date: new Date(nowMs).toISOString().slice(0, 10), count: 1 },
      ignoredFoodRequest: false,
      equipped: null,
      memory: {
        favouriteFood: 'biscuit',
        favouriteToy: 'ball',
        preferredAction: 'fetch',
        walkiesAccepted: 3,
        walkiesDeclined: 0,
        foodCounts: { biscuit: 4 },
        actionCounts: { fetch: 6, pet: 5 },
        lastCornerX: 240,
        activeHourBuckets: {},
      },
    },
  };
}

function prepareCaptureExtension() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'barkbreak-capture-'));
  fs.cpSync(ROOT, tempRoot, {
    recursive: true,
    filter: (sourcePath) => {
      const base = path.basename(sourcePath);
      return base !== 'dist' && base !== 'coverage' && base !== 'node_modules' && base !== '.git';
    },
  });

  const demoPage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Focus notes — Demo</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      font-family: "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif;
      background:
        radial-gradient(ellipse 900px 420px at 12% 0%, rgba(42,140,130,0.16), transparent 55%),
        linear-gradient(180deg, #f0faf7 0%, #dceee8 100%);
      color: #14332f;
      min-height: 100vh;
    }
    header {
      padding: 28px 64px 12px;
      border-bottom: 1px solid rgba(20,51,47,0.12);
      background: rgba(255,255,255,0.62);
      backdrop-filter: blur(8px);
    }
    header p { margin: 0; letter-spacing: 0.1em; text-transform: uppercase; font-size: 12px; color: #2A8C82; font-weight: 700; }
    header h1 { margin: 8px 0 0; font-size: 34px; font-weight: 700; letter-spacing: -0.02em; }
    main { max-width: 720px; padding: 36px 64px 160px; line-height: 1.65; font-size: 18px; }
    main h2 { margin-top: 0; font-size: 26px; }
    .meta { font-size: 14px; opacity: 0.65; margin-bottom: 24px; }
  </style>
</head>
<body>
  <header>
    <p>Quiet browsing</p>
    <h1>A small pause between tabs</h1>
  </header>
  <main>
    <p class="meta">Example article · 5 min read</p>
    <h2>Keep the page, take a breath</h2>
    <p>
      Good focus still needs soft breaks. Stretch, refill water, look away from the screen.
      Two quiet minutes often beat another scroll.
    </p>
    <p>
      Paw Pause’s virtual companion lives along the bottom of pages you approve —
      a calm reminder that the internet can wait.
    </p>
    <p>
      No accounts. No shop. Just a companion who may ask for a snack, a toy, or a gentle pet
      while you read.
    </p>
  </main>
</body>
</html>`;
  fs.writeFileSync(path.join(tempRoot, 'demo-article.html'), demoPage);

  const manifestPath = path.join(tempRoot, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.host_permissions = [`${DEMO_ORIGIN}/*`, 'https://*.example.com/*'];
  manifest.content_scripts = [
    {
      matches: [`${DEMO_ORIGIN}/*`, 'https://*.example.com/*'],
      js: ['shared.js', 'excitement.js', 'meow-samples.js', 'sounds.js', 'content.js'],
      run_at: 'document_idle',
    },
  ];
  // Also allow capture of extension demo page via executeScript path if needed
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return tempRoot;
}

function readExtensionIdFromProfile(userDataDir, extensionPath) {
  const prefsPath = path.join(userDataDir, 'Default', 'Preferences');
  if (!fs.existsSync(prefsPath)) {
    return null;
  }
  try {
    const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
    const settings = (prefs.extensions && prefs.extensions.settings) || {};
    const normalizedPath = path.resolve(extensionPath);
    for (const [id, value] of Object.entries(settings)) {
      if (!value || typeof value !== 'object') {
        continue;
      }
      const candidatePath = typeof value.path === 'string' ? path.resolve(value.path) : '';
      if (candidatePath === normalizedPath || candidatePath.includes(path.basename(normalizedPath))) {
        return id;
      }
    }
    const ids = Object.keys(settings).filter((id) => /^[a-p]{32}$/i.test(id));
    if (ids.length === 1) {
      return ids[0];
    }
  } catch (_error) {
    return null;
  }
  return null;
}

async function resolveExtensionId(context, userDataDir, extensionPath) {
  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    try {
      serviceWorker = await context.waitForEvent('serviceworker', { timeout: 5_000 });
    } catch (_error) {
      serviceWorker = undefined;
    }
  }
  if (serviceWorker) {
    const match = serviceWorker.url().match(/^chrome-extension:\/\/([^/]+)\//);
    if (match) {
      return match[1];
    }
  }
  const fromProfile = readExtensionIdFromProfile(userDataDir, extensionPath);
  if (fromProfile) {
    return fromProfile;
  }
  const probePage = await context.newPage();
  try {
    const session = await context.newCDPSession(probePage);
    const { targetInfos } = await session.send('Target.getTargets');
    for (const target of targetInfos) {
      const match = String(target.url || '').match(/^chrome-extension:\/\/([^/]+)\//);
      if (match) {
        return match[1];
      }
    }
  } finally {
    await probePage.close().catch(() => undefined);
  }
  throw new Error('Could not resolve extension id for capture');
}

async function seedStorage(page, state) {
  await page.evaluate(async (payload) => {
    await chrome.storage.local.set({ 'barkbreak.state': payload });
  }, state);
}

async function compositePopup(browser, rawBuffer, outPath) {
  const page = await browser.newPage({
    viewport: { width: SCREEN_W, height: SCREEN_H },
    deviceScaleFactor: 1,
  });
  const dataUrl = `data:image/png;base64,${rawBuffer.toString('base64')}`;
  await page.setContent(
    `<!doctype html><html><head><style>
      html,body{margin:0;width:${SCREEN_W}px;height:${SCREEN_H}px;overflow:hidden}
      body{display:grid;place-items:center;background:
        radial-gradient(ellipse 900px 500px at 14% 10%, rgba(239,106,91,0.18), transparent 55%),
        radial-gradient(ellipse 760px 500px at 90% 82%, rgba(185,221,242,0.28), transparent 52%),
        linear-gradient(155deg,#0D3D38 0%,#145A52 48%,#0A2E2A 100%)}
      .frame{border-radius:16px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.08);background:#f0faf7}
      img{display:block;max-width:400px;max-height:620px}
    </style></head><body><div class="frame"><img src="${dataUrl}" alt="" /></div></body></html>`,
    { waitUntil: 'load' },
  );
  await page.screenshot({ path: outPath, type: 'png' });
  await page.close();
}

async function generatePromo(browser, outPath) {
  const iconPath = path.join(ROOT, 'icons', 'icon-128.png');
  const iconData = fs.readFileSync(iconPath).toString('base64');
  const page = await browser.newPage({
    viewport: { width: 440, height: 280 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<!doctype html><html><head><style>
      html,body{margin:0;width:440px;height:280px;overflow:hidden}
      body{display:flex;align-items:center;gap:18px;padding:28px 32px;
        background:
          radial-gradient(ellipse 280px 180px at 100% 0%, rgba(239,106,91,0.28), transparent 60%),
          linear-gradient(145deg,#0D3D38 0%,#145A52 55%,#0A2E2A 100%);
        font-family:"Avenir Next","Segoe UI","Helvetica Neue",sans-serif;color:#fff}
      .icon{width:88px;height:88px;border-radius:22px;background:#1A6B62;display:grid;place-items:center;
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
      img{width:64px;height:64px}
      h1{margin:0;font-size:34px;letter-spacing:-0.02em}
      p{margin:8px 0 0;font-size:15px;color:#c5e6e0;max-width:250px;line-height:1.35}
    </style></head><body>
      <div class="icon"><img src="data:image/png;base64,${iconData}" alt="" /></div>
      <div><h1>Paw Pause</h1><p>Calm virtual companion for sites you approve</p></div>
    </body></html>`,
    { waitUntil: 'load' },
  );
  await page.screenshot({ path: outPath, type: 'png' });
  await page.close();
}

async function capturePopup(context, extensionId, browser, state) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto(`chrome-extension://${extensionId}/popup.html`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await seedStorage(page, state);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const status = document.getElementById('status-line');
    const grid = document.getElementById('dog-type-grid');
    return (
      status &&
      !/loading/i.test(status.textContent || '') &&
      grid &&
      grid.children.length >= 4
    );
  }, { timeout: 10_000 });
  await page.waitForTimeout(400);
  const rawPath = path.join(OUT_DIR, '.raw-popup.png');
  await page.screenshot({ path: rawPath, type: 'png' });
  await compositePopup(browser, fs.readFileSync(rawPath), path.join(OUT_DIR, 'screenshot-popup-1280x800.png'));
  fs.unlinkSync(rawPath);
  await page.close();
}

async function captureOnboarding(context, extensionId, browser) {
  const page = await context.newPage();
  await page.setViewportSize({ width: SCREEN_W, height: SCREEN_H });
  await page.goto(`chrome-extension://${extensionId}/onboarding.html`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await page.getByTestId('start').click();
  await page.waitForSelector('#step-2.panel.active', { timeout: 5_000 });
  await page.waitForSelector('#dog-type-grid button', { timeout: 5_000 });
  await page.waitForTimeout(500);
  const outPath = path.join(OUT_DIR, 'screenshot-onboarding-1280x800.png');
  await page.screenshot({ path: outPath, type: 'png' });
  await page.close();
  return outPath;
}

async function captureDogOnPage(context, extensionId, extensionPath, state) {
  const setup = await context.newPage();
  await setup.goto(`chrome-extension://${extensionId}/popup.html`, {
    waitUntil: 'domcontentloaded',
  });
  await seedStorage(setup, state);
  await setup.close();

  const demoHtml = fs.readFileSync(path.join(extensionPath, 'demo-article.html'), 'utf8');
  await context.route('https://example.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: demoHtml,
    });
  });

  const page = await context.newPage();
  await page.setViewportSize({ width: SCREEN_W, height: SCREEN_H });
  await page.goto(`${DEMO_ORIGIN}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForSelector('[data-testid="barkbreak-dog"]', { timeout: 20_000 });
  await page.waitForTimeout(2200);
  const dog = page.locator('[data-testid="barkbreak-dog"]');
  await dog.click({ force: true }).catch(() => undefined);
  await page.waitForTimeout(700);
  const outPath = path.join(OUT_DIR, 'screenshot-page-1280x800.png');
  await page.screenshot({ path: outPath, type: 'png' });
  await page.close();
  await context.unroute('https://example.com/**').catch(() => undefined);
  return outPath;
}

async function main() {
  ensureDir(OUT_DIR);
  const extensionPath = prepareCaptureExtension();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'barkbreak-profile-'));
  const browser = await chromium.launch({ channel: 'chromium', headless: true });
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
    viewport: { width: SCREEN_W, height: SCREEN_H },
  });

  const files = [];
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const extensionId = await resolveExtensionId(context, userDataDir, extensionPath);
    process.stdout.write(`Extension id: ${extensionId}\n`);
    const state = buildSeedState(Date.now());

    await captureDogOnPage(context, extensionId, extensionPath, state);
    files.push(path.join(OUT_DIR, 'screenshot-page-1280x800.png'));
    process.stdout.write('  captured page\n');

    await capturePopup(context, extensionId, browser, state);
    files.push(path.join(OUT_DIR, 'screenshot-popup-1280x800.png'));
    process.stdout.write('  captured popup\n');

    await captureOnboarding(context, extensionId, browser);
    files.push(path.join(OUT_DIR, 'screenshot-onboarding-1280x800.png'));
    process.stdout.write('  captured onboarding\n');

    const promoPath = path.join(OUT_DIR, 'promo-small-440x280.png');
    await generatePromo(browser, promoPath);
    files.push(promoPath);
    process.stdout.write('  captured promo\n');
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
    fs.rmSync(userDataDir, { recursive: true, force: true });
    fs.rmSync(extensionPath, { recursive: true, force: true });
  }

  process.stdout.write(`Done.\n${files.map((filePath) => ` - ${filePath}`).join('\n')}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});
