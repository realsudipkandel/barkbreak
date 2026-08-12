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
const DOG_GINGER_CAT = 'ginger_brit';
const DOG_BLACK_CAT = 'black_cat';
const DOG_BW_CAT = 'bw_cat';

const ASSET_FOLDER_DOG = 'dog';
const ASSET_FOLDER_CAT = 'cat';

const DEFAULT_DOG_NAME = 'Kabs';
const CAT_HEIGHT_SCALE = 1.55;

const POPUP_MINUTES_OPTIONS = Object.freeze([5, 10, 15, 30, 45, 60]);
const APPEAR_DELAY_OPTIONS = Object.freeze([0, 5, 15, 30]);

const DOG_TYPES = Object.freeze([
  { id: DOG_GOLDEN, label: 'Golden retriever', filter: 'none', assetFolder: ASSET_FOLDER_DOG, heightScale: 1 },
  {
    id: DOG_CHOCOLATE,
    label: 'Chocolate lab',
    filter: 'brightness(0.78) sepia(0.35) hue-rotate(-18deg) saturate(1.15)',
    assetFolder: ASSET_FOLDER_DOG,
    heightScale: 1,
  },
  {
    id: DOG_BLACK,
    label: 'Black lab',
    filter: 'brightness(0.38) contrast(1.25) saturate(0.35)',
    assetFolder: ASSET_FOLDER_DOG,
    heightScale: 1,
  },
  {
    id: DOG_CREAM,
    label: 'Cream',
    filter: 'brightness(1.28) saturate(0.45) contrast(0.95)',
    assetFolder: ASSET_FOLDER_DOG,
    heightScale: 1,
  },
  {
    id: DOG_FOX,
    label: 'Fox red',
    filter: 'hue-rotate(-18deg) saturate(1.45) brightness(0.95)',
    assetFolder: ASSET_FOLDER_DOG,
    heightScale: 1,
  },
  {
    id: DOG_GINGER_CAT,
    label: 'Ginger British Shorthair',
    filter: 'none',
    assetFolder: ASSET_FOLDER_CAT,
    heightScale: CAT_HEIGHT_SCALE,
  },
  {
    id: DOG_BLACK_CAT,
    label: 'Black cat',
    filter: 'brightness(0.22) contrast(1.45) saturate(0.15)',
    assetFolder: ASSET_FOLDER_CAT,
    heightScale: CAT_HEIGHT_SCALE,
  },
  {
    id: DOG_BW_CAT,
    label: 'Black & white cat',
    filter: 'grayscale(1) contrast(1.28) brightness(1.05)',
    assetFolder: ASSET_FOLDER_CAT,
    heightScale: CAT_HEIGHT_SCALE,
  },
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
    return DEFAULT_DOG_NAME;
  }
  const trimmed = value.trim().slice(0, 20);
  return trimmed.length > 0 ? trimmed : DEFAULT_DOG_NAME;
}

function getDogType(typeId) {
  for (let index = 0; index < DOG_TYPES.length; index += 1) {
    if (DOG_TYPES[index].id === typeId) {
      return DOG_TYPES[index];
    }
  }
  return DOG_TYPES[0];
}

function companionAssetFolder(typeId) {
  const dogType = getDogType(typeId);
  return dogType.assetFolder || ASSET_FOLDER_DOG;
}

function isCatCompanion(typeId) {
  return companionAssetFolder(typeId) === ASSET_FOLDER_CAT;
}

function companionSoundSpecies(typeId) {
  return isCatCompanion(typeId) ? 'cat' : 'dog';
}

function companionPreviewSrc(typeId) {
  return `assets/${companionAssetFolder(typeId)}/sit.png`;
}

function createDefaultSettings() {
  return {
    dogName: DEFAULT_DOG_NAME,
    dogType: DOG_BLACK_CAT,
    personality: 'goofy',
    sound: true,
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

const WALK_STEP_PX = 22;
const WALK_BOB_AMPLITUDE_PX = 3.2;
const POINTER_LEAN_MAX_DEG = 7;
const IDLE_BREATH_PERIOD_MS = 2800;

function walkFrameIndex(distancePx, frameCount, stepPx) {
  const step = typeof stepPx === 'number' && stepPx > 0 ? stepPx : WALK_STEP_PX;
  const count = Math.max(1, Math.floor(Number(frameCount) || 1));
  const distance = Math.max(0, Number(distancePx) || 0);
  return Math.floor(distance / step) % count;
}

function walkBobOffset(distancePx, stepPx, amplitudePx) {
  const step = typeof stepPx === 'number' && stepPx > 0 ? stepPx : WALK_STEP_PX;
  const amplitude =
    typeof amplitudePx === 'number' ? amplitudePx : WALK_BOB_AMPLITUDE_PX;
  const distance = Math.max(0, Number(distancePx) || 0);
  const cycleLength = step * 4;
  const phase = (distance / cycleLength) * Math.PI * 2;
  return Math.sin(phase) * amplitude;
}

function pointerLeanDegrees(deltaX, deltaY, maxTiltDeg) {
  const maxTilt =
    typeof maxTiltDeg === 'number' ? maxTiltDeg : POINTER_LEAN_MAX_DEG;
  const offsetX = Number(deltaX) || 0;
  const offsetY = Number(deltaY) || 0;
  const leanY = Math.max(-1, Math.min(1, offsetX / 280)) * maxTilt;
  const leanX = Math.max(-1, Math.min(1, offsetY / 220)) * (maxTilt * 0.55);
  return Object.freeze({
    rotateY: leanY,
    rotateX: -leanX,
  });
}

function contactShadowStyle(liftPx, maxLiftPx) {
  const maxLift = typeof maxLiftPx === 'number' && maxLiftPx > 0 ? maxLiftPx : 220;
  const lift = Math.max(0, Number(liftPx) || 0);
  const progress = Math.min(1, lift / maxLift);
  return Object.freeze({
    scaleX: 1 - progress * 0.45,
    scaleY: 1 - progress * 0.35,
    opacity: 0.38 * (1 - progress * 0.78),
  });
}

function idleBreathScale(nowMs, periodMs) {
  const period =
    typeof periodMs === 'number' && periodMs > 0 ? periodMs : IDLE_BREATH_PERIOD_MS;
  const now = Math.max(0, Number(nowMs) || 0);
  const phase = ((now % period) / period) * Math.PI * 2;
  return 1 + Math.sin(phase) * 0.014;
}

function facingTowardPointer(companionCenterX, pointerX, currentFacing, deadZonePx) {
  const deadZone = typeof deadZonePx === 'number' ? deadZonePx : 48;
  const centerX = Number(companionCenterX) || 0;
  const pointer = Number(pointerX) || 0;
  const facing = currentFacing >= 0 ? 1 : -1;
  if (pointer < centerX - deadZone) {
    return -1;
  }
  if (pointer > centerX + deadZone) {
    return 1;
  }
  return facing;
}

function walkBoundsForViewport(viewportWidth, companionWidth, marginPx) {
  const margin = typeof marginPx === 'number' ? marginPx : 8;
  const width = Math.max(1, Number(companionWidth) || 120);
  const viewport = Math.max(0, Number(viewportWidth) || 0);
  const minX = margin;
  const maxX = Math.max(minX, viewport - width - margin);
  return { minX: minX, maxX: maxX };
}

function resolveWalkEdgeBounce(positionX, currentFacing, minX, maxX) {
  const facing = currentFacing >= 0 ? 1 : -1;
  const left = Number(minX);
  const right = Number(maxX);
  let nextX = Number(positionX);
  if (!Number.isFinite(nextX)) {
    nextX = left;
  }
  if (nextX >= right) {
    return {
      x: right,
      facing: facing > 0 ? -1 : facing,
      turned: facing > 0,
    };
  }
  if (nextX <= left) {
    return {
      x: left,
      facing: facing < 0 ? 1 : facing,
      turned: facing < 0,
    };
  }
  return { x: nextX, facing: facing, turned: false };
}

function isExtensionContextInvalidationError(error) {
  const message = String(
    error && typeof error === 'object' && error.message ? error.message : error || '',
  );
  return /extension context invalidated/i.test(message);
}

const FETCH_PHASE_AIM = 'aim';
const FETCH_PHASE_FLIGHT = 'flight';
const FETCH_PHASE_CHASE = 'chase';
const FETCH_PHASE_RETURN = 'return';
const FETCH_PHASE_DONE = 'done';

const BALL_GROUND_Y_PX = 12;
const BALL_SIZE_PX = 18;
const FETCH_CATCH_DISTANCE_PX = 36;
const FETCH_RETURN_DISTANCE_PX = 40;
const THROW_MIN_SPEED = 2.4;
const THROW_MAX_SPEED = 22;

function createBallState(positionX, positionY, velocityX, velocityY) {
  return {
    x: Number(positionX) || 0,
    y: Number(positionY) || BALL_GROUND_Y_PX,
    vx: Number(velocityX) || 0,
    vy: Number(velocityY) || 0,
    hops: 0,
    settled: false,
  };
}

function clampThrowSpeed(vx, vy, minSpeed, maxSpeed) {
  const min = typeof minSpeed === 'number' ? minSpeed : THROW_MIN_SPEED;
  const max = typeof maxSpeed === 'number' ? maxSpeed : THROW_MAX_SPEED;
  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed < min) {
    return { vx: 0, vy: 0, tooSoft: true };
  }
  if (speed <= max) {
    return { vx: vx, vy: vy, tooSoft: false };
  }
  const scale = max / speed;
  return { vx: vx * scale, vy: vy * scale, tooSoft: false };
}

function throwVelocityFromDrag(fromX, fromY, toX, toY, durationMs) {
  const duration = Math.max(16, Number(durationMs) || 16);
  const scale = 18 / duration;
  const rawVx = (Number(toX) - Number(fromX)) * scale;
  const rawVy = (Number(toY) - Number(fromY)) * scale;
  return clampThrowSpeed(rawVx, rawVy, THROW_MIN_SPEED, THROW_MAX_SPEED);
}

function defaultThrowVelocity(facing) {
  const direction = facing >= 0 ? 1 : -1;
  return { vx: direction * 11, vy: 8.5, tooSoft: false };
}

function stepBallPhysics(ballState, deltaMs, viewportWidth, groundY) {
  const ball = ballState || createBallState(0, groundY || BALL_GROUND_Y_PX, 0, 0);
  if (ball.settled) {
    return ball;
  }
  const ground = typeof groundY === 'number' ? groundY : BALL_GROUND_Y_PX;
  const width = Math.max(BALL_SIZE_PX + 8, Number(viewportWidth) || 320);
  const step = Math.max(0, Number(deltaMs) || 0) / 30;
  let nextX = ball.x + ball.vx * step;
  let nextY = ball.y + ball.vy * step;
  let nextVx = ball.vx;
  let nextVy = ball.vy - 0.55 * step;
  let hops = ball.hops;
  if (nextY <= ground) {
    nextY = ground;
    nextVy = Math.abs(nextVy) * 0.55;
    nextVx *= 0.82;
    hops += 1;
  }
  if (nextX < 8) {
    nextX = 8;
    nextVx = Math.abs(nextVx) * 0.75;
  } else if (nextX > width - BALL_SIZE_PX - 8) {
    nextX = width - BALL_SIZE_PX - 8;
    nextVx = -Math.abs(nextVx) * 0.75;
  }
  const slow = Math.abs(nextVx) < 0.55 && Math.abs(nextVy) < 0.85;
  const settled = nextY <= ground + 0.5 && (hops >= 2 && slow || hops >= 5);
  if (settled) {
    nextVx = 0;
    nextVy = 0;
    nextY = ground;
  }
  return {
    x: nextX,
    y: nextY,
    vx: nextVx,
    vy: nextVy,
    hops: hops,
    settled: settled,
  };
}

function stepFetchChase(companionX, ballX, speed, catchDistancePx) {
  const catchDistance =
    typeof catchDistancePx === 'number' ? catchDistancePx : FETCH_CATCH_DISTANCE_PX;
  const step = Math.max(0, Number(speed) || 0);
  const currentX = Number(companionX) || 0;
  const targetX = Number(ballX) || 0;
  const delta = targetX - currentX;
  const facing = delta >= 0 ? 1 : -1;
  if (Math.abs(delta) <= catchDistance) {
    return { x: currentX, facing: facing, caught: true };
  }
  const move = Math.min(Math.abs(delta), step) * facing;
  return { x: currentX + move, facing: facing, caught: false };
}

function stepFetchReturn(companionX, returnX, speed, arriveDistancePx) {
  const arriveDistance =
    typeof arriveDistancePx === 'number' ? arriveDistancePx : FETCH_RETURN_DISTANCE_PX;
  return stepFetchChase(companionX, returnX, speed, arriveDistance);
}

function dogHeightForSize(size, typeId) {
  const base = SIZE_PX[size] || SIZE_PX[SIZE_MEDIUM];
  if (typeId === undefined) {
    return base;
  }
  const dogType = getDogType(typeId);
  const scale = typeof dogType.heightScale === 'number' ? dogType.heightScale : 1;
  return Math.round(base * scale);
}

function withDogName(template, dogName) {
  return String(template).replace(/\{name\}/g, dogName || DEFAULT_DOG_NAME);
}

function pickSpeech(kind, nowMs, dogName) {
  const lines = SPEECH[kind] || SPEECH.thanks;
  const index = Math.abs(Math.floor(nowMs / 60000)) % lines.length;
  return withDogName(lines[index], dogName || DEFAULT_DOG_NAME);
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
  DOG_GINGER_CAT,
  DOG_BLACK_CAT,
  DOG_BW_CAT,
  ASSET_FOLDER_DOG,
  ASSET_FOLDER_CAT,
  DEFAULT_DOG_NAME,
  CAT_HEIGHT_SCALE,
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
  companionAssetFolder,
  isCatCompanion,
  companionSoundSpecies,
  companionPreviewSrc,
  createDefaultSettings,
  createEmptyExcitement,
  createDefaultState,
  validateSettings,
  validateState,
  parseHm,
  isQuietHours,
  isPaused,
  isFull,
  WALK_STEP_PX,
  WALK_BOB_AMPLITUDE_PX,
  POINTER_LEAN_MAX_DEG,
  IDLE_BREATH_PERIOD_MS,
  walkFrameIndex,
  walkBobOffset,
  pointerLeanDegrees,
  contactShadowStyle,
  idleBreathScale,
  facingTowardPointer,
  walkBoundsForViewport,
  resolveWalkEdgeBounce,
  isExtensionContextInvalidationError,
  FETCH_PHASE_AIM,
  FETCH_PHASE_FLIGHT,
  FETCH_PHASE_CHASE,
  FETCH_PHASE_RETURN,
  FETCH_PHASE_DONE,
  BALL_GROUND_Y_PX,
  BALL_SIZE_PX,
  FETCH_CATCH_DISTANCE_PX,
  FETCH_RETURN_DISTANCE_PX,
  THROW_MIN_SPEED,
  THROW_MAX_SPEED,
  createBallState,
  clampThrowSpeed,
  throwVelocityFromDrag,
  defaultThrowVelocity,
  stepBallPhysics,
  stepFetchChase,
  stepFetchReturn,
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
