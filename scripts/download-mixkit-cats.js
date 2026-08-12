'use strict';

/**
 * Download Mixkit free cat SFX into assets/sounds/meow/ and refresh meow-samples.js.
 *
 * Source: https://mixkit.co/free-sound-effects/cat/
 * License: https://mixkit.co/license/#sfxFree
 *
 *   node scripts/download-mixkit-cats.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'sounds', 'meow');

const MIXKIT_CAT_SOUNDS = Object.freeze([
  { id: 93, slug: 'sweet-kitty-meow', title: 'Sweet kitty meow', kind: 'meow' },
  {
    id: 92,
    slug: 'cartoon-kitty-begging-meow',
    title: 'Cartoon kitty begging meow',
    kind: 'ask',
  },
  {
    id: 91,
    slug: 'cartoon-little-cat-meow',
    title: 'Cartoon little cat meow',
    kind: 'meow',
  },
  {
    id: 96,
    slug: 'big-wild-cat-long-purr',
    title: 'Big wild cat long purr',
    kind: 'purr',
  },
  {
    id: 45,
    slug: 'domestic-cat-hungry-meow',
    title: 'Domestic cat hungry meow',
    kind: 'ask',
  },
  {
    id: 86,
    slug: 'little-cat-attention-meow',
    title: 'Little cat attention meow',
    kind: 'meow',
  },
  {
    id: 94,
    slug: 'angry-cartoon-kitty-meow',
    title: 'Angry cartoon kitty meow',
    kind: 'meow',
  },
]);

function wavUrl(soundId) {
  return `https://assets.mixkit.co/active_storage/sfx/${soundId}/${soundId}.wav`;
}

async function downloadBuffer(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'PawPauseMixkitDownloader/1.0' },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function convertWavToMp3(wavPath, mp3Path) {
  const result = spawnSync(
    'ffmpeg',
    ['-y', '-i', wavPath, '-codec:a', 'libmp3lame', '-q:a', '4', mp3Path],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || 'ffmpeg failed');
  }
}

function rebuildMeowSamples(kindByFile) {
  const files = fs
    .readdirSync(OUT_DIR)
    .filter(function isMp3(name) {
      return name.endsWith('.mp3');
    })
    .sort();
  const mixkit = files.filter(function isMixkit(name) {
    return name.startsWith('mixkit-');
  });
  const others = files.filter(function notMixkit(name) {
    return !name.startsWith('mixkit-');
  });
  const ordered = mixkit.concat(others);
  const lines = [
    "'use strict';",
    '',
    '/** Pixabay + Mixkit cat vocal sample list. */',
    'const MEOW_SAMPLE_FILES = Object.freeze([',
  ];
  ordered.forEach(function pushFile(fileName) {
    lines.push(`  '${fileName}',`);
  });
  lines.push(']);', '', 'const MEOW_SAMPLE_KIND_BY_FILE = Object.freeze({');
  mixkit.forEach(function pushKind(fileName) {
    lines.push(`  '${fileName}': '${kindByFile[fileName] || 'meow'}',`);
  });
  lines.push(
    '});',
    '',
    "const MEOW_SAMPLE_KIND_MEOW = 'meow';",
    "const MEOW_SAMPLE_KIND_ASK = 'ask';",
    "const MEOW_SAMPLE_KIND_PURR = 'purr';",
    '',
    'function meowSampleKindForFile(fileName) {',
    '  if (MEOW_SAMPLE_KIND_BY_FILE[fileName]) {',
    '    return MEOW_SAMPLE_KIND_BY_FILE[fileName];',
    '  }',
    '  return MEOW_SAMPLE_KIND_MEOW;',
    '}',
    '',
    "if (typeof module !== 'undefined' && module.exports) {",
    '  module.exports = {',
    '    MEOW_SAMPLE_FILES,',
    '    MEOW_SAMPLE_KIND_BY_FILE,',
    '    MEOW_SAMPLE_KIND_MEOW,',
    '    MEOW_SAMPLE_KIND_ASK,',
    '    MEOW_SAMPLE_KIND_PURR,',
    '    meowSampleKindForFile,',
    '  };',
    '}',
    '',
    "if (typeof globalThis !== 'undefined') {",
    '  globalThis.MEOW_SAMPLE_FILES = MEOW_SAMPLE_FILES;',
    '  globalThis.MEOW_SAMPLE_KIND_BY_FILE = MEOW_SAMPLE_KIND_BY_FILE;',
    '  globalThis.MEOW_SAMPLE_KIND_MEOW = MEOW_SAMPLE_KIND_MEOW;',
    '  globalThis.MEOW_SAMPLE_KIND_ASK = MEOW_SAMPLE_KIND_ASK;',
    '  globalThis.MEOW_SAMPLE_KIND_PURR = MEOW_SAMPLE_KIND_PURR;',
    '  globalThis.meowSampleKindForFile = meowSampleKindForFile;',
    '}',
    '',
  );
  fs.writeFileSync(path.join(ROOT, 'meow-samples.js'), lines.join('\n'));
  return ordered.length;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = [];
  const attribution = [
    '# Mixkit cat sound attribution',
    '',
    'Source: https://mixkit.co/free-sound-effects/cat/',
    'License: https://mixkit.co/license/#sfxFree (Mixkit Free Sound Effects License)',
    '',
    'Downloaded for local use in Paw Pause. Do not hotlink Mixkit CDN URLs.',
    '',
  ];
  const kindByFile = {};

  for (const sound of MIXKIT_CAT_SOUNDS) {
    const fileName = `mixkit-${sound.slug}-${sound.id}.mp3`;
    const wavPath = path.join(OUT_DIR, `mixkit-${sound.slug}-${sound.id}.wav`);
    const mp3Path = path.join(OUT_DIR, fileName);
    const bytes = await downloadBuffer(wavUrl(sound.id));
    fs.writeFileSync(wavPath, bytes);
    convertWavToMp3(wavPath, mp3Path);
    fs.unlinkSync(wavPath);
    kindByFile[fileName] = sound.kind;
    const page = `https://mixkit.co/free-sound-effects/download/${sound.id}/`;
    attribution.push(`- ${fileName} — ${sound.title} (${page}) [${sound.kind}]`);
    manifest.push({
      id: sound.id,
      file: fileName,
      title: sound.title,
      kind: sound.kind,
      source: page,
      license: 'https://mixkit.co/license/#sfxFree',
    });
    process.stdout.write(`downloaded ${fileName}\n`);
  }

  fs.writeFileSync(path.join(OUT_DIR, 'MIXKIT_ATTRIBUTION.md'), `${attribution.join('\n')}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'mixkit-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const total = rebuildMeowSamples(kindByFile);
  process.stdout.write(`meow-samples.js refreshed (${total} files)\n`);
}

main().catch(function onFail(error) {
  console.error(error);
  process.exitCode = 1;
});
