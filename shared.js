'use strict';

const SCHEMA_VERSION = 4;
const STORAGE_KEY = 'barkbreak.state';
const CONTENT_SCRIPT_ID = 'barkbreak.dog';
const ALARM_BREAK = 'barkbreak.breakReturn';

const SIZE_SMALL = 'small';
const SIZE_MEDIUM = 'medium';
const SIZE_LARGE = 'large';

const FREQ_RARE = 'rare';
const FREQ_DEFAULT = 'default';
const FREQ_OFTEN = 'often';

const SCOPE_SELECTED = 'selected';
const SCOPE_ALL = 'all';

const DOG_GOLDEN = 'golden';
const DOG_CHOCOLATE = 'chocolate';
const DOG_BLACK = 'black';
const DOG_CREAM = 'cream';
const DOG_FOX = 'fox';

const POPUP_MINUTES_OPTIONS = Object.freeze([5, 10, 15, 30, 45, 60]);
const APPEAR_DELAY_OPTIONS = Object.freeze([0, 5, 15, 30]);

const DOG_TYPES = Object.freeze([
  { id: DOG_GOLDEN, label: 'Golden retriever', filter: 'none' },
  { id: DOG_CHOCOLATE, label: 'Chocolate lab', filter: 'brightness(0.78) sepia(0.35) hue-rotate(-18deg) saturate(1.15)' },
  { id: DOG_BLACK, label: 'Black lab', filter: 'brightness(0.38) contrast(1.25) saturate(0.35)' },
  { id: DOG_CREAM, label: 'Cream', filter: 'brightness(1.28) saturate(0.45) contrast(0.95)' },
  { id: DOG_FOX, label: 'Fox red', filter: 'hue-rotate(-18deg) saturate(1.45) brightness(0.95)' },
]);

const STATE_WALKING = 'walking';
const STATE_LOOKING = 'looking';
const STATE_RESTING = 'resting';
const STATE_SLEEPING = 'sleeping';
const STATE_REQUESTING = 'requesting';
const STATE_INTERACTING = 'interacting';
const STATE_HIDDEN = 'hidden';

const REQUEST_FOOD = 'food';
const REQUEST_WATER = 'water';
const REQUEST_PLAY = 'play';
const REQUEST_BREAK = 'break';

const MESSAGE = Object.freeze({
  GET_STATE: 'GET_STATE',
  SAVE_SETTINGS: 'SAVE_SETTINGS',
  COMPLETE_ONBOARDING: 'COMPLETE_ONBOARDING',
  TOGGLE_VISIBLE: 'TOGGLE_VISIBLE',
  PAUSE_HOUR: 'PAUSE_HOUR',
  CLEAR_PAUSE: 'CLEAR_PAUSE',
  RESET_MOOD: 'RESET_MOOD',
  ADD_SITE: 'ADD_SITE',
  REMOVE_SITE: 'REMOVE_SITE',
  RECORD_REQUEST: 'RECORD_REQUEST',
  START_BREAK: 'START_BREAK',
  END_BREAK: 'END_BREAK',
  SET_FULL: 'SET_FULL',
  SAVE_EXCITEMENT: 'SAVE_EXCITEMENT',
  RECORD_FIND: 'RECORD_FIND',
  RECORD_ACTION: 'RECORD_ACTION',
});

const SPEECH = Object.freeze({
  food: [
    'I have detected a biscuit shortage.',
    'My bowl has become theoretical.',
    'Snack inspection required.',
    'I have not eaten in several dramatic minutes.',
    '{name} smells something tasty.',
  ],
  water: [
    'Water quality test?',
    'The bowl is full of invisible water.',
    'Hydration department reporting for duty.',
    'Sip diplomacy is open.',
  ],
  play: [
    'Ball?',
    'The rope has challenged me.',
    'There is urgent fetching to do.',
    'I have brought chaos energy.',
  ],
  break: [
    'Walkies? The internet can guard itself.',
    'You have been here a while. I have also been here a while.',
    'Two-minute patrol outside the screen?',
    'Short walk. Tabs will survive.',
  ],
  full: ['Full now. Probably.', '{name} is saving room for later.', 'Please consult the tummy.'],
  thanks: ['Mmm.', 'That hit the spot.', 'Good human.', 'Excellent decision.'],
  pet: ['*leans in*', 'Yes. Exactly there.', 'More of that, please.'],
  boop: ['Boop registered.', 'Nose protocol complete.', 'That tickled my dignity.'],
  belly: ['Belly rub accepted.', 'World-class tummy service.', 'I am a pancake now.'],
  returnBreak: ["We're back. I found this.", 'Walk complete. Treasure acquired.', 'Patrol successful. Look what I found.'],
  later: ['Okay. I will nap nearby.', 'Later works.', 'The internet can wait… mostly.'],
  skid: ['Whoa— dizzy scroll energy.', 'I skidded in. Intentionally. Sort of.'],
  zoomies: ['Legs have filed a motion to sprint.', 'Zoomies complete. Dramatic collapse.'],
});

const PERSONALITIES = Object.freeze([
  { id: 'calm', label: 'Calm' },
  { id: 'playful', label: 'Playful' },
  { id: 'goofy', label: 'Goofy' },
  { id: 'dramatic', label: 'Dramatic' },
]);

const SIZE_PX = Object.freeze({
  [SIZE_SMALL]: 96,
  [SIZE_MEDIUM]: 140,
  [SIZE_LARGE]: 190,
});

const FREQ_MAX_REQUESTS = Object.freeze({
  [FREQ_RARE]: 2,
  [FREQ_DEFAULT]: 4,
  [FREQ_OFTEN]: 8,
});

function clampInteger(value, min, max, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function getLocalDateString(nowMs) {
  const date = new Date(nowMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function originPermissionPattern(origin) {
  try {
    const parsed = new URL(origin);
    return `${parsed.protocol}//${parsed.host}/*`;
  } catch (_error) {
    return '';
  }
}

function isRestrictedUrl(urlString) {
  if (typeof urlString !== 'string' || !urlString) {
    return true;
  }
  const lower = urlString.toLowerCase();
  return (
    lower.startsWith('chrome://') ||
    lower.startsWith('chrome-extension://') ||
    lower.startsWith('edge://') ||
    lower.startsWith('about:') ||
    lower.startsWith('devtools://') ||
    lower.includes('chrome.google.com/webstore') ||
    lower.includes('chromewebstore.google.com')
  );
}

function normalizeDogName(value) {
  if (typeof value !== 'string') {
    return 'Biscuit';
  }
  const trimmed = value.trim().slice(0, 20);
  return trimmed.length > 0 ? trimmed : 'Biscuit';
}

function getDogType(typeId) {
  for (let index = 0; index < DOG_TYPES.length; index += 1) {
    if (DOG_TYPES[index].id === typeId) {
      return DOG_TYPES[index];
    }
  }
  return DOG_TYPES[0];
}

function createDefaultSettings() {
  return {
    dogName: 'Biscuit',
    dogType: DOG_GOLDEN,
    personality: 'goofy',
    sound: false,
    size: SIZE_MEDIUM,
    attentionFrequency: FREQ_DEFAULT,
    popupMinutes: 30,
    appearDelaySeconds: 5,
    scope: SCOPE_SELECTED,
    visible: true,
    onboardingComplete: false,
    quietHoursEnabled: false,
    quietStart: '22:00',
    quietEnd: '08:00',
  };
}

function createEmptyExcitement(nowMs) {
  if (typeof createDefaultExcitement === 'function') {
    return createDefaultExcitement(nowMs);
  }
  return {
    mood: 'curious',
    finds: [],
    recentActions: [],
    fetchStreak: 0,
    squeakCount: 0,
    lastBarkAt: null,
    lastRareAt: null,
    lastUltraAt: null,
    raresToday: { date: getLocalDateString(nowMs || Date.now()), count: 0 },
    ignoredFoodRequest: false,
    equipped: null,
    memory: {
      favouriteFood: null,
      favouriteToy: 'ball',
      preferredAction: null,
      walkiesAccepted: 0,
      walkiesDeclined: 0,
      foodCounts: {},
      actionCounts: {},
      lastCornerX: null,
      activeHourBuckets: {},
    },
  };
}

function createDefaultState(nowMs) {
  const timestamp = typeof nowMs === 'number' ? nowMs : Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: createDefaultSettings(),
    sites: [],
    pauseUntil: null,
    fullUntil: null,
    lastFedAt: null,
    lastRequestAt: null,
    requestsToday: { date: getLocalDateString(timestamp), count: 0 },
    engagedMsToday: { date: getLocalDateString(timestamp), ms: 0 },
    breakEndsAt: null,
    lastBreakOfferedDate: null,
    excitement: createEmptyExcitement(timestamp),
  };
}

function validateSettings(raw) {
  const defaults = createDefaultSettings();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }
  const sizes = [SIZE_SMALL, SIZE_MEDIUM, SIZE_LARGE];
  const freqs = [FREQ_RARE, FREQ_DEFAULT, FREQ_OFTEN];
  const scopes = [SCOPE_SELECTED, SCOPE_ALL];
  const typeIds = DOG_TYPES.map(function mapType(entry) {
    return entry.id;
  });
  const popupMinutes = clampInteger(raw.popupMinutes, 5, 60, defaults.popupMinutes);
  const nearestPopup = POPUP_MINUTES_OPTIONS.includes(popupMinutes)
    ? popupMinutes
    : POPUP_MINUTES_OPTIONS.reduce(function nearest(best, option) {
        return Math.abs(option - popupMinutes) < Math.abs(best - popupMinutes) ? option : best;
      }, defaults.popupMinutes);
  const appearDelaySeconds = clampInteger(
    raw.appearDelaySeconds,
    0,
    30,
    defaults.appearDelaySeconds,
  );
  const nearestAppear = APPEAR_DELAY_OPTIONS.includes(appearDelaySeconds)
    ? appearDelaySeconds
    : APPEAR_DELAY_OPTIONS.reduce(function nearest(best, option) {
        return Math.abs(option - appearDelaySeconds) < Math.abs(best - appearDelaySeconds)
          ? option
          : best;
      }, defaults.appearDelaySeconds);
  const personalityIds = PERSONALITIES.map(function mapPersonality(entry) {
    return entry.id;
  });
  return {
    dogName: normalizeDogName(raw.dogName),
    dogType: typeIds.includes(raw.dogType) ? raw.dogType : defaults.dogType,
    personality: personalityIds.includes(raw.personality) ? raw.personality : defaults.personality,
    sound: raw.sound === true,
    size: sizes.includes(raw.size) ? raw.size : defaults.size,
    attentionFrequency: freqs.includes(raw.attentionFrequency)
      ? raw.attentionFrequency
      : defaults.attentionFrequency,
    popupMinutes: nearestPopup,
    appearDelaySeconds: nearestAppear,
    scope: scopes.includes(raw.scope) ? raw.scope : defaults.scope,
    visible: raw.visible !== false,
    onboardingComplete: raw.onboardingComplete === true,
    quietHoursEnabled: raw.quietHoursEnabled === true,
    quietStart: typeof raw.quietStart === 'string' ? raw.quietStart : defaults.quietStart,
    quietEnd: typeof raw.quietEnd === 'string' ? raw.quietEnd : defaults.quietEnd,
  };
}

function validateState(raw, nowMs) {
  const timestamp = typeof nowMs === 'number' ? nowMs : Date.now();
  const defaults = createDefaultState(timestamp);
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }
  const sites = Array.isArray(raw.sites)
    ? raw.sites.filter(function keep(origin) {
        return typeof origin === 'string' && origin.startsWith('http');
      })
    : [];
  const dateKey = getLocalDateString(timestamp);
  const requestsToday =
    raw.requestsToday && raw.requestsToday.date === dateKey
      ? {
          date: dateKey,
          count: clampInteger(raw.requestsToday.count, 0, 50, 0),
        }
      : { date: dateKey, count: 0 };
  const engagedMsToday =
    raw.engagedMsToday && raw.engagedMsToday.date === dateKey
      ? {
          date: dateKey,
          ms: clampInteger(raw.engagedMsToday.ms, 0, 24 * 60 * 60 * 1000, 0),
        }
      : { date: dateKey, ms: 0 };
  const excitement =
    typeof validateExcitement === 'function'
      ? validateExcitement(raw.excitement, timestamp)
      : createEmptyExcitement(timestamp);
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: validateSettings(raw.settings),
    sites: sites,
    pauseUntil: typeof raw.pauseUntil === 'number' ? raw.pauseUntil : null,
    fullUntil: typeof raw.fullUntil === 'number' ? raw.fullUntil : null,
    lastFedAt: typeof raw.lastFedAt === 'number' ? raw.lastFedAt : null,
    lastRequestAt: typeof raw.lastRequestAt === 'number' ? raw.lastRequestAt : null,
    requestsToday: requestsToday,
    engagedMsToday: engagedMsToday,
    breakEndsAt: typeof raw.breakEndsAt === 'number' ? raw.breakEndsAt : null,
    lastBreakOfferedDate:
      typeof raw.lastBreakOfferedDate === 'string' ? raw.lastBreakOfferedDate : null,
    excitement: excitement,
  };
}

function parseHm(hm) {
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

function isQuietHours(settings, nowMs) {
  if (!settings.quietHoursEnabled) {
    return false;
  }
  const start = parseHm(settings.quietStart);
  const end = parseHm(settings.quietEnd);
  if (start === null || end === null) {
    return false;
  }
  const date = new Date(nowMs);
  const current = date.getHours() * 60 + date.getMinutes();
  if (start === end) {
    return true;
  }
  if (start < end) {
    return current >= start && current < end;
  }
  return current >= start || current < end;
}

function isPaused(state, nowMs) {
  return typeof state.pauseUntil === 'number' && state.pauseUntil > nowMs;
}

function isFull(state, nowMs) {
  return typeof state.fullUntil === 'number' && state.fullUntil > nowMs;
}

function dogHeightForSize(size) {
  return SIZE_PX[size] || SIZE_PX[SIZE_MEDIUM];
}

function withDogName(template, dogName) {
  return String(template).replace(/\{name\}/g, dogName || 'Biscuit');
}

function pickSpeech(kind, nowMs, dogName) {
  const lines = SPEECH[kind] || SPEECH.thanks;
  const index = Math.abs(Math.floor(nowMs / 60000)) % lines.length;
  return withDogName(lines[index], dogName || 'Biscuit');
}

function popupGapMs(settings) {
  const minutes = clampInteger(settings.popupMinutes, 5, 60, 30);
  return minutes * 60 * 1000;
}

function canOfferAttention(state, nowMs) {
  if (!state.settings.visible) {
    return false;
  }
  if (isPaused(state, nowMs) || isQuietHours(state.settings, nowMs)) {
    return false;
  }
  const freq = state.settings.attentionFrequency;
  const max = FREQ_MAX_REQUESTS[freq] || 4;
  if (state.requestsToday.count >= max) {
    return false;
  }
  const gap = popupGapMs(state.settings);
  if (state.lastRequestAt && nowMs - state.lastRequestAt < gap) {
    return false;
  }
  return true;
}

function canOfferBreak(state, nowMs) {
  if (!canOfferAttention(state, nowMs)) {
    return false;
  }
  const dateKey = getLocalDateString(nowMs);
  if (state.lastBreakOfferedDate === dateKey) {
    return false;
  }
  return state.engagedMsToday.ms >= popupGapMs(state.settings);
}

function recordRequest(state, nowMs) {
  const dateKey = getLocalDateString(nowMs);
  const requestsToday =
    state.requestsToday.date === dateKey
      ? { date: dateKey, count: state.requestsToday.count + 1 }
      : { date: dateKey, count: 1 };
  return Object.assign({}, state, {
    requestsToday: requestsToday,
    lastRequestAt: nowMs,
  });
}

function addEngagedMs(state, deltaMs, nowMs) {
  const dateKey = getLocalDateString(nowMs);
  const current =
    state.engagedMsToday.date === dateKey ? state.engagedMsToday.ms : 0;
  return Object.assign({}, state, {
    engagedMsToday: {
      date: dateKey,
      ms: clampInteger(current + deltaMs, 0, 24 * 60 * 60 * 1000, 0),
    },
  });
}

function applyFeed(state, nowMs) {
  const dogName = state.settings.dogName;
  if (isFull(state, nowMs)) {
    return { state: state, ok: false, message: pickSpeech('full', nowMs, dogName) };
  }
  if (state.lastFedAt && nowMs - state.lastFedAt < 90 * 1000) {
    return { state: state, ok: false, message: pickSpeech('full', nowMs, dogName) };
  }
  return {
    state: Object.assign({}, state, {
      lastFedAt: nowMs,
      fullUntil: nowMs + 20 * 60 * 1000,
    }),
    ok: true,
    message: pickSpeech('thanks', nowMs, dogName),
  };
}

function formatMs(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const api = {
  SCHEMA_VERSION,
  STORAGE_KEY,
  CONTENT_SCRIPT_ID,
  ALARM_BREAK,
  SIZE_SMALL,
  SIZE_MEDIUM,
  SIZE_LARGE,
  FREQ_RARE,
  FREQ_DEFAULT,
  FREQ_OFTEN,
  SCOPE_SELECTED,
  SCOPE_ALL,
  DOG_GOLDEN,
  DOG_CHOCOLATE,
  DOG_BLACK,
  DOG_CREAM,
  DOG_FOX,
  POPUP_MINUTES_OPTIONS,
  APPEAR_DELAY_OPTIONS,
  DOG_TYPES,
  PERSONALITIES,
  STATE_WALKING,
  STATE_LOOKING,
  STATE_RESTING,
  STATE_SLEEPING,
  STATE_REQUESTING,
  STATE_INTERACTING,
  STATE_HIDDEN,
  REQUEST_FOOD,
  REQUEST_WATER,
  REQUEST_PLAY,
  REQUEST_BREAK,
  MESSAGE,
  SPEECH,
  SIZE_PX,
  FREQ_MAX_REQUESTS,
  clampInteger,
  getLocalDateString,
  originFromUrl,
  originPermissionPattern,
  isRestrictedUrl,
  normalizeDogName,
  getDogType,
  createDefaultSettings,
  createEmptyExcitement,
  createDefaultState,
  validateSettings,
  validateState,
  parseHm,
  isQuietHours,
  isPaused,
  isFull,
  dogHeightForSize,
  withDogName,
  pickSpeech,
  popupGapMs,
  canOfferAttention,
  canOfferBreak,
  recordRequest,
  addEngagedMs,
  applyFeed,
  formatMs,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}

if (typeof globalThis !== 'undefined') {
  Object.keys(api).forEach(function assign(key) {
    globalThis[key] = api[key];
  });
}
