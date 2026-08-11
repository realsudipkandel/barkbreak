'use strict';

const assert = require('assert');
const bb = require('../shared.js');
const ex = require('../excitement.js');

const now = Date.parse('2026-08-11T15:00:00');

assert.strictEqual(bb.normalizeDogName('  Scout  '), 'Scout');
assert.strictEqual(bb.normalizeDogName(''), 'Biscuit');
assert.strictEqual(bb.getDogType(bb.DOG_BLACK).id, bb.DOG_BLACK);
assert.strictEqual(bb.getDogType('nope').id, bb.DOG_GOLDEN);

const settings = bb.validateSettings({
  dogName: 'Maple',
  dogType: 'chocolate',
  personality: 'dramatic',
  popupMinutes: 15,
  appearDelaySeconds: 5,
  sound: true,
});
assert.strictEqual(settings.dogName, 'Maple');
assert.strictEqual(settings.dogType, bb.DOG_CHOCOLATE);
assert.strictEqual(settings.personality, 'dramatic');
assert.strictEqual(settings.popupMinutes, 15);
assert.strictEqual(settings.appearDelaySeconds, 5);
assert.strictEqual(bb.popupGapMs(settings), 15 * 60 * 1000);

assert.ok(bb.pickSpeech('full', now + 60000, 'Maple').includes('Maple'));
assert.strictEqual(bb.withDogName('{name} is saving room for later.', 'Maple'), 'Maple is saving room for later.');
assert.ok(bb.pickSpeech('food', now).length > 0);
assert.ok(bb.SPEECH.break.some(function hasWalkies(line) {
  return line.includes('Walkies');
}));

let state = bb.createDefaultState(now);
assert.ok(state.excitement);
assert.strictEqual(state.schemaVersion, 4);
assert.strictEqual(state.settings.personality, 'goofy');
state.settings.popupMinutes = 10;
state.settings.attentionFrequency = bb.FREQ_DEFAULT;
assert.strictEqual(bb.canOfferAttention(state, now), true);
state = bb.recordRequest(state, now);
assert.strictEqual(bb.canOfferAttention(state, now + 1000), false);
assert.strictEqual(bb.canOfferAttention(state, now + 10 * 60 * 1000), true);

state = bb.createDefaultState(now);
state.settings.popupMinutes = 15;
state = bb.addEngagedMs(state, 15 * 60 * 1000, now);
assert.strictEqual(bb.canOfferBreak(state, now), true);

const defaults = bb.createDefaultSettings();
assert.strictEqual(defaults.dogName, 'Biscuit');
assert.strictEqual(defaults.popupMinutes, 30);
assert.strictEqual(defaults.appearDelaySeconds, 5);

let excitement = ex.createDefaultExcitement(now);
assert.strictEqual(excitement.finds.length, 0);
assert.strictEqual(ex.collectionProgress(excitement).total, ex.FINDABLES.length);

excitement = ex.pushRecentAction(excitement, ex.ACTION_FETCH);
excitement = ex.pushRecentAction(excitement, ex.ACTION_WATER);
let combo = ex.matchCombo(excitement);
assert.ok(combo);
assert.strictEqual(combo.id, 'fetch_water');

excitement = ex.createDefaultExcitement(now);
excitement = ex.pushRecentAction(excitement, ex.ACTION_FEED);
excitement = ex.pushRecentAction(excitement, ex.ACTION_BELLY);
combo = ex.matchCombo(excitement);
assert.strictEqual(combo.id, 'feed_belly');

excitement = ex.createDefaultExcitement(now);
excitement = ex.pushRecentAction(excitement, ex.ACTION_PET);
excitement = ex.pushRecentAction(excitement, ex.ACTION_BOOP);
combo = ex.matchCombo(excitement);
assert.strictEqual(combo.id, 'pet_boop');

excitement = ex.createDefaultExcitement(now);
excitement = ex.pushRecentAction(excitement, ex.ACTION_FETCH);
excitement = ex.pushRecentAction(excitement, ex.ACTION_FETCH);
excitement = ex.pushRecentAction(excitement, ex.ACTION_FETCH);
combo = ex.matchCombo(excitement);
assert.strictEqual(combo.id, 'triple_fetch');

const added = ex.addFind(excitement, 'sock');
assert.strictEqual(added.added, true);
assert.strictEqual(added.excitement.finds.indexOf('sock') !== -1, true);
assert.strictEqual(ex.addFind(added.excitement, 'sock').added, false);

assert.strictEqual(ex.canBark(excitement, now), true);
const barked = ex.markBark(excitement, now);
assert.strictEqual(ex.canBark(barked, now + 60 * 1000), false);
assert.strictEqual(ex.canBark(barked, now + 16 * 60 * 1000), true);

const calmExcitement = ex.createDefaultExcitement(now);
assert.strictEqual(
  ex.deriveMood(Object.assign({}, calmExcitement, { ignoredFoodRequest: true }), 12),
  ex.MOOD_SNACK,
);
assert.strictEqual(ex.deriveMood(calmExcitement, 23), ex.MOOD_RELAXED);

excitement = ex.rememberAction(ex.createDefaultExcitement(now), ex.ACTION_FEED, 'carrot');
excitement = ex.rememberAction(excitement, ex.ACTION_FEED, 'carrot');
assert.strictEqual(excitement.memory.favouriteFood, 'carrot');
assert.ok(ex.memoryLine(excitement, 'Biscuit'));

assert.ok(ex.wakeReaction(ex.PERSONALITY_DRAMATIC).length > 0);
assert.ok(ex.funSpeech('food', now, 'Biscuit').length > 0);

const migrated = bb.validateState({ schemaVersion: 3, settings: { dogName: 'Pip' } }, now);
assert.strictEqual(migrated.settings.dogName, 'Pip');
assert.ok(migrated.excitement);
assert.strictEqual(migrated.schemaVersion, 4);

console.log('barkbreak shared.test.js: all assertions passed');
