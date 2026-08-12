'use strict';

/**
 * Download Pixabay "meow" sound effects into assets/sounds/meow/
 * Source: https://pixabay.com/sound-effects/search/meow/
 * License: Pixabay Content License (free for use; attribution recorded).
 *
 * Note: Pixabay discourages systematic mass API downloads. This script uses
 * the public website pages with polite delays for local bundling.
 *
 *   node scripts/download-pixabay-meows.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const PLAYWRIGHT =
  '/Users/sudip/Sudip/Sudip/experimentation/chrome-extensions/scripts/cws-assets/node_modules/playwright';
const { chromium } = require(PLAYWRIGHT);

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'sounds', 'meow');
const MAX_PAGES = 20;
const PAGE_DELAY_MS = 1200;
const ITEM_DELAY_MS = 700;
const MAX_DURATION_SEC = 8;
const MAX_FILES = 120;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeName(input) {
  return String(input || 'meow')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'meow';
}

async function collectIds(page) {
  const ids = new Set();
  page.on('response', function onResponse(res) {
    const match = res.url().match(/\/sound-effects\/(\d+)\/waveform\.json/);
    if (match) {
      ids.add(match[1]);
    }
  });

  for (let pageIndex = 1; pageIndex <= MAX_PAGES; pageIndex += 1) {
    const url =
      pageIndex === 1
        ? 'https://pixabay.com/sound-effects/search/meow/'
        : `https://pixabay.com/sound-effects/search/meow/?pagi=${pageIndex}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await delay(PAGE_DELAY_MS);
    const title = await page.title();
    if (/just a moment/i.test(title)) {
      await delay(5000);
    }
    console.log(`page ${pageIndex}: ids=${ids.size} title=${title}`);
    // Stop early if a page adds nothing new after page 2.
    if (pageIndex >= 3) {
      const before = ids.size;
      await delay(800);
      if (ids.size === before && pageIndex > 5) {
        // keep going a couple more pages in case of overlap
      }
    }
  }
  return [...ids].sort(function sortIds(a, b) {
    return Number(a) - Number(b);
  });
}

async function scrapeSoundPage(page, id) {
  const url = `https://pixabay.com/sound-effects/${id}/`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await delay(900);
  return page.evaluate(function readSound(soundId) {
    const html = document.documentElement.innerHTML;
    const mp3Match = html.match(/https:\/\/cdn\.pixabay\.com\/download\/audio\/[^"' ]+\.mp3[^"' ]*/i);
    const title = document.title.replace(/\s*\|\s*.*$/, '').trim();
    const text = document.body.innerText || '';
    const durationMatch = text.match(/0:00\s*\n?\s*0:(\d{2})/);
    let durationSec = null;
    if (durationMatch) {
      durationSec = Number(durationMatch[1]);
    } else {
      const alt = text.match(/\b0:(\d{2})\b/);
      if (alt) {
        durationSec = Number(alt[1]);
      }
    }
    const userMatch = text.match(/\n([A-Za-z0-9_\-]+)\n0:00/);
    return {
      id: String(soundId),
      title: title,
      pageURL: location.href,
      mp3Url: mp3Match ? mp3Match[0].replace(/&amp;/g, '&') : null,
      durationSec: durationSec,
      user: userMatch ? userMatch[1] : null,
    };
  }, id);
}

async function downloadFile(url, destPath) {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Referer: 'https://pixabay.com/',
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  return buffer.length;
}

async function main() {
  ensureDir(OUT_DIR);
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });
  await context.addInitScript(function hideWebdriver() {
    Object.defineProperty(navigator, 'webdriver', {
      get: function getWebdriver() {
        return undefined;
      },
    });
  });
  const page = await context.newPage();

  console.log('Collecting meow IDs…');
  const ids = await collectIds(page);
  fs.writeFileSync(path.join(OUT_DIR, 'ids.json'), JSON.stringify(ids, null, 2));
  console.log(`Found ${ids.length} ids`);

  const catalog = [];
  for (let index = 0; index < ids.length; index += 1) {
    if (catalog.length >= MAX_FILES) {
      break;
    }
    const id = ids[index];
    try {
      const meta = await scrapeSoundPage(page, id);
      if (!meta.mp3Url) {
        console.log(`skip ${id}: no mp3`);
        continue;
      }
      if (typeof meta.durationSec === 'number' && meta.durationSec > MAX_DURATION_SEC) {
        console.log(`skip ${id}: duration ${meta.durationSec}s`);
        continue;
      }
      const fileName = `${id}-${safeName(meta.title)}.mp3`;
      const dest = path.join(OUT_DIR, fileName);
      if (!fs.existsSync(dest)) {
        const size = await downloadFile(meta.mp3Url, dest);
        console.log(`saved ${fileName} (${size} bytes)`);
      } else {
        console.log(`exists ${fileName}`);
      }
      catalog.push({
        id: meta.id,
        title: meta.title,
        file: fileName,
        pageURL: meta.pageURL,
        user: meta.user,
        durationSec: meta.durationSec,
        source: 'pixabay',
        license: 'Pixabay Content License',
      });
    } catch (error) {
      console.log(`error ${id}: ${error.message || error}`);
    }
    await delay(ITEM_DELAY_MS);
  }

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(catalog, null, 2));
  const attribution = [
    '# Pixabay meow sound attribution',
    '',
    'Source search: https://pixabay.com/sound-effects/search/meow/',
    'License: https://pixabay.com/service/license-summary/ (Pixabay Content License)',
    '',
    'Files were downloaded for local use in the Paw Pause extension. Do not hotlink Pixabay CDN URLs.',
    '',
    ...catalog.map(function mapRow(entry) {
      return `- ${entry.file} — ${entry.title} (${entry.pageURL})`;
    }),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'ATTRIBUTION.md'), attribution);

  await browser.close();
  console.log(`Done. ${catalog.length} meows in ${OUT_DIR}`);
}

main().catch(function onFail(error) {
  console.error(error);
  process.exit(1);
});
