'use strict';

const assert = require('assert');
const bb = require('../shared.js');
const ex = require('../excitement.js');

const now = Date.parse('2026-08-11T15:00:00');

assert.strictEqual(bb.normalizeDogName('  Scout  '), 'Scout');
assert.strictEqual(bb.normalizeDogName(''), 'Kabs');
assert.strictEqual(bb.getDogType(bb.DOG_BLACK).id, bb.DOG_BLACK);
assert.strictEqual(bb.getDogType('nope').id, bb.DOG_GOLDEN);
assert.strictEqual(bb.getDogType(bb.DOG_GINGER_CAT).id, bb.DOG_GINGER_CAT);
assert.strictEqual(bb.getDogType(bb.DOG_BLACK_CAT).id, bb.DOG_BLACK_CAT);
assert.strictEqual(bb.getDogType(bb.DOG_BW_CAT).id, bb.DOG_BW_CAT);
assert.strictEqual(bb.companionAssetFolder(bb.DOG_GINGER_CAT), bb.ASSET_FOLDER_CAT);
assert.strictEqual(bb.companionAssetFolder(bb.DOG_BLACK_CAT), bb.ASSET_FOLDER_CAT);
assert.strictEqual(bb.companionAssetFolder(bb.DOG_BW_CAT), bb.ASSET_FOLDER_CAT);
assert.strictEqual(bb.isCatCompanion(bb.DOG_BLACK_CAT), true);
assert.strictEqual(bb.isCatCompanion(bb.DOG_GOLDEN), false);
assert.strictEqual(bb.companionSoundSpecies(bb.DOG_BLACK_CAT), 'cat');
assert.strictEqual(bb.companionSoundSpecies(bb.DOG_BW_CAT), 'cat');
assert.strictEqual(bb.companionSoundSpecies(bb.DOG_GOLDEN), 'dog');
assert.strictEqual(bb.companionPreviewSrc(bb.DOG_GINGER_CAT), 'assets/cat/sit.png');
assert.ok(bb.getDogType(bb.DOG_BLACK_CAT).filter.includes('brightness'));
assert.ok(bb.getDogType(bb.DOG_BW_CAT).filter.includes('grayscale'));
assert.strictEqual(bb.dogHeightForSize(bb.SIZE_MEDIUM), 140);
assert.strictEqual(bb.dogHeightForSize(bb.SIZE_MEDIUM, bb.DOG_GOLDEN), 140);
assert.strictEqual(
  bb.dogHeightForSize(bb.SIZE_MEDIUM, bb.DOG_GINGER_CAT),
  Math.round(140 * bb.getDogType(bb.DOG_GINGER_CAT).heightScale),
);
assert.strictEqual(
  bb.dogHeightForSize(bb.SIZE_MEDIUM, bb.DOG_BLACK_CAT),
  Math.round(140 * bb.CAT_HEIGHT_SCALE),
);
assert.ok(bb.dogHeightForSize(bb.SIZE_LARGE, bb.DOG_GINGER_CAT) > bb.dogHeightForSize(bb.SIZE_LARGE, bb.DOG_GOLDEN));

const catSettings = bb.validateSettings({
  dogName: 'Marmalade',
  dogType: bb.DOG_GINGER_CAT,
  size: bb.SIZE_LARGE,
});
assert.strictEqual(catSettings.dogType, bb.DOG_GINGER_CAT);
assert.strictEqual(catSettings.size, bb.SIZE_LARGE);

const blackCatSettings = bb.validateSettings({
  dogName: 'Kabs',
  dogType: bb.DOG_BLACK_CAT,
});
assert.strictEqual(blackCatSettings.dogType, bb.DOG_BLACK_CAT);
assert.strictEqual(blackCatSettings.dogName, 'Kabs');

const bwCatSettings = bb.validateSettings({
  dogType: bb.DOG_BW_CAT,
});
assert.strictEqual(bwCatSettings.dogType, bb.DOG_BW_CAT);

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
assert.strictEqual(defaults.dogName, 'Kabs');
assert.strictEqual(defaults.dogType, bb.DOG_BLACK_CAT);
assert.strictEqual(defaults.sound, true);
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
assert.ok(ex.memoryLine(excitement, 'Kabs'));

assert.ok(ex.wakeReaction(ex.PERSONALITY_DRAMATIC).length > 0);
assert.ok(ex.funSpeech('food', now, 'Kabs').length > 0);

assert.strictEqual(ex.canWalkDiscover(0, now), true);
assert.strictEqual(ex.canWalkDiscover(now, now + 1000), false);
assert.strictEqual(ex.canWalkDiscover(now, now + ex.WALK_DISCOVERY_MIN_MS), true);
assert.ok(ex.nextWalkDiscoverDistance(42) >= 380);

const storyA = ex.buildWalkDiscoveryStory('Kabs', now, 'seed-a');
const storyB = ex.buildWalkDiscoveryStory('Kabs', now, 'seed-b');
assert.ok(storyA.story.includes('found') || storyA.story.includes('Found') || storyA.story.includes('Discovery'));
assert.ok(storyA.treat.length > 0);
assert.ok(storyA.place.length > 0);
const storySet = new Set();
for (let storyIndex = 0; storyIndex < 40; storyIndex += 1) {
  storySet.add(ex.buildWalkDiscoveryStory('Kabs', now + storyIndex * 1000, `u-${storyIndex}`).story);
}
assert.ok(storySet.size >= 30, `expected mostly unique stories, got ${storySet.size}`);
assert.notStrictEqual(storyA.story, storyB.story);

const migrated = bb.validateState({ schemaVersion: 3, settings: { dogName: 'Pip' } }, now);
assert.strictEqual(migrated.settings.dogName, 'Pip');
assert.ok(migrated.excitement);
assert.strictEqual(migrated.schemaVersion, 4);

assert.strictEqual(bb.walkFrameIndex(0, 4), 0);
assert.strictEqual(bb.walkFrameIndex(bb.WALK_STEP_PX, 4), 1);
assert.strictEqual(bb.walkFrameIndex(bb.WALK_STEP_PX * 4, 4), 0);
assert.strictEqual(bb.walkFrameIndex(-10, 4), 0);
assert.strictEqual(bb.walkFrameIndex(50, 0), 0);
assert.ok(Math.abs(bb.walkBobOffset(0, bb.WALK_STEP_PX, 3)) < 0.001);
assert.ok(bb.walkBobOffset(bb.WALK_STEP_PX, bb.WALK_STEP_PX, 3) !== 0);

const lean = bb.pointerLeanDegrees(280, 0, 7);
assert.strictEqual(lean.rotateY, 7);
assert.ok(Math.abs(lean.rotateX) < 0.001);
const leanUp = bb.pointerLeanDegrees(0, -220, 7);
assert.ok(leanUp.rotateX > 0);

const grounded = bb.contactShadowStyle(0, 200);
assert.ok(grounded.opacity > 0.3);
assert.strictEqual(grounded.scaleX, 1);
const lifted = bb.contactShadowStyle(200, 200);
assert.ok(lifted.opacity < grounded.opacity);
assert.ok(lifted.scaleX < grounded.scaleX);

assert.ok(bb.idleBreathScale(0) >= 1);
assert.ok(bb.idleBreathScale(bb.IDLE_BREATH_PERIOD_MS / 4) > 1);
assert.strictEqual(bb.facingTowardPointer(100, 20, 1), -1);
assert.strictEqual(bb.facingTowardPointer(100, 180, -1), 1);
assert.strictEqual(bb.facingTowardPointer(100, 110, 1), 1);

const bounds = bb.walkBoundsForViewport(800, 200, 8);
assert.strictEqual(bounds.minX, 8);
assert.strictEqual(bounds.maxX, 592);
const turnRight = bb.resolveWalkEdgeBounce(600, 1, bounds.minX, bounds.maxX);
assert.strictEqual(turnRight.x, 592);
assert.strictEqual(turnRight.facing, -1);
assert.strictEqual(turnRight.turned, true);
const turnLeft = bb.resolveWalkEdgeBounce(0, -1, bounds.minX, bounds.maxX);
assert.strictEqual(turnLeft.x, 8);
assert.strictEqual(turnLeft.facing, 1);
assert.strictEqual(turnLeft.turned, true);
const midWalk = bb.resolveWalkEdgeBounce(120, 1, bounds.minX, bounds.maxX);
assert.strictEqual(midWalk.x, 120);
assert.strictEqual(midWalk.facing, 1);
assert.strictEqual(midWalk.turned, false);
const stuckAtRight = bb.resolveWalkEdgeBounce(592, 1, bounds.minX, bounds.maxX);
assert.strictEqual(stuckAtRight.turned, true);
assert.strictEqual(stuckAtRight.facing, -1);

const softToss = bb.throwVelocityFromDrag(100, 40, 108, 44, 120);
assert.strictEqual(softToss.tooSoft, true);
const hardToss = bb.throwVelocityFromDrag(100, 40, 280, 160, 80);
assert.strictEqual(hardToss.tooSoft, false);
assert.ok(hardToss.vx > 0);
assert.ok(hardToss.vy > 0);
const capped = bb.clampThrowSpeed(100, 100, 2, 10);
assert.ok(Math.sqrt(capped.vx * capped.vx + capped.vy * capped.vy) <= 10.001);
const autoThrow = bb.defaultThrowVelocity(-1);
assert.ok(autoThrow.vx < 0);
assert.ok(autoThrow.vy > 0);

let ball = bb.createBallState(40, 80, 6, 4);
for (let step = 0; step < 120 && !ball.settled; step += 1) {
  ball = bb.stepBallPhysics(ball, 30, 800, bb.BALL_GROUND_Y_PX);
}
assert.strictEqual(ball.settled, true);
assert.strictEqual(ball.y, bb.BALL_GROUND_Y_PX);

const chase = bb.stepFetchChase(10, 200, 12);
assert.strictEqual(chase.facing, 1);
assert.strictEqual(chase.caught, false);
assert.strictEqual(chase.x, 22);
const caught = bb.stepFetchChase(190, 200, 12, 20);
assert.strictEqual(caught.caught, true);
const returned = bb.stepFetchReturn(80, 40, 10, 15);
assert.strictEqual(returned.facing, -1);
assert.strictEqual(returned.x, 70);

assert.strictEqual(bb.FETCH_PHASE_AIM, 'aim');
assert.strictEqual(bb.FETCH_PHASE_CHASE, 'chase');

assert.strictEqual(
  bb.isExtensionContextInvalidationError(new Error('Extension context invalidated.')),
  true,
);
assert.strictEqual(bb.isExtensionContextInvalidationError('Extension context invalidated'), true);
assert.strictEqual(bb.isExtensionContextInvalidationError(new Error('network failed')), false);
assert.strictEqual(bb.isExtensionContextInvalidationError(null), false);

console.log('barkbreak shared.test.js: all assertions passed');
