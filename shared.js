'use strict';

const SCHEMA_VERSION = 1;
const STORAGE_KEY_STATE = 'barkbreak.state';
const CONTENT_SCRIPT_ID = 'barkbreak.meter';
const ALARM_BREAK = 'barkbreak.break';
const ALARM_FOCUS = 'barkbreak.focus';
const ALARM_URGENT = 'barkbreak.urgent';

const MODE_GENTLE = 'gentle';
const MODE_GATE = 'gate';
const MODE_FOCUS_ONLY = 'focus_only';

const MOTION_FULL = 'full';
const MOTION_REDUCED = 'reduced';
const MOTION_STATIC = 'static';

const PERSONALITY_GOOFY = 'goofy';
const PERSONALITY_GENTLE = 'gentle';
const PERSONALITY_DRAMATIC = 'dramatic';
const PERSONALITY_DETECTIVE = 'detective';
const PERSONALITY_SIMPLE = 'simple';

const COAT_GOLDEN = 'golden';
const COAT_BLACK_TAN = 'black_tan';
const COAT_WHITE_BROWN = 'white_brown';
const COAT_GREY = 'grey';
const COAT_HIGH_CONTRAST = 'high_contrast';

const EARS_FLOPPY = 'floppy';
const EARS_POINTY = 'pointy';
const EARS_MIXED = 'mixed';

const SESSION_NONE = 'none';
const SESSION_BREAK = 'break';
const SESSION_FOCUS = 'focus';
const SESSION_URGENT = 'urgent';
const SESSION_PAUSE = 'pause';

const STATUS_ON_DUTY = 'on_duty';
const STATUS_ON_BREAK = 'on_break';
const STATUS_QUIET = 'quiet_hours';
const STATUS_OFF_DUTY = 'off_duty';
const STATUS_FOCUS = 'focus_fetch';
const STATUS_PAUSED = 'paused';

const CARE_PET = 'pet';
const CARE_WATER = 'water';
const CARE_FEED = 'feed';
const CARE_PLAY = 'play';

const ITEM_BLUE_BALL = 'blue_ball';
const ITEM_RED_BANDANA = 'red_bandana';
const ITEM_ROPE = 'rope';
const ITEM_SECURITY_VEST = 'security_vest';
const ITEM_READING_GLASSES = 'reading_glasses';
const ITEM_RUG = 'rug';
const ITEM_PLANT = 'plant';
const ITEM_SQUEAKY_MOON = 'squeaky_moon';
const ITEM_WIZARD_HAT = 'wizard_hat';
const ITEM_WINDOW_SEAT = 'window_seat';

const TRICK_SIT = 'sit';
const TRICK_PAW = 'paw';
const TRICK_GUARD = 'guard';
const TRICK_SPIN = 'spin';
const TRICK_DROP_TAB = 'drop_tab';

const BREAK_MINUTES = Object.freeze([1, 3, 5, 10]);
const FOCUS_MINUTES = Object.freeze([15, 25, 45]);
const URGENT_PASS_SECONDS = 300;
const WARNING_SECONDS = 120;
const ACTIVITY_WINDOW_MS = 60000;
const DELTA_INTERVAL_MS = 15000;
const CARE_PHASE_MAX_MS = 25000;
const FOCUS_MIN_ACTIVE_RATIO = 0.8;
const HISTORY_DAYS = 30;
const MAX_EVENT_LOG = 40;

const BOND_LEVELS = Object.freeze([
  { level: 1, name: 'New Neighbour', minBond: 0 },
  { level: 2, name: 'Trusted Human', minBond: 20 },
  { level: 3, name: 'Gate Team', minBond: 50 },
  { level: 4, name: 'Best Mates', minBond: 90 },
  { level: 5, name: 'Legendary Walkies', minBond: 140 },
]);

const UNLOCKABLE_ITEMS = Object.freeze([
  { id: ITEM_BLUE_BALL, name: 'Blue ball', cost: 0, unlock: 'start', category: 'toy' },
  { id: ITEM_RED_BANDANA, name: 'Red bandana', cost: 4, unlock: 'bond2', category: 'outfit' },
  { id: ITEM_ROPE, name: 'Rope toy', cost: 3, unlock: 'breaks2', category: 'toy' },
  { id: ITEM_SECURITY_VEST, name: 'Security vest', cost: 5, unlock: 'focus1', category: 'outfit' },
  { id: ITEM_READING_GLASSES, name: 'Reading glasses', cost: 6, unlock: 'bond3', category: 'outfit' },
  { id: ITEM_RUG, name: 'Kennel rug', cost: 4, unlock: 'bond3', category: 'room' },
  { id: ITEM_PLANT, name: 'Window plant', cost: 5, unlock: 'bond3', category: 'room' },
  { id: ITEM_SQUEAKY_MOON, name: 'Squeaky moon', cost: 7, unlock: 'bond4', category: 'toy' },
  { id: ITEM_WIZARD_HAT, name: 'Wizard hat', cost: 8, unlock: 'bond4', category: 'outfit' },
  { id: ITEM_WINDOW_SEAT, name: 'Window seat', cost: 10, unlock: 'bond4', category: 'room' },
]);

const TRICKS = Object.freeze([
  { id: TRICK_SIT, name: 'Sit', minBondLevel: 1 },
  { id: TRICK_PAW, name: 'Paw', minBondLevel: 2 },
  { id: TRICK_GUARD, name: 'Guard', minBondLevel: 3 },
  { id: TRICK_SPIN, name: 'Spin', minBondLevel: 3 },
  { id: TRICK_DROP_TAB, name: 'Drop the tab', minBondLevel: 5 },
]);

const FOOD_DISCLAIMER = 'Bark Break is a game, not feeding advice.';

const COPY = Object.freeze({
  [PERSONALITY_GOOFY]: {
    gate: 'This scroll has exceeded the legal number of scrolls.',
    breakLine: 'I will interrogate the ball.',
    returnLine: 'The ball knows nothing.',
    warning: 'Tiny woof: two minutes left here.',
  },
  [PERSONALITY_GENTLE]: {
    gate: "You've been here a while. Want a small pause together?",
    breakLine: "I'll keep things safe.",
    returnLine: 'Nice to have you back.',
    warning: 'Two minutes left. A soft pause is waiting.',
  },
  [PERSONALITY_DRAMATIC]: {
    gate: 'HALT. The kingdom has seen enough thumbnails.',
    breakLine: 'I begin my noble watch.',
    returnLine: 'At last! The tabs sing again.',
    warning: 'Biscuit has begun warming up the gate.',
  },
  [PERSONALITY_DETECTIVE]: {
    gate: 'Clue found: twelve minutes vanished.',
    breakLine: "I'll guard the evidence.",
    returnLine: 'Case paused. Human refreshed?',
    warning: 'Two minutes remain on this case.',
  },
  [PERSONALITY_SIMPLE]: {
    gate: 'Time for a short break.',
    breakLine: 'I will wait here.',
    returnLine: 'Welcome back.',
    warning: 'Two minutes left.',
  },
});

const AWAY_PROMPTS = Object.freeze([
  'Look at something far away while I inspect this suspicious tennis ball.',
  'Stand up if that feels good. I will hold the internet.',
  'Refill your own water; mine appears to be under control.',
  'Drop your shoulders and take three unhurried breaths.',
  'Do absolutely nothing for one minute. Expert-level break.',
]);

const URGENT_PRESETS = Object.freeze([
  'Reply to someone',
  'Find a tutorial',
  'Finish a purchase',
  'Just choosing to browse',
]);

const MESSAGE = Object.freeze({
  GET_STATE: 'GET_STATE',
  COMPLETE_ONBOARDING: 'COMPLETE_ONBOARDING',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  UPDATE_PET: 'UPDATE_PET',
  GUARD_SITE: 'GUARD_SITE',
  UNGUARD_SITE: 'UNGUARD_SITE',
  ENGAGED_DELTA: 'ENGAGED_DELTA',
  START_BREAK: 'START_BREAK',
  END_BREAK: 'END_BREAK',
  START_FOCUS: 'START_FOCUS',
  END_FOCUS: 'END_FOCUS',
  URGENT_PASS: 'URGENT_PASS',
  GLOBAL_PAUSE: 'GLOBAL_PAUSE',
  CLEAR_PAUSE: 'CLEAR_PAUSE',
  CARE_ACTION: 'CARE_ACTION',
  BUY_ITEM: 'BUY_ITEM',
  REFRESH_CHECKIN: 'REFRESH_CHECKIN',
  CLEAR_TODAY: 'CLEAR_TODAY',
  CLEAR_PROGRESS: 'CLEAR_PROGRESS',
  RESET_ALL: 'RESET_ALL',
  EXPORT_STATE: 'EXPORT_STATE',
  OPEN_BREAK_PAGE: 'OPEN_BREAK_PAGE',
  CLOSE_TAB: 'CLOSE_TAB',
  GATE_STATUS: 'GATE_STATUS',
});

function clampNumber(value, min, max, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function clampInteger(value, min, max, fallback) {
  return Math.floor(clampNumber(value, min, max, fallback));
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

function getLocalDateString(nowMs) {
  const date = new Date(nowMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseHmToMinutes(hm) {
  if (typeof hm !== 'string' || !/^\d{2}:\d{2}$/.test(hm)) {
    return null;
  }
  const parts = hm.split(':');
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

function getMinutesOfDay(nowMs) {
  const date = new Date(nowMs);
  return date.getHours() * 60 + date.getMinutes();
}

function isWithinQuietHours(quietHours, nowMs) {
  if (!quietHours || quietHours.enabled !== true) {
    return false;
  }
  const start = parseHmToMinutes(quietHours.start);
  const end = parseHmToMinutes(quietHours.end);
  if (start === null || end === null) {
    return false;
  }
  const current = getMinutesOfDay(nowMs);
  if (start === end) {
    return true;
  }
  if (start < end) {
    return current >= start && current < end;
  }
  return current >= start || current < end;
}

function normalizeHostname(hostname) {
  if (typeof hostname !== 'string') {
    return '';
  }
  return hostname.trim().toLowerCase().replace(/^\.+/, '').replace(/\.+$/, '');
}

function originFromUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch (_error) {
    return null;
  }
}

function hostnameFromOrigin(origin) {
  try {
    return normalizeHostname(new URL(origin).hostname);
  } catch (_error) {
    return '';
  }
}

function originPermissionPattern(origin) {
  try {
    const parsed = new URL(origin);
    return `${parsed.protocol}//${parsed.host}/*`;
  } catch (_error) {
    return '';
  }
}

function isRestrictedUrl(urlString) {
  if (typeof urlString !== 'string' || urlString.length === 0) {
    return true;
  }
  const lower = urlString.toLowerCase();
  if (
    lower.startsWith('chrome://') ||
    lower.startsWith('chrome-extension://') ||
    lower.startsWith('edge://') ||
    lower.startsWith('about:') ||
    lower.startsWith('devtools://') ||
    lower.startsWith('view-source:')
  ) {
    return true;
  }
  if (lower.includes('chrome.google.com/webstore') || lower.includes('chromewebstore.google.com')) {
    return true;
  }
  return false;
}

function createDefaultMood() {
  return {
    hydration: 70,
    fullness: 65,
    joy: 80,
    energy: 55,
  };
}

function createDefaultPet() {
  return {
    name: 'Biscuit',
    personality: PERSONALITY_GOOFY,
    coat: COAT_GOLDEN,
    ears: EARS_FLOPPY,
    pronouns: 'they',
    bond: 0,
    mood: createDefaultMood(),
    inventory: {
      biscuits: 0,
      items: [ITEM_BLUE_BALL],
      favoriteToy: ITEM_BLUE_BALL,
    },
    tricks: [],
    careVarietyToday: {},
    stories: [],
  };
}

function createDefaultSettings() {
  return {
    mode: MODE_GENTLE,
    defaultBreakMinutes: 3,
    defaultBudgetSeconds: 1200,
    quietHours: { enabled: false, start: '22:00', end: '08:00' },
    motion: MOTION_FULL,
    sound: false,
    notifications: false,
    simpleCopy: false,
    highContrast: false,
    textScale: 100,
    onboardingComplete: false,
  };
}

function createDefaultDaily(nowMs) {
  return {
    date: getLocalDateString(nowMs),
    domains: {},
    breakSeconds: 0,
    focusSeconds: 0,
    urgentPasses: 0,
    breaksCompleted: 0,
    biscuitsEarned: 0,
    oneMinuteBreaksRewarded: 0,
    refreshCheckins: { more: 0, same: 0, less: 0 },
  };
}

function createDefaultState(nowMs) {
  const timestamp = typeof nowMs === 'number' ? nowMs : Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: createDefaultSettings(),
    pet: createDefaultPet(),
    guardedSites: {},
    activeSession: null,
    dailyAggregates: {
      [getLocalDateString(timestamp)]: createDefaultDaily(timestamp),
    },
    eventLog: [],
    rewardLedger: {},
    urgentPassWindow: {
      count: 0,
      windowStartedAt: null,
    },
    globalPauseUntil: null,
    warningShown: {},
  };
}

function getBondLevel(bondPoints) {
  const bond = clampInteger(bondPoints, 0, 100000, 0);
  let current = BOND_LEVELS[0];
  for (let index = 0; index < BOND_LEVELS.length; index += 1) {
    if (bond >= BOND_LEVELS[index].minBond) {
      current = BOND_LEVELS[index];
    }
  }
  return current;
}

function getPersonalityKey(settings, pet) {
  if (settings && settings.simpleCopy) {
    return PERSONALITY_SIMPLE;
  }
  const personality = pet && pet.personality ? pet.personality : PERSONALITY_GOOFY;
  if (COPY[personality]) {
    return personality;
  }
  return PERSONALITY_GOOFY;
}

function getCopy(settings, pet) {
  return COPY[getPersonalityKey(settings, pet)];
}

function pickAwayPrompt(nowMs) {
  const index = Math.abs(Math.floor(nowMs / 60000)) % AWAY_PROMPTS.length;
  return AWAY_PROMPTS[index];
}

function formatMs(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function remainingMsFromEndsAt(endsAt, nowMs) {
  if (typeof endsAt !== 'number' || !Number.isFinite(endsAt)) {
    return 0;
  }
  return Math.max(0, endsAt - nowMs);
}

function validateMood(raw) {
  const defaults = createDefaultMood();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }
  return {
    hydration: clampInteger(raw.hydration, 0, 100, defaults.hydration),
    fullness: clampInteger(raw.fullness, 0, 100, defaults.fullness),
    joy: clampInteger(raw.joy, 0, 100, defaults.joy),
    energy: clampInteger(raw.energy, 0, 100, defaults.energy),
  };
}

function validatePet(raw) {
  const defaults = createDefaultPet();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }
  const coats = [COAT_GOLDEN, COAT_BLACK_TAN, COAT_WHITE_BROWN, COAT_GREY, COAT_HIGH_CONTRAST];
  const ears = [EARS_FLOPPY, EARS_POINTY, EARS_MIXED];
  const personalities = [
    PERSONALITY_GOOFY,
    PERSONALITY_GENTLE,
    PERSONALITY_DRAMATIC,
    PERSONALITY_DETECTIVE,
  ];
  const name =
    typeof raw.name === 'string' && raw.name.trim().length > 0
      ? raw.name.trim().slice(0, 24)
      : defaults.name;
  const inventory =
    raw.inventory && typeof raw.inventory === 'object' ? raw.inventory : defaults.inventory;
  const items = Array.isArray(inventory.items)
    ? inventory.items.filter(function keepKnown(itemId) {
        return UNLOCKABLE_ITEMS.some(function match(item) {
          return item.id === itemId;
        });
      })
    : defaults.inventory.items;
  const uniqueItems = Array.from(new Set(items.length > 0 ? items : [ITEM_BLUE_BALL]));
  return {
    name: name,
    personality: personalities.includes(raw.personality) ? raw.personality : defaults.personality,
    coat: coats.includes(raw.coat) ? raw.coat : defaults.coat,
    ears: ears.includes(raw.ears) ? raw.ears : defaults.ears,
    pronouns: typeof raw.pronouns === 'string' ? raw.pronouns.slice(0, 16) : defaults.pronouns,
    bond: clampInteger(raw.bond, 0, 100000, 0),
    mood: validateMood(raw.mood),
    inventory: {
      biscuits: clampInteger(inventory.biscuits, 0, 100000, 0),
      items: uniqueItems,
      favoriteToy:
        typeof inventory.favoriteToy === 'string' && uniqueItems.includes(inventory.favoriteToy)
          ? inventory.favoriteToy
          : uniqueItems[0],
    },
    tricks: Array.isArray(raw.tricks) ? raw.tricks.filter(Boolean).slice(0, 20) : [],
    careVarietyToday:
      raw.careVarietyToday && typeof raw.careVarietyToday === 'object' ? raw.careVarietyToday : {},
    stories: Array.isArray(raw.stories) ? raw.stories.slice(0, 50) : [],
  };
}

function validateSettings(raw) {
  const defaults = createDefaultSettings();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }
  const modes = [MODE_GENTLE, MODE_GATE, MODE_FOCUS_ONLY];
  const motions = [MOTION_FULL, MOTION_REDUCED, MOTION_STATIC];
  const quiet =
    raw.quietHours && typeof raw.quietHours === 'object' ? raw.quietHours : defaults.quietHours;
  return {
    mode: modes.includes(raw.mode) ? raw.mode : defaults.mode,
    defaultBreakMinutes: BREAK_MINUTES.includes(raw.defaultBreakMinutes)
      ? raw.defaultBreakMinutes
      : defaults.defaultBreakMinutes,
    defaultBudgetSeconds: clampInteger(raw.defaultBudgetSeconds, 60, 14400, defaults.defaultBudgetSeconds),
    quietHours: {
      enabled: quiet.enabled === true,
      start: typeof quiet.start === 'string' ? quiet.start : defaults.quietHours.start,
      end: typeof quiet.end === 'string' ? quiet.end : defaults.quietHours.end,
    },
    motion: motions.includes(raw.motion) ? raw.motion : defaults.motion,
    sound: raw.sound === true,
    notifications: raw.notifications === true,
    simpleCopy: raw.simpleCopy === true,
    highContrast: raw.highContrast === true,
    textScale: clampInteger(raw.textScale, 100, 200, 100),
    onboardingComplete: raw.onboardingComplete === true,
  };
}

function validateGuardedSite(raw, defaults) {
  const fallback = defaults || {
    dailyBudgetSeconds: 1200,
    breakSeconds: 180,
    enabled: true,
  };
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }
  return {
    dailyBudgetSeconds: clampInteger(raw.dailyBudgetSeconds, 60, 14400, fallback.dailyBudgetSeconds),
    breakSeconds: clampInteger(raw.breakSeconds, 60, 600, fallback.breakSeconds),
    enabled: raw.enabled !== false,
  };
}

function validateState(raw, nowMs) {
  const timestamp = typeof nowMs === 'number' ? nowMs : Date.now();
  const defaults = createDefaultState(timestamp);
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }
  const guardedSites = {};
  if (raw.guardedSites && typeof raw.guardedSites === 'object') {
    Object.keys(raw.guardedSites).forEach(function mapSite(origin) {
      if (typeof origin === 'string' && origin.startsWith('http')) {
        guardedSites[origin] = validateGuardedSite(raw.guardedSites[origin], {
          dailyBudgetSeconds: defaults.settings.defaultBudgetSeconds,
          breakSeconds: defaults.settings.defaultBreakMinutes * 60,
          enabled: true,
        });
      }
    });
  }
  const dailyAggregates =
    raw.dailyAggregates && typeof raw.dailyAggregates === 'object'
      ? raw.dailyAggregates
      : defaults.dailyAggregates;
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: validateSettings(raw.settings),
    pet: validatePet(raw.pet),
    guardedSites: guardedSites,
    activeSession:
      raw.activeSession && typeof raw.activeSession === 'object' ? raw.activeSession : null,
    dailyAggregates: dailyAggregates,
    eventLog: Array.isArray(raw.eventLog) ? raw.eventLog.slice(-MAX_EVENT_LOG) : [],
    rewardLedger:
      raw.rewardLedger && typeof raw.rewardLedger === 'object' ? raw.rewardLedger : {},
    urgentPassWindow:
      raw.urgentPassWindow && typeof raw.urgentPassWindow === 'object'
        ? {
            count: clampInteger(raw.urgentPassWindow.count, 0, 100, 0),
            windowStartedAt:
              typeof raw.urgentPassWindow.windowStartedAt === 'number'
                ? raw.urgentPassWindow.windowStartedAt
                : null,
          }
        : { count: 0, windowStartedAt: null },
    globalPauseUntil:
      typeof raw.globalPauseUntil === 'number' ? raw.globalPauseUntil : null,
    warningShown:
      raw.warningShown && typeof raw.warningShown === 'object' ? raw.warningShown : {},
  };
}

function pruneDailyAggregates(dailyAggregates, nowMs) {
  const cutoff = getLocalDateString(nowMs - HISTORY_DAYS * 24 * 60 * 60 * 1000);
  const next = {};
  Object.keys(dailyAggregates || {}).forEach(function keepDay(dateKey) {
    if (dateKey >= cutoff) {
      next[dateKey] = dailyAggregates[dateKey];
    }
  });
  return next;
}

function ensureTodayAggregate(state, nowMs) {
  const dateKey = getLocalDateString(nowMs);
  const dailyAggregates = pruneDailyAggregates(state.dailyAggregates, nowMs);
  if (!dailyAggregates[dateKey]) {
    dailyAggregates[dateKey] = createDefaultDaily(nowMs);
  }
  const pet = Object.assign({}, state.pet);
  if (!pet.careVarietyToday || pet.careVarietyToday.date !== dateKey) {
    pet.careVarietyToday = { date: dateKey };
  }
  return Object.assign({}, state, {
    dailyAggregates: dailyAggregates,
    pet: pet,
  });
}

function isGloballyPaused(state, nowMs) {
  return typeof state.globalPauseUntil === 'number' && state.globalPauseUntil > nowMs;
}

function getDutyStatus(state, nowMs) {
  if (isGloballyPaused(state, nowMs)) {
    return STATUS_PAUSED;
  }
  if (state.activeSession && state.activeSession.type === SESSION_BREAK) {
    return STATUS_ON_BREAK;
  }
  if (state.activeSession && state.activeSession.type === SESSION_FOCUS) {
    return STATUS_FOCUS;
  }
  if (isWithinQuietHours(state.settings.quietHours, nowMs)) {
    return STATUS_QUIET;
  }
  if (!state.settings.onboardingComplete) {
    return STATUS_OFF_DUTY;
  }
  return STATUS_ON_DUTY;
}

function shouldSuppressGates(state, nowMs) {
  if (isGloballyPaused(state, nowMs)) {
    return true;
  }
  if (isWithinQuietHours(state.settings.quietHours, nowMs)) {
    return true;
  }
  if (state.settings.mode === MODE_FOCUS_ONLY) {
    return !(state.activeSession && state.activeSession.type === SESSION_FOCUS);
  }
  return false;
}

function getDomainEngagedSeconds(state, hostname, nowMs) {
  const ensured = ensureTodayAggregate(state, nowMs);
  const dateKey = getLocalDateString(nowMs);
  const day = ensured.dailyAggregates[dateKey];
  if (!day || !day.domains) {
    return 0;
  }
  return clampInteger(day.domains[hostname], 0, 86400, 0);
}

function findGuardedOriginForHostname(state, hostname) {
  const normalized = normalizeHostname(hostname);
  const origins = Object.keys(state.guardedSites || {});
  for (let index = 0; index < origins.length; index += 1) {
    const origin = origins[index];
    const siteHost = hostnameFromOrigin(origin);
    if (
      siteHost === normalized ||
      normalized.endsWith(`.${siteHost}`) ||
      siteHost.endsWith(`.${normalized}`)
    ) {
      return origin;
    }
  }
  return null;
}

function applyEngagedDelta(state, hostname, deltaSeconds, nowMs) {
  const seconds = clampInteger(deltaSeconds, 0, 120, 0);
  if (seconds <= 0) {
    return { state: state, remainingSeconds: null, shouldWarn: false, shouldGate: false };
  }
  let next = ensureTodayAggregate(state, nowMs);
  if (shouldSuppressGates(next, nowMs)) {
    return { state: next, remainingSeconds: null, shouldWarn: false, shouldGate: false };
  }
  const origin = findGuardedOriginForHostname(next, hostname);
  if (!origin) {
    return { state: next, remainingSeconds: null, shouldWarn: false, shouldGate: false };
  }
  const site = next.guardedSites[origin];
  if (!site || site.enabled === false) {
    return { state: next, remainingSeconds: null, shouldWarn: false, shouldGate: false };
  }
  if (next.activeSession && next.activeSession.type === SESSION_URGENT) {
    if (remainingMsFromEndsAt(next.activeSession.endsAt, nowMs) > 0) {
      return { state: next, remainingSeconds: null, shouldWarn: false, shouldGate: false };
    }
  }
  if (next.activeSession && next.activeSession.type === SESSION_BREAK) {
    return { state: next, remainingSeconds: 0, shouldWarn: false, shouldGate: true };
  }
  const host = normalizeHostname(hostname);
  const dateKey = getLocalDateString(nowMs);
  const day = Object.assign({}, next.dailyAggregates[dateKey]);
  const domains = Object.assign({}, day.domains);
  domains[host] = clampInteger((domains[host] || 0) + seconds, 0, 86400, seconds);
  day.domains = domains;
  const dailyAggregates = Object.assign({}, next.dailyAggregates, { [dateKey]: day });
  next = Object.assign({}, next, { dailyAggregates: dailyAggregates });

  const engaged = domains[host];
  const budget = site.dailyBudgetSeconds;
  const remaining = Math.max(0, budget - engaged);
  let shouldWarn = false;
  let shouldGate = false;

  if (next.settings.mode === MODE_GENTLE) {
    shouldWarn = engaged >= budget;
    shouldGate = false;
  } else if (next.activeSession && next.activeSession.type === SESSION_FOCUS) {
    shouldGate = true;
    shouldWarn = false;
  } else {
    shouldGate = engaged >= budget;
    shouldWarn = !shouldGate && remaining <= WARNING_SECONDS && remaining > 0;
  }

  const warningShown = Object.assign({}, next.warningShown);
  if (shouldWarn && warningShown[host] === dateKey) {
    shouldWarn = false;
  }
  if (shouldWarn) {
    warningShown[host] = dateKey;
    next = Object.assign({}, next, { warningShown: warningShown });
  }

  return {
    state: next,
    remainingSeconds: remaining,
    shouldWarn: shouldWarn,
    shouldGate: shouldGate,
    budgetSeconds: budget,
    engagedSeconds: engaged,
    origin: origin,
  };
}

function biscuitsForBreak(breakMinutes, daily) {
  if (breakMinutes <= 1) {
    if ((daily.oneMinuteBreaksRewarded || 0) >= 3) {
      return 0;
    }
    return 1;
  }
  if (breakMinutes <= 5) {
    return 2;
  }
  return 3;
}

function biscuitsForFocus(focusMinutes, activeRatio) {
  if (activeRatio < FOCUS_MIN_ACTIVE_RATIO) {
    return 0;
  }
  if (focusMinutes <= 30) {
    return 2;
  }
  if (focusMinutes <= 60) {
    return 3;
  }
  return 3;
}

function grantReward(state, sessionId, biscuits, bond, nowMs) {
  if (!sessionId || typeof sessionId !== 'string') {
    return { state: state, granted: false, reason: 'missing_session' };
  }
  if (state.rewardLedger && state.rewardLedger[sessionId]) {
    return { state: state, granted: false, reason: 'duplicate' };
  }
  let next = ensureTodayAggregate(state, nowMs);
  const dateKey = getLocalDateString(nowMs);
  const day = Object.assign({}, next.dailyAggregates[dateKey]);
  const pet = Object.assign({}, next.pet);
  const inventory = Object.assign({}, pet.inventory);
  const addBiscuits = clampInteger(biscuits, 0, 20, 0);
  const addBond = clampInteger(bond, 0, 20, 0);
  inventory.biscuits = clampInteger(inventory.biscuits + addBiscuits, 0, 100000, inventory.biscuits);
  pet.bond = clampInteger(pet.bond + addBond, 0, 100000, pet.bond);
  pet.inventory = inventory;
  day.biscuitsEarned = clampInteger((day.biscuitsEarned || 0) + addBiscuits, 0, 100000, 0);
  const rewardLedger = Object.assign({}, next.rewardLedger, {
    [sessionId]: {
      biscuits: addBiscuits,
      bond: addBond,
      at: nowMs,
    },
  });
  const eventLog = next.eventLog.concat([
    {
      type: 'reward',
      sessionId: sessionId,
      biscuits: addBiscuits,
      bond: addBond,
      at: nowMs,
    },
  ]).slice(-MAX_EVENT_LOG);
  next = Object.assign({}, next, {
    pet: pet,
    dailyAggregates: Object.assign({}, next.dailyAggregates, { [dateKey]: day }),
    rewardLedger: rewardLedger,
    eventLog: eventLog,
  });
  return { state: next, granted: true, biscuits: addBiscuits, bond: addBond };
}

function startBreakSession(state, breakMinutes, origin, nowMs) {
  const minutes = BREAK_MINUTES.includes(breakMinutes)
    ? breakMinutes
    : state.settings.defaultBreakMinutes;
  const sessionId = createId('break');
  const endsAt = nowMs + minutes * 60 * 1000;
  const activeSession = {
    type: SESSION_BREAK,
    sessionId: sessionId,
    minutes: minutes,
    endsAt: endsAt,
    startedAt: nowMs,
    origin: origin || null,
    phase: 'care',
    honestAwaySeconds: 0,
  };
  return Object.assign({}, state, { activeSession: activeSession });
}

function completeBreakSession(state, early, nowMs) {
  if (!state.activeSession || state.activeSession.type !== SESSION_BREAK) {
    return { state: state, reward: null };
  }
  const session = state.activeSession;
  const elapsedMs = Math.max(0, nowMs - session.startedAt);
  const plannedMs = session.minutes * 60 * 1000;
  const awayRatio = plannedMs > 0 ? elapsedMs / plannedMs : 0;
  const honest = early !== true && awayRatio >= 0.6;
  let next = ensureTodayAggregate(state, nowMs);
  const dateKey = getLocalDateString(nowMs);
  const day = Object.assign({}, next.dailyAggregates[dateKey]);
  day.breakSeconds = clampInteger(
    (day.breakSeconds || 0) + Math.floor(elapsedMs / 1000),
    0,
    86400,
    0,
  );
  day.breaksCompleted = clampInteger((day.breaksCompleted || 0) + 1, 0, 10000, 0);
  next = Object.assign({}, next, {
    dailyAggregates: Object.assign({}, next.dailyAggregates, { [dateKey]: day }),
    activeSession: null,
  });
  let reward = null;
  if (honest) {
    let biscuits = biscuitsForBreak(session.minutes, day);
    if (session.minutes <= 1 && biscuits > 0) {
      day.oneMinuteBreaksRewarded = clampInteger(
        (day.oneMinuteBreaksRewarded || 0) + 1,
        0,
        100,
        0,
      );
      next = Object.assign({}, next, {
        dailyAggregates: Object.assign({}, next.dailyAggregates, { [dateKey]: day }),
      });
    }
    const grant = grantReward(next, session.sessionId, biscuits, 1, nowMs);
    next = grant.state;
    reward = {
      biscuits: grant.biscuits || 0,
      bond: grant.bond || 0,
      minutes: session.minutes,
      granted: grant.granted,
    };
  } else {
    const grant = grantReward(next, session.sessionId, 0, 0, nowMs);
    next = grant.state;
    reward = { biscuits: 0, bond: 0, minutes: session.minutes, granted: false, early: true };
  }
  const eventLog = next.eventLog.concat([
    {
      type: 'break_complete',
      minutes: session.minutes,
      early: early === true,
      at: nowMs,
    },
  ]).slice(-MAX_EVENT_LOG);
  return { state: Object.assign({}, next, { eventLog: eventLog }), reward: reward };
}

function startFocusSession(state, focusMinutes, nowMs) {
  const minutes = clampInteger(focusMinutes, 5, 60, 25);
  const sessionId = createId('focus');
  const activeSession = {
    type: SESSION_FOCUS,
    sessionId: sessionId,
    minutes: minutes,
    endsAt: nowMs + minutes * 60 * 1000,
    startedAt: nowMs,
    activeMs: 0,
  };
  return Object.assign({}, state, { activeSession: activeSession });
}

function completeFocusSession(state, nowMs) {
  if (!state.activeSession || state.activeSession.type !== SESSION_FOCUS) {
    return { state: state, reward: null };
  }
  const session = state.activeSession;
  const plannedMs = session.minutes * 60 * 1000;
  const activeMs = clampInteger(session.activeMs, 0, plannedMs, 0);
  const ratio = plannedMs > 0 ? activeMs / plannedMs : 0;
  let next = ensureTodayAggregate(state, nowMs);
  const dateKey = getLocalDateString(nowMs);
  const day = Object.assign({}, next.dailyAggregates[dateKey]);
  day.focusSeconds = clampInteger(
    (day.focusSeconds || 0) + Math.floor(Math.min(plannedMs, nowMs - session.startedAt) / 1000),
    0,
    86400,
    0,
  );
  next = Object.assign({}, next, {
    dailyAggregates: Object.assign({}, next.dailyAggregates, { [dateKey]: day }),
    activeSession: null,
  });
  const biscuits = biscuitsForFocus(session.minutes, ratio);
  const grant = grantReward(next, session.sessionId, biscuits, biscuits > 0 ? 1 : 0, nowMs);
  next = grant.state;
  return {
    state: next,
    reward: {
      biscuits: grant.biscuits || 0,
      bond: grant.bond || 0,
      minutes: session.minutes,
      granted: grant.granted && biscuits > 0,
      activeRatio: ratio,
    },
  };
}

function applyUrgentPass(state, origin, nowMs, note) {
  let next = ensureTodayAggregate(state, nowMs);
  const windowMs = 30 * 60 * 1000;
  let urgentPassWindow = Object.assign({}, next.urgentPassWindow);
  if (
    !urgentPassWindow.windowStartedAt ||
    nowMs - urgentPassWindow.windowStartedAt > windowMs
  ) {
    urgentPassWindow = { count: 0, windowStartedAt: nowMs };
  }
  urgentPassWindow.count += 1;
  const dateKey = getLocalDateString(nowMs);
  const day = Object.assign({}, next.dailyAggregates[dateKey]);
  day.urgentPasses = clampInteger((day.urgentPasses || 0) + 1, 0, 10000, 0);
  const activeSession = {
    type: SESSION_URGENT,
    sessionId: createId('urgent'),
    endsAt: nowMs + URGENT_PASS_SECONDS * 1000,
    startedAt: nowMs,
    origin: origin || null,
    needsIntention: urgentPassWindow.count >= 2,
    noteDiscarded: true,
  };
  const eventLog = next.eventLog.concat([
    {
      type: 'urgent_pass',
      count: urgentPassWindow.count,
      at: nowMs,
      intention: typeof note === 'string' ? note.slice(0, 40) : null,
    },
  ]).slice(-MAX_EVENT_LOG);
  next = Object.assign({}, next, {
    urgentPassWindow: urgentPassWindow,
    activeSession: activeSession,
    dailyAggregates: Object.assign({}, next.dailyAggregates, { [dateKey]: day }),
    eventLog: eventLog,
  });
  return {
    state: next,
    needsIntention: activeSession.needsIntention,
    endsAt: activeSession.endsAt,
  };
}

function applyGlobalPause(state, durationMs, nowMs) {
  const until = nowMs + clampInteger(durationMs, 60000, 48 * 60 * 60 * 1000, 3600000);
  return Object.assign({}, state, {
    globalPauseUntil: until,
    activeSession: null,
  });
}

function applyCareAction(state, action, nowMs) {
  let next = ensureTodayAggregate(state, nowMs);
  const pet = Object.assign({}, next.pet);
  const mood = Object.assign({}, pet.mood);
  const variety = Object.assign({}, pet.careVarietyToday);
  let bondGain = 0;
  let line = '';

  if (action === CARE_WATER) {
    mood.hydration = clampInteger(mood.hydration + 25, 0, 100, mood.hydration);
    line = 'Hydration acquired. Tail systems online.';
    if (!variety[CARE_WATER]) {
      variety[CARE_WATER] = true;
      bondGain = 1;
    }
  } else if (action === CARE_FEED) {
    if (mood.fullness >= 90) {
      return {
        state: next,
        ok: false,
        message: `${pet.name}'s tummy is content. Save that biscuit for later?`,
        disclaimer: FOOD_DISCLAIMER,
      };
    }
    mood.fullness = clampInteger(mood.fullness + 20, 0, 100, mood.fullness);
    line = 'Crunch report: extremely crunchy.';
    if (!variety[CARE_FEED]) {
      variety[CARE_FEED] = true;
      bondGain = 1;
    }
  } else if (action === CARE_PET) {
    mood.joy = clampInteger(mood.joy + 10, 0, 100, mood.joy);
    line = 'Soft ears. Excellent work.';
    if (!variety[CARE_PET]) {
      variety[CARE_PET] = true;
      bondGain = 1;
    }
  } else if (action === CARE_PLAY) {
    mood.joy = clampInteger(mood.joy + 15, 0, 100, mood.joy);
    mood.energy = clampInteger(mood.energy - 5, 10, 100, mood.energy);
    line = 'Ball located. Priorities restored.';
    if (!variety[CARE_PLAY]) {
      variety[CARE_PLAY] = true;
      bondGain = 1;
    }
  } else {
    return { state: next, ok: false, message: 'Unknown care action.' };
  }

  pet.mood = mood;
  pet.careVarietyToday = variety;
  pet.bond = clampInteger(pet.bond + bondGain, 0, 100000, pet.bond);
  const level = getBondLevel(pet.bond);
  TRICKS.forEach(function maybeUnlock(trick) {
    if (level.level >= trick.minBondLevel && pet.tricks.indexOf(trick.id) === -1) {
      pet.tricks = pet.tricks.concat([trick.id]);
      pet.stories = pet.stories.concat([
        {
          id: trick.id,
          title: `Learned ${trick.name}`,
          at: nowMs,
        },
      ]);
    }
  });
  next = Object.assign({}, next, { pet: pet });
  return {
    state: next,
    ok: true,
    message: line,
    bondGain: bondGain,
    disclaimer: action === CARE_FEED ? FOOD_DISCLAIMER : null,
  };
}

function canUnlockItem(state, item) {
  const level = getBondLevel(state.pet.bond).level;
  const dateKey = getLocalDateString(Date.now());
  const day = state.dailyAggregates[dateKey] || createDefaultDaily(Date.now());
  if (item.unlock === 'start') {
    return true;
  }
  if (item.unlock === 'bond2') {
    return level >= 2;
  }
  if (item.unlock === 'bond3') {
    return level >= 3;
  }
  if (item.unlock === 'bond4') {
    return level >= 4;
  }
  if (item.unlock === 'breaks2') {
    return (day.breaksCompleted || 0) >= 2 || Object.keys(state.dailyAggregates).length > 1;
  }
  if (item.unlock === 'focus1') {
    return (day.focusSeconds || 0) >= 60 || state.pet.tricks.indexOf(TRICK_GUARD) !== -1;
  }
  return false;
}

function buyItem(state, itemId, nowMs) {
  const item = UNLOCKABLE_ITEMS.find(function match(entry) {
    return entry.id === itemId;
  });
  if (!item) {
    return { state: state, ok: false, message: 'Unknown item.' };
  }
  if (state.pet.inventory.items.indexOf(itemId) !== -1) {
    return { state: state, ok: false, message: 'Already owned.' };
  }
  if (!canUnlockItem(state, item)) {
    return { state: state, ok: false, message: 'Not unlocked yet.' };
  }
  if (state.pet.inventory.biscuits < item.cost) {
    return { state: state, ok: false, message: 'Need more biscuits.' };
  }
  const pet = Object.assign({}, state.pet);
  const inventory = Object.assign({}, pet.inventory);
  inventory.biscuits -= item.cost;
  inventory.items = inventory.items.concat([itemId]);
  pet.inventory = inventory;
  const eventLog = state.eventLog.concat([
    { type: 'buy', itemId: itemId, at: nowMs },
  ]).slice(-MAX_EVENT_LOG);
  return {
    state: Object.assign({}, state, { pet: pet, eventLog: eventLog }),
    ok: true,
    message: `Got ${item.name}.`,
  };
}

function applyRefreshCheckin(state, feeling, nowMs) {
  const allowed = ['more', 'same', 'less'];
  if (allowed.indexOf(feeling) === -1) {
    return state;
  }
  let next = ensureTodayAggregate(state, nowMs);
  const dateKey = getLocalDateString(nowMs);
  const day = Object.assign({}, next.dailyAggregates[dateKey]);
  const checkins = Object.assign({ more: 0, same: 0, less: 0 }, day.refreshCheckins);
  checkins[feeling] += 1;
  day.refreshCheckins = checkins;
  return Object.assign({}, next, {
    dailyAggregates: Object.assign({}, next.dailyAggregates, { [dateKey]: day }),
  });
}

function buildScrapbookSummary(state, nowMs) {
  const ensured = ensureTodayAggregate(state, nowMs);
  let breaks = 0;
  let breakSeconds = 0;
  let urgent = 0;
  Object.keys(ensured.dailyAggregates).forEach(function sumDay(dateKey) {
    const day = ensured.dailyAggregates[dateKey];
    breaks += day.breaksCompleted || 0;
    breakSeconds += day.breakSeconds || 0;
    urgent += day.urgentPasses || 0;
  });
  const checkins = ensured.dailyAggregates[getLocalDateString(nowMs)].refreshCheckins || {};
  let mostRefreshing = 'window breaks';
  if ((checkins.more || 0) >= (checkins.same || 0) && (checkins.more || 0) >= (checkins.less || 0)) {
    mostRefreshing = 'short pauses';
  }
  return {
    intentionalBreaks: breaks,
    minutesAway: Math.floor(breakSeconds / 60),
    mostRefreshing: mostRefreshing,
    urgentPasses: urgent,
    bondLevel: getBondLevel(ensured.pet.bond),
    stories: ensured.pet.stories.slice(-5),
  };
}

function buildExportPayload(state) {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    pet: state.pet,
    guardedSites: state.guardedSites,
    dailyAggregates: state.dailyAggregates,
    eventLog: state.eventLog,
  };
}

function clearTodayProgress(state, nowMs) {
  const dateKey = getLocalDateString(nowMs);
  const dailyAggregates = Object.assign({}, state.dailyAggregates);
  dailyAggregates[dateKey] = createDefaultDaily(nowMs);
  return Object.assign({}, state, {
    dailyAggregates: dailyAggregates,
    warningShown: {},
  });
}

function clearAllProgress(state, nowMs) {
  return Object.assign({}, state, {
    dailyAggregates: {
      [getLocalDateString(nowMs)]: createDefaultDaily(nowMs),
    },
    eventLog: [],
    rewardLedger: {},
    warningShown: {},
    urgentPassWindow: { count: 0, windowStartedAt: null },
    pet: Object.assign({}, state.pet, {
      bond: state.pet.bond,
      careVarietyToday: { date: getLocalDateString(nowMs) },
    }),
  });
}

function resetAllState(nowMs) {
  return createDefaultState(nowMs);
}

function resolveExpiredSession(state, nowMs) {
  if (!state.activeSession || typeof state.activeSession.endsAt !== 'number') {
    return { state: state, completed: null };
  }
  if (state.activeSession.endsAt > nowMs) {
    return { state: state, completed: null };
  }
  if (state.activeSession.type === SESSION_BREAK) {
    const result = completeBreakSession(state, false, nowMs);
    return { state: result.state, completed: { type: SESSION_BREAK, reward: result.reward } };
  }
  if (state.activeSession.type === SESSION_FOCUS) {
    const result = completeFocusSession(state, nowMs);
    return { state: result.state, completed: { type: SESSION_FOCUS, reward: result.reward } };
  }
  if (state.activeSession.type === SESSION_URGENT) {
    return {
      state: Object.assign({}, state, { activeSession: null }),
      completed: { type: SESSION_URGENT, reward: null },
    };
  }
  return { state: Object.assign({}, state, { activeSession: null }), completed: null };
}

function buildGateViewModel(state, hostname, nowMs) {
  const copy = getCopy(state.settings, state.pet);
  const origin = findGuardedOriginForHostname(state, hostname);
  const engaged = getDomainEngagedSeconds(state, normalizeHostname(hostname), nowMs);
  const site = origin ? state.guardedSites[origin] : null;
  const budget = site ? site.dailyBudgetSeconds : state.settings.defaultBudgetSeconds;
  return {
    dogName: state.pet.name,
    message: copy.gate,
    warning: copy.warning,
    reason: `${Math.floor(engaged / 60)} engaged minutes`,
    breakMinutes: site ? Math.round(site.breakSeconds / 60) : state.settings.defaultBreakMinutes,
    budgetSeconds: budget,
    engagedSeconds: engaged,
    motion: state.settings.motion,
    personality: getPersonalityKey(state.settings, state.pet),
  };
}

function shouldCountEngaged(flags) {
  if (!flags || typeof flags !== 'object') {
    return false;
  }
  return (
    flags.visible === true &&
    flags.windowFocused === true &&
    flags.recentActivity === true
  );
}

const api = {
  SCHEMA_VERSION,
  STORAGE_KEY_STATE,
  CONTENT_SCRIPT_ID,
  ALARM_BREAK,
  ALARM_FOCUS,
  ALARM_URGENT,
  MODE_GENTLE,
  MODE_GATE,
  MODE_FOCUS_ONLY,
  MOTION_FULL,
  MOTION_REDUCED,
  MOTION_STATIC,
  PERSONALITY_GOOFY,
  PERSONALITY_GENTLE,
  PERSONALITY_DRAMATIC,
  PERSONALITY_DETECTIVE,
  PERSONALITY_SIMPLE,
  COAT_GOLDEN,
  COAT_BLACK_TAN,
  COAT_WHITE_BROWN,
  COAT_GREY,
  COAT_HIGH_CONTRAST,
  EARS_FLOPPY,
  EARS_POINTY,
  EARS_MIXED,
  SESSION_NONE,
  SESSION_BREAK,
  SESSION_FOCUS,
  SESSION_URGENT,
  SESSION_PAUSE,
  STATUS_ON_DUTY,
  STATUS_ON_BREAK,
  STATUS_QUIET,
  STATUS_OFF_DUTY,
  STATUS_FOCUS,
  STATUS_PAUSED,
  CARE_PET,
  CARE_WATER,
  CARE_FEED,
  CARE_PLAY,
  BREAK_MINUTES,
  FOCUS_MINUTES,
  URGENT_PASS_SECONDS,
  WARNING_SECONDS,
  ACTIVITY_WINDOW_MS,
  DELTA_INTERVAL_MS,
  CARE_PHASE_MAX_MS,
  FOCUS_MIN_ACTIVE_RATIO,
  HISTORY_DAYS,
  BOND_LEVELS,
  UNLOCKABLE_ITEMS,
  TRICKS,
  FOOD_DISCLAIMER,
  COPY,
  AWAY_PROMPTS,
  URGENT_PRESETS,
  MESSAGE,
  ITEM_BLUE_BALL,
  ITEM_RED_BANDANA,
  ITEM_ROPE,
  ITEM_SECURITY_VEST,
  ITEM_READING_GLASSES,
  ITEM_RUG,
  ITEM_PLANT,
  ITEM_SQUEAKY_MOON,
  ITEM_WIZARD_HAT,
  ITEM_WINDOW_SEAT,
  clampNumber,
  clampInteger,
  createId,
  getLocalDateString,
  parseHmToMinutes,
  getMinutesOfDay,
  isWithinQuietHours,
  normalizeHostname,
  originFromUrl,
  hostnameFromOrigin,
  originPermissionPattern,
  isRestrictedUrl,
  createDefaultMood,
  createDefaultPet,
  createDefaultSettings,
  createDefaultDaily,
  createDefaultState,
  getBondLevel,
  getPersonalityKey,
  getCopy,
  pickAwayPrompt,
  formatMs,
  remainingMsFromEndsAt,
  validateMood,
  validatePet,
  validateSettings,
  validateGuardedSite,
  validateState,
  pruneDailyAggregates,
  ensureTodayAggregate,
  isGloballyPaused,
  getDutyStatus,
  shouldSuppressGates,
  getDomainEngagedSeconds,
  findGuardedOriginForHostname,
  applyEngagedDelta,
  biscuitsForBreak,
  biscuitsForFocus,
  grantReward,
  startBreakSession,
  completeBreakSession,
  startFocusSession,
  completeFocusSession,
  applyUrgentPass,
  applyGlobalPause,
  applyCareAction,
  canUnlockItem,
  buyItem,
  applyRefreshCheckin,
  buildScrapbookSummary,
  buildExportPayload,
  clearTodayProgress,
  clearAllProgress,
  resetAllState,
  resolveExpiredSession,
  buildGateViewModel,
  shouldCountEngaged,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}

if (typeof globalThis !== 'undefined') {
  Object.keys(api).forEach(function assignGlobal(key) {
    globalThis[key] = api[key];
  });
}
