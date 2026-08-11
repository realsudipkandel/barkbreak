'use strict';

const assert = require('assert');
const bb = require('../shared.js');

const now = Date.parse('2026-08-11T12:00:00');

function baseState() {
  const state = bb.createDefaultState(now);
  state.settings.onboardingComplete = true;
  state.settings.mode = bb.MODE_GATE;
  state.guardedSites['https://www.youtube.com'] = {
    dailyBudgetSeconds: 600,
    breakSeconds: 180,
    enabled: true,
  };
  return state;
}

// Durations & formatting
assert.strictEqual(bb.formatMs(180000), '03:00');
assert.strictEqual(bb.formatMs(0), '00:00');
assert.strictEqual(bb.formatMs(999), '00:01');
assert.strictEqual(bb.remainingMsFromEndsAt(now + 5000, now), 5000);
assert.strictEqual(bb.remainingMsFromEndsAt(now - 1000, now), 0);

// Dates & quiet hours
assert.strictEqual(bb.getLocalDateString(now), '2026-08-11');
assert.strictEqual(bb.parseHmToMinutes('22:00'), 22 * 60);
assert.strictEqual(bb.parseHmToMinutes('bad'), null);
assert.strictEqual(
  bb.isWithinQuietHours({ enabled: true, start: '22:00', end: '08:00' }, Date.parse('2026-08-11T23:00:00')),
  true,
);
assert.strictEqual(
  bb.isWithinQuietHours({ enabled: true, start: '22:00', end: '08:00' }, Date.parse('2026-08-11T12:00:00')),
  false,
);
assert.strictEqual(
  bb.isWithinQuietHours({ enabled: false, start: '22:00', end: '08:00' }, Date.parse('2026-08-11T23:00:00')),
  false,
);
assert.strictEqual(
  bb.isWithinQuietHours({ enabled: true, start: '09:00', end: '17:00' }, Date.parse('2026-08-11T12:00:00')),
  true,
);

// URL helpers
assert.strictEqual(bb.normalizeHostname('WWW.YouTube.COM.'), 'www.youtube.com');
assert.strictEqual(bb.originFromUrl('https://www.youtube.com/watch?v=1'), 'https://www.youtube.com');
assert.strictEqual(bb.originFromUrl('chrome://extensions'), null);
assert.strictEqual(bb.hostnameFromOrigin('https://www.reddit.com'), 'www.reddit.com');
assert.strictEqual(bb.originPermissionPattern('https://www.reddit.com'), 'https://www.reddit.com/*');
assert.strictEqual(bb.isRestrictedUrl('chrome://settings'), true);
assert.strictEqual(bb.isRestrictedUrl('https://chrome.google.com/webstore/detail/x'), true);
assert.strictEqual(bb.isRestrictedUrl('https://example.com'), false);

// Engaged flags
assert.strictEqual(
  bb.shouldCountEngaged({ visible: true, windowFocused: true, recentActivity: true }),
  true,
);
assert.strictEqual(
  bb.shouldCountEngaged({ visible: true, windowFocused: true, recentActivity: false }),
  false,
);
assert.strictEqual(bb.shouldCountEngaged(null), false);

// Validation
const validated = bb.validateState(
  {
    settings: { mode: 'nope', defaultBreakMinutes: 3 },
    pet: { name: '  Scout  ', coat: 'golden', bond: -5, inventory: { biscuits: 2, items: ['blue_ball'] } },
    guardedSites: { 'https://www.youtube.com': { dailyBudgetSeconds: 900, breakSeconds: 180 } },
  },
  now,
);
assert.strictEqual(validated.settings.mode, bb.MODE_GENTLE);
assert.strictEqual(validated.pet.name, 'Scout');
assert.strictEqual(validated.pet.bond, 0);
assert.ok(validated.guardedSites['https://www.youtube.com']);

assert.deepStrictEqual(bb.validateMood(null).hydration, 70);
assert.strictEqual(bb.validateSettings(null).defaultBreakMinutes, 3);

// Bond levels
assert.strictEqual(bb.getBondLevel(0).level, 1);
assert.strictEqual(bb.getBondLevel(20).name, 'Trusted Human');
assert.strictEqual(bb.getBondLevel(140).level, 5);

// Copy
assert.ok(bb.getCopy({ simpleCopy: true }, { personality: 'goofy' }).gate.includes('break'));
assert.ok(bb.COPY[bb.PERSONALITY_DRAMATIC].gate.includes('HALT'));
assert.ok(bb.pickAwayPrompt(now).length > 10);

// Duty / suppress
{
  let state = baseState();
  assert.strictEqual(bb.getDutyStatus(state, now), bb.STATUS_ON_DUTY);
  state.settings.quietHours = { enabled: true, start: '11:00', end: '13:00' };
  assert.strictEqual(bb.getDutyStatus(state, now), bb.STATUS_QUIET);
  assert.strictEqual(bb.shouldSuppressGates(state, now), true);
  state = bb.applyGlobalPause(state, 3600000, now);
  assert.strictEqual(bb.isGloballyPaused(state, now + 1000), true);
  assert.strictEqual(bb.getDutyStatus(state, now + 1000), bb.STATUS_PAUSED);
}

// Engaged delta → warn → gate
{
  let state = baseState();
  state.guardedSites['https://www.youtube.com'].dailyBudgetSeconds = 30;
  let result = bb.applyEngagedDelta(state, 'www.youtube.com', 15, now);
  state = result.state;
  assert.strictEqual(result.shouldWarn, true);
  assert.strictEqual(result.shouldGate, false);
  result = bb.applyEngagedDelta(state, 'www.youtube.com', 15, now);
  assert.strictEqual(result.shouldGate, true);
  assert.strictEqual(result.engagedSeconds, 30);
}

// Gentle mode warns but does not gate
{
  let state = baseState();
  state.settings.mode = bb.MODE_GENTLE;
  state.guardedSites['https://www.youtube.com'].dailyBudgetSeconds = 10;
  const result = bb.applyEngagedDelta(state, 'www.youtube.com', 10, now);
  assert.strictEqual(result.shouldWarn, true);
  assert.strictEqual(result.shouldGate, false);
}

// Quiet hours skip counting gates
{
  const state = baseState();
  state.settings.quietHours = { enabled: true, start: '11:00', end: '13:00' };
  const result = bb.applyEngagedDelta(state, 'www.youtube.com', 30, now);
  assert.strictEqual(result.shouldGate, false);
}

// Unguarded hostname ignored
{
  const state = baseState();
  const result = bb.applyEngagedDelta(state, 'example.com', 30, now);
  assert.strictEqual(result.remainingSeconds, null);
}

// Economy biscuits
assert.strictEqual(bb.biscuitsForBreak(1, { oneMinuteBreaksRewarded: 0 }), 1);
assert.strictEqual(bb.biscuitsForBreak(1, { oneMinuteBreaksRewarded: 3 }), 0);
assert.strictEqual(bb.biscuitsForBreak(3, {}), 2);
assert.strictEqual(bb.biscuitsForBreak(10, {}), 3);
assert.strictEqual(bb.biscuitsForFocus(25, 0.9), 2);
assert.strictEqual(bb.biscuitsForFocus(25, 0.5), 0);
assert.strictEqual(bb.biscuitsForFocus(45, 0.9), 3);

// Reward idempotency
{
  let state = baseState();
  const first = bb.grantReward(state, 'sess_1', 2, 1, now);
  assert.strictEqual(first.granted, true);
  assert.strictEqual(first.state.pet.inventory.biscuits, 2);
  assert.strictEqual(first.state.pet.bond, 1);
  const second = bb.grantReward(first.state, 'sess_1', 5, 5, now);
  assert.strictEqual(second.granted, false);
  assert.strictEqual(second.reason, 'duplicate');
  assert.strictEqual(second.state.pet.inventory.biscuits, 2);
  const missing = bb.grantReward(state, '', 1, 1, now);
  assert.strictEqual(missing.granted, false);
}

// Break session honest vs early
{
  let state = baseState();
  state = bb.startBreakSession(state, 3, 'https://www.youtube.com', now);
  assert.strictEqual(state.activeSession.type, bb.SESSION_BREAK);
  const early = bb.completeBreakSession(state, true, now + 1000);
  assert.strictEqual(early.reward.early, true);
  assert.strictEqual(early.reward.biscuits, 0);

  state = bb.startBreakSession(baseState(), 3, 'https://www.youtube.com', now);
  const honest = bb.completeBreakSession(state, false, now + 3 * 60 * 1000);
  assert.strictEqual(honest.reward.biscuits, 2);
  assert.strictEqual(honest.reward.bond, 1);
  assert.strictEqual(honest.state.activeSession, null);
}

// One-minute break farming cap
{
  let state = baseState();
  for (let index = 0; index < 4; index += 1) {
    state = bb.startBreakSession(state, 1, null, now + index * 100000);
    const result = bb.completeBreakSession(state, false, now + index * 100000 + 60000);
    state = result.state;
  }
  const dateKey = bb.getLocalDateString(now);
  assert.ok(state.dailyAggregates[dateKey].oneMinuteBreaksRewarded <= 3);
}

// Focus session
{
  let state = baseState();
  state = bb.startFocusSession(state, 25, now);
  state.activeSession.activeMs = 25 * 60 * 1000;
  const done = bb.completeFocusSession(state, now + 25 * 60 * 1000);
  assert.strictEqual(done.reward.biscuits, 2);
  assert.strictEqual(done.state.activeSession, null);
}

// Urgent pass intention friction
{
  let state = baseState();
  let result = bb.applyUrgentPass(state, 'https://www.youtube.com', now, null);
  assert.strictEqual(result.needsIntention, false);
  assert.strictEqual(result.state.activeSession.type, bb.SESSION_URGENT);
  result = bb.applyUrgentPass(result.state, 'https://www.youtube.com', now + 1000, 'Find a tutorial');
  assert.strictEqual(result.needsIntention, true);
  assert.strictEqual(
    result.state.dailyAggregates[bb.getLocalDateString(now)].urgentPasses,
    2,
  );
}

// Care actions & overfeed soft block
{
  let state = baseState();
  let result = bb.applyCareAction(state, bb.CARE_WATER, now);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.bondGain, 1);
  state = result.state;
  result = bb.applyCareAction(state, bb.CARE_WATER, now);
  assert.strictEqual(result.bondGain, 0);
  state.pet.mood.fullness = 95;
  result = bb.applyCareAction(state, bb.CARE_FEED, now);
  assert.strictEqual(result.ok, false);
  assert.ok(result.message.includes('tummy'));
  result = bb.applyCareAction(state, 'nope', now);
  assert.strictEqual(result.ok, false);
}

// Buy item
{
  let state = baseState();
  state.pet.bond = 25;
  state.pet.inventory.biscuits = 10;
  let result = bb.buyItem(state, bb.ITEM_RED_BANDANA, now);
  assert.strictEqual(result.ok, true);
  assert.ok(result.state.pet.inventory.items.includes(bb.ITEM_RED_BANDANA));
  result = bb.buyItem(result.state, bb.ITEM_RED_BANDANA, now);
  assert.strictEqual(result.ok, false);
  result = bb.buyItem(baseState(), 'missing', now);
  assert.strictEqual(result.ok, false);
  state = baseState();
  state.pet.bond = 0;
  state.pet.inventory.biscuits = 100;
  result = bb.buyItem(state, bb.ITEM_RED_BANDANA, now);
  assert.strictEqual(result.ok, false);
}

// Refresh check-in & scrapbook
{
  let state = baseState();
  state = bb.applyRefreshCheckin(state, 'more', now);
  assert.strictEqual(state.dailyAggregates[bb.getLocalDateString(now)].refreshCheckins.more, 1);
  state = bb.applyRefreshCheckin(state, 'invalid', now);
  const summary = bb.buildScrapbookSummary(state, now);
  assert.ok(summary.bondLevel.level >= 1);
  assert.ok(typeof summary.intentionalBreaks === 'number');
}

// Export / clear / reset
{
  let state = baseState();
  state = bb.grantReward(state, 'x', 3, 2, now).state;
  const exported = bb.buildExportPayload(state);
  assert.strictEqual(exported.schemaVersion, bb.SCHEMA_VERSION);
  assert.ok(exported.pet);
  assert.ok(!Object.prototype.hasOwnProperty.call(exported, 'rewardLedger'));
  state = bb.clearTodayProgress(state, now);
  assert.deepStrictEqual(
    state.dailyAggregates[bb.getLocalDateString(now)].domains,
    {},
  );
  state = bb.clearAllProgress(state, now);
  assert.deepStrictEqual(state.eventLog, []);
  state = bb.resetAllState(now);
  assert.strictEqual(state.settings.onboardingComplete, false);
  assert.strictEqual(state.pet.name, 'Biscuit');
}

// Resolve expired sessions
{
  let state = baseState();
  state = bb.startBreakSession(state, 1, null, now);
  state.activeSession.endsAt = now - 1;
  const resolved = bb.resolveExpiredSession(state, now);
  assert.strictEqual(resolved.completed.type, bb.SESSION_BREAK);
  assert.strictEqual(resolved.state.activeSession, null);

  state = bb.startFocusSession(baseState(), 15, now);
  state.activeSession.endsAt = now - 1;
  state.activeSession.activeMs = 15 * 60 * 1000;
  const focusResolved = bb.resolveExpiredSession(state, now);
  assert.strictEqual(focusResolved.completed.type, bb.SESSION_FOCUS);

  state = bb.applyUrgentPass(baseState(), null, now).state;
  state.activeSession.endsAt = now - 1;
  const urgentResolved = bb.resolveExpiredSession(state, now);
  assert.strictEqual(urgentResolved.completed.type, bb.SESSION_URGENT);
}

// Gate view model
{
  const state = baseState();
  const view = bb.buildGateViewModel(state, 'www.youtube.com', now);
  assert.strictEqual(view.dogName, 'Biscuit');
  assert.ok(view.message.length > 0);
  assert.strictEqual(view.breakMinutes, 3);
}

// findGuardedOriginForHostname
{
  const state = baseState();
  assert.strictEqual(
    bb.findGuardedOriginForHostname(state, 'www.youtube.com'),
    'https://www.youtube.com',
  );
  assert.strictEqual(bb.findGuardedOriginForHostname(state, 'nope.com'), null);
}

// createId uniqueness-ish
assert.notStrictEqual(bb.createId('a'), bb.createId('a'));

// Prune old aggregates
{
  const state = baseState();
  state.dailyAggregates['2020-01-01'] = bb.createDefaultDaily(Date.parse('2020-01-01'));
  const pruned = bb.pruneDailyAggregates(state.dailyAggregates, now);
  assert.strictEqual(pruned['2020-01-01'], undefined);
  assert.ok(pruned['2026-08-11']);
}

// Focus-only suppress outside focus
{
  const state = baseState();
  state.settings.mode = bb.MODE_FOCUS_ONLY;
  assert.strictEqual(bb.shouldSuppressGates(state, now), true);
  state.activeSession = { type: bb.SESSION_FOCUS, endsAt: now + 1000 };
  assert.strictEqual(bb.shouldSuppressGates(state, now), false);
}

// Care unlocks tricks at bond thresholds
{
  let state = baseState();
  state.pet.bond = 49;
  const result = bb.applyCareAction(state, bb.CARE_PLAY, now);
  assert.ok(result.state.pet.tricks.includes(bb.TRICK_SIT) || result.state.pet.bond >= 50);
}

// Extra edge branches for coverage
assert.strictEqual(bb.parseHmToMinutes('25:00'), null);
assert.strictEqual(bb.parseHmToMinutes('12:99'), null);
assert.strictEqual(
  bb.isWithinQuietHours({ enabled: true, start: 'xx:yy', end: '08:00' }, now),
  false,
);
assert.strictEqual(
  bb.isWithinQuietHours({ enabled: true, start: '12:00', end: '12:00' }, now),
  true,
);
assert.strictEqual(bb.normalizeHostname(null), '');
assert.strictEqual(bb.originFromUrl('not-a-url'), null);
assert.strictEqual(bb.hostnameFromOrigin('bad'), '');
assert.strictEqual(bb.originPermissionPattern('bad'), '');
assert.strictEqual(bb.isRestrictedUrl(''), true);
assert.strictEqual(bb.isRestrictedUrl(null), true);
assert.strictEqual(bb.remainingMsFromEndsAt('nope', now), 0);
assert.strictEqual(bb.remainingMsFromEndsAt(Number.NaN, now), 0);
assert.ok(bb.createDefaultState().schemaVersion === bb.SCHEMA_VERSION);
assert.strictEqual(bb.getPersonalityKey({}, { personality: 'alien' }), bb.PERSONALITY_GOOFY);
assert.strictEqual(bb.getPersonalityKey({}, null), bb.PERSONALITY_GOOFY);
assert.deepStrictEqual(bb.validateMood('x'), bb.createDefaultMood());
assert.strictEqual(bb.validatePet(null).name, 'Biscuit');
assert.strictEqual(bb.validatePet({ name: '' }).name, 'Biscuit');
assert.strictEqual(bb.validatePet({ coat: 'neon', ears: 'square', personality: 'x' }).coat, bb.COAT_GOLDEN);
assert.ok(bb.validatePet({ inventory: { biscuits: 1, items: ['nope'], favoriteToy: 'nope' } }).inventory.items.includes(bb.ITEM_BLUE_BALL));
assert.strictEqual(bb.validateGuardedSite(null).enabled, true);
assert.strictEqual(bb.validateState(null, now).schemaVersion, 1);
assert.strictEqual(bb.clampNumber('x', 0, 10, 5), 5);
assert.strictEqual(bb.clampInteger(3.9, 0, 10, 0), 3);

{
  let state = baseState();
  state.settings.mode = bb.MODE_FOCUS_ONLY;
  state.activeSession = { type: bb.SESSION_FOCUS, endsAt: now + 10000, activeMs: 0, sessionId: 'f1', minutes: 15, startedAt: now };
  let result = bb.applyEngagedDelta(state, 'www.youtube.com', 5, now);
  assert.strictEqual(result.shouldGate, true);

  state = baseState();
  state.activeSession = {
    type: bb.SESSION_URGENT,
    endsAt: now + 10000,
    sessionId: 'u1',
    startedAt: now,
  };
  result = bb.applyEngagedDelta(state, 'www.youtube.com', 5, now);
  assert.strictEqual(result.shouldGate, false);

  state = baseState();
  state.activeSession = {
    type: bb.SESSION_BREAK,
    endsAt: now + 10000,
    sessionId: 'b1',
    startedAt: now,
    minutes: 3,
  };
  result = bb.applyEngagedDelta(state, 'www.youtube.com', 5, now);
  assert.strictEqual(result.shouldGate, true);

  state = baseState();
  state.guardedSites['https://www.youtube.com'].enabled = false;
  result = bb.applyEngagedDelta(state, 'www.youtube.com', 5, now);
  assert.strictEqual(result.remainingSeconds, null);

  result = bb.applyEngagedDelta(baseState(), 'www.youtube.com', 0, now);
  assert.strictEqual(result.remainingSeconds, null);
}

{
  const incomplete = bb.completeBreakSession(baseState(), false, now);
  assert.strictEqual(incomplete.reward, null);
  const incompleteFocus = bb.completeFocusSession(baseState(), now);
  assert.strictEqual(incompleteFocus.reward, null);
}

{
  let state = baseState();
  state = bb.startBreakSession(state, 99, null, now);
  assert.strictEqual(state.activeSession.minutes, 3);
  state = bb.startFocusSession(baseState(), 2, now);
  assert.ok(state.activeSession.minutes >= 5);
}

{
  let state = baseState();
  state.pet.bond = 200;
  state.pet.inventory.biscuits = 0;
  const result = bb.buyItem(state, bb.ITEM_WIZARD_HAT, now);
  assert.strictEqual(result.ok, false);
  assert.ok(result.message.includes('biscuits'));
}

{
  let state = baseState();
  state.dailyAggregates[bb.getLocalDateString(now)].breaksCompleted = 5;
  assert.strictEqual(bb.canUnlockItem(state, bb.UNLOCKABLE_ITEMS.find((item) => item.id === bb.ITEM_ROPE)), true);
  state.pet.bond = 100;
  assert.strictEqual(bb.canUnlockItem(state, bb.UNLOCKABLE_ITEMS.find((item) => item.id === bb.ITEM_WINDOW_SEAT)), true);
}

{
  const view = bb.buildGateViewModel(baseState(), 'unknown.com', now);
  assert.ok(view.budgetSeconds > 0);
}

{
  const resolved = bb.resolveExpiredSession(baseState(), now);
  assert.strictEqual(resolved.completed, null);
  let state = baseState();
  state.activeSession = { type: 'other', endsAt: now - 1 };
  const other = bb.resolveExpiredSession(state, now);
  assert.strictEqual(other.state.activeSession, null);
}

{
  let state = baseState();
  state = bb.applyCareAction(state, bb.CARE_PET, now).state;
  state = bb.applyCareAction(state, bb.CARE_FEED, now).state;
  assert.ok(state.pet.mood.fullness > 65);
}

assert.strictEqual(bb.getDomainEngagedSeconds(baseState(), 'www.youtube.com', now), 0);
assert.strictEqual(bb.getMinutesOfDay(now) >= 0, true);

console.log('barkbreak shared.test.js: all assertions passed');
