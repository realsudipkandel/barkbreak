'use strict';

/**
 * Browser probe: unlock AudioContext, load Pixabay meows, play cat/dog vocals.
 *
 *   node scripts/audio-probe.test.js
 */

const assert = require('assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MEOW_DIR = path.join(ROOT, 'assets', 'sounds', 'meow');
const PLAYWRIGHT =
  '/Users/sudip/Sudip/Sudip/experimentation/chrome-extensions/scripts/cws-assets/node_modules/playwright';

async function main() {
  const { chromium } = require(PLAYWRIGHT);
  const soundsSource = fs.readFileSync(path.join(ROOT, 'sounds.js'), 'utf8');
  const meowSource = fs.readFileSync(path.join(ROOT, 'meow-samples.js'), 'utf8');
  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();

  await page.route('**/probe-assets/assets/sounds/meow/**', async function onRoute(route) {
    const url = route.request().url();
    const fileName = decodeURIComponent(url.split('/meow/')[1] || '');
    const filePath = path.join(MEOW_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      await route.fulfill({ status: 404, body: 'missing' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'audio/mpeg',
      body: fs.readFileSync(filePath),
    });
  });

  await page.setContent('<!doctype html><html><body><button id="go" type="button">Go</button></body></html>');
  await page.addScriptTag({
    content: `
      window.chrome = {
        runtime: {
          getURL: function getURL(rel) { return 'https://probe-assets/' + rel; }
        }
      };
    `,
  });
  await page.addScriptTag({ content: meowSource });
  await page.addScriptTag({ content: soundsSource });

  const result = await page.evaluate(async function probe() {
    const button = document.getElementById('go');
    const report = {
      unlockOk: false,
      ready: false,
      sampleCount: 0,
      liveCat: false,
      liveDog: false,
      offlineCatPeak: 0,
      offlineDogPeak: 0,
      offlineCatOk: false,
      offlineDogOk: false,
      error: null,
    };

    try {
      await new Promise(function waitClick(resolve) {
        button.addEventListener(
          'click',
          function onClick() {
            resolve();
          },
          { once: true },
        );
        button.click();
      });

      report.unlockOk = await unlockFunAudio();
      report.ready = isAudioReady();
      const samples = await loadMeowSampleBuffers();
      report.sampleCount = samples.length;
      report.liveCat = playFunSound('bark', true, 'cat') === true;
      await new Promise(function wait(resolve) {
        setTimeout(resolve, 200);
      });
      report.liveDog = playFunSound('bark', true, 'dog') === true;

      const catRender = await renderFunSoundOffline('bark', 'dog', 0.8);
      const dogRender = await renderFunSoundOffline('bark', 'dog', 0.8);
      report.offlineCatPeak = catRender.peak;
      report.offlineDogPeak = dogRender.peak;
      report.offlineCatOk = catRender.ok;
      report.offlineDogOk = dogRender.ok;
    } catch (error) {
      report.error = String(error && error.message ? error.message : error);
    }
    return report;
  });

  await browser.close();

  assert.strictEqual(result.error, null, `${result.error} (${JSON.stringify(result)})`);
  assert.strictEqual(result.unlockOk, true, 'unlockFunAudio should succeed after gesture');
  assert.strictEqual(result.ready, true, 'audio should be ready after unlock');
  assert.ok(result.sampleCount >= 20, `expected many meow samples, got ${result.sampleCount}`);
  assert.strictEqual(result.liveCat, true, 'live cat playback should report success');
  assert.strictEqual(result.liveDog, true, 'live dog playback should report success');
  assert.ok(result.offlineDogOk, `dog offline render too quiet: ${result.offlineDogPeak}`);

  console.log('barkbreak audio-probe.test.js: all assertions passed');
  console.log(JSON.stringify(result));
}

main().catch(function onFail(error) {
  console.error(error);
  process.exit(1);
});
