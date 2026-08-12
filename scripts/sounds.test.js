'use strict';

const assert = require('assert');
const sounds = require('../sounds.js');

assert.strictEqual(sounds.SOUND_SPECIES_CAT, 'cat');
assert.strictEqual(sounds.SOUND_SPECIES_DOG, 'dog');
assert.strictEqual(sounds.normalizeSpecies('cat'), 'cat');
assert.strictEqual(sounds.normalizeSpecies('dog'), 'dog');
assert.strictEqual(sounds.normalizeSpecies('nope'), 'dog');
assert.strictEqual(sounds.normalizeSpecies(undefined), 'dog');
assert.ok(sounds.MASTER_GAIN >= 1);

// Without AudioContext (Node), these stay silent and must not throw.
assert.strictEqual(sounds.playFunSound('bark', true, 'dog'), false);
assert.strictEqual(sounds.playFunSound('bark', true, 'cat'), false);
assert.strictEqual(sounds.playFunSound('meow', true, 'cat'), false);
assert.strictEqual(sounds.playFunSound('pet', true, 'cat'), false);
assert.strictEqual(sounds.playFunSound('bark', false, 'cat'), false);

const meowSamples = require('../meow-samples.js');
assert.ok(meowSamples.MEOW_SAMPLE_FILES.length >= 100);
assert.ok(
  meowSamples.MEOW_SAMPLE_FILES.some(function hasMixkit(name) {
    return name.startsWith('mixkit-');
  }),
);
assert.strictEqual(
  meowSamples.meowSampleKindForFile('mixkit-big-wild-cat-long-purr-96.mp3'),
  'purr',
);
assert.strictEqual(
  meowSamples.meowSampleKindForFile('mixkit-domestic-cat-hungry-meow-45.mp3'),
  'ask',
);
assert.strictEqual(meowSamples.meowSampleKindForFile('6226-cat-meow.mp3'), 'meow');

console.log('barkbreak sounds.test.js: all assertions passed');
