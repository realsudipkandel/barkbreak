'use strict';

/**
 * Smoke-test Bark Break core flows (no interactive permission dialog).
 * Usage: node scripts/smoke-barkbreak.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../../scripts/cws-assets/node_modules/playwright');

const ROOT = path.resolve(__dirname, '../..');
const PROFILE = path.join(ROOT, '.chrome-barkbreak-smoke');
const EXT_PATH = path.join(ROOT, 'barkbreak');

async function loadUnpacked(browser, extensionPath) {
  const session = await browser.newBrowserCDPSession();
  const result = await session.send('Extensions.loadUnpacked', { path: extensionPath });
  return result.id;
}

async function main() {
  if (fs.existsSync(PROFILE)) {
    fs.rmSync(PROFILE, { recursive: true, force: true });
  }
  fs.mkdirSync(PROFILE, { recursive: true });

  const context = await chromium.launchPersistentContext(PROFILE, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1100, height: 800 },
    ignoreDefaultArgs: ['--disable-extensions'],
    args: ['--enable-unsafe-extension-debugging', '--no-first-run', '--no-default-browser-check'],
  });
  const browser = context.browser();
  const page = context.pages()[0] || (await context.newPage());
  await page.goto('chrome://extensions/');
  await page
    .evaluate(() => {
      const manager = document.querySelector('extensions-manager');
      const toolbar = manager && manager.shadowRoot && manager.shadowRoot.querySelector('extensions-toolbar');
      const toggle = toolbar && toolbar.shadowRoot && toolbar.shadowRoot.querySelector('#devMode');
      if (toggle && !toggle.checked) {
        toggle.click();
      }
    })
    .catch(function ignore() {
      return undefined;
    });

  const extId = await loadUnpacked(browser, fs.realpathSync(EXT_PATH));
  console.log('loaded', extId);

  const errors = [];
  page.on('pageerror', function onPageError(err) {
    errors.push(err.message);
  });

  await page.goto(`chrome-extension://${extId}/onboarding.html`);
  await page.getByTestId('meet-dog').click();
  await page.getByTestId('dog-name').fill('Scout');
  await page.getByTestId('to-promise').click();
  await page.getByTestId('sounds-kind').click();
  await page.getByTestId('to-rule').click();
  await page.getByTestId('to-rehearsal').click();

  // Complete without host permission dialog — still marks onboarding done.
  const complete = await page.evaluate(async () => {
    return chrome.runtime.sendMessage({
      type: 'COMPLETE_ONBOARDING',
      pet: { name: 'Scout', personality: 'goofy', coat: 'golden', ears: 'floppy' },
      settings: {
        mode: 'gate',
        defaultBreakMinutes: 1,
        defaultBudgetSeconds: 20,
        motion: 'full',
        sound: false,
      },
    });
  });
  console.log('complete', {
    ok: complete && complete.ok,
    name: complete && complete.state && complete.state.pet && complete.state.pet.name,
    onboarding: complete && complete.state && complete.state.settings && complete.state.settings.onboardingComplete,
  });

  // Seed a guarded site directly (permission dialog is manual in real use).
  const seeded = await page.evaluate(async () => {
    const stateResp = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    const state = stateResp.state;
    state.guardedSites['https://www.youtube.com'] = {
      dailyBudgetSeconds: 60,
      breakSeconds: 60,
      enabled: true,
    };
    await chrome.storage.local.set({ 'barkbreak.state': state });
    return Object.keys(state.guardedSites);
  });
  console.log('seededSites', seeded);

  await page.goto(`chrome-extension://${extId}/sidepanel.html`);
  await page.waitForTimeout(800);
  const status = await page.locator('#status-label').textContent();
  const biscuits = await page.getByTestId('biscuit-count').textContent();
  console.log('sidepanel', { status, biscuits });

  await page.getByTestId('care-water').click();
  await page.waitForTimeout(400);
  const afterCare = await page.locator('#care-message').textContent();
  console.log('afterWater', afterCare);

  const gateProbe = await page.evaluate(async () => {
    let last = null;
    for (let index = 0; index < 8; index += 1) {
      last = await chrome.runtime.sendMessage({
        type: 'ENGAGED_DELTA',
        hostname: 'www.youtube.com',
        deltaSeconds: 10,
      });
    }
    return {
      shouldGate: last && last.shouldGate,
      shouldWarn: last && last.shouldWarn,
      remaining: last && last.remainingSeconds,
      engaged:
        last &&
        last.state &&
        last.state.dailyAggregates &&
        last.state.dailyAggregates[Object.keys(last.state.dailyAggregates)[0]].domains['www.youtube.com'],
    };
  });
  console.log('gateProbe', gateProbe);

  const focusProbe = await page.evaluate(async () => {
    const started = await chrome.runtime.sendMessage({ type: 'START_FOCUS', minutes: 15 });
    const ended = await chrome.runtime.sendMessage({ type: 'END_FOCUS' });
    return {
      started: started && started.ok,
      ended: ended && ended.ok,
      status: started && started.status,
    };
  });
  console.log('focusProbe', focusProbe);
  console.log('pageErrors', errors);

  let failed = false;
  if (!complete || !complete.ok || complete.state.pet.name !== 'Scout') {
    console.error('FAIL: onboarding complete');
    failed = true;
  }
  if (!afterCare || afterCare.indexOf('Hydration') === -1) {
    console.error('FAIL: care action');
    failed = true;
  }
  if (!gateProbe.shouldGate) {
    console.error('FAIL: gate trigger');
    failed = true;
  }
  if (!focusProbe.started) {
    console.error('FAIL: focus start');
    failed = true;
  }

  await context.close();
  if (failed) {
    process.exitCode = 1;
  } else {
    console.log('SMOKE OK');
  }
}

main().catch(function onError(error) {
  console.error(error);
  process.exitCode = 1;
});
