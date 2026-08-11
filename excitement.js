'use strict';

/**
 * Excitement layer: combos, finds, moods, rare events, memory, pacing.
 * Pure logic — safe for Node tests and content/service worker.
 */

const MOOD_RELAXED = 'relaxed';
const MOOD_PLAYFUL = 'playful';
const MOOD_CURIOUS = 'curious';
const MOOD_SNACK = 'snack';

const PERSONALITY_CALM = 'calm';
const PERSONALITY_PLAYFUL = 'playful';
const PERSONALITY_GOOFY = 'goofy';
const PERSONALITY_DRAMATIC = 'dramatic';

const ACTION_PET = 'pet';
const ACTION_BOOP = 'boop';
const ACTION_BELLY = 'belly';
const ACTION_FEED = 'feed';
const ACTION_WATER = 'water';
const ACTION_FETCH = 'fetch';
const ACTION_SQUEAK = 'squeak';
const ACTION_WALKIES = 'walkies';
const ACTION_WAKE = 'wake';
const ACTION_IGNORE_FOOD = 'ignore_food';

const FINDABLES = Object.freeze([
  { id: 'sock', name: 'Sock', unlock: null },
  { id: 'leaf', name: 'Leaf', unlock: null },
  { id: 'stick', name: 'Stick', unlock: null },
  { id: 'tennis_ball', name: 'Tennis ball', unlock: 'ball' },
  { id: 'rubber_duck', name: 'Rubber duck', unlock: null },
  { id: 'feather', name: 'Feather', unlock: null },
  { id: 'newspaper', name: 'Newspaper', unlock: 'read' },
  { id: 'slipper', name: 'Slipper', unlock: null },
  { id: 'traffic_cone', name: 'Traffic cone', unlock: 'cone' },
  { id: 'toy_dinosaur', name: 'Toy dinosaur', unlock: null },
  { id: 'sandwich_wrapper', name: 'Sandwich wrapper', unlock: null },
  { id: 'umbrella', name: 'Very small umbrella', unlock: 'umbrella' },
  { id: 'cardboard_tube', name: 'Giant cardboard tube', unlock: 'tube' },
  { id: 'golden_ball', name: 'Golden tennis ball', unlock: 'golden_fetch', rare: true },
  { id: 'clipboard', name: 'Clipboard', unlock: 'inspect' },
  { id: 'towel', name: 'Bath towel', unlock: null },
  { id: 'glasses', name: 'Reading glasses', unlock: 'read' },
  { id: 'cone_hat', name: 'Party hat', unlock: null },
  { id: 'duck_parade', name: 'Rubber duck parade pass', unlock: null, rare: true },
  { id: 'mystery_friend', name: 'Mysterious dog sighting', unlock: null, rare: true },
]);

const RARE_EVENTS = Object.freeze([
  { id: 'squirrel', title: 'Squirrel Emergency', speech: 'SQUIRREL— I mean, nothing.' },
  { id: 'delivery', title: 'Delivery Day', speech: 'Package sniffed. Contents: destiny.' },
  { id: 'zoomies', title: 'Zoomies', speech: 'Legs have filed a motion to sprint.' },
  { id: 'bath', title: 'Bath Escape', speech: 'I was never wet. You imagined it.' },
  { id: 'dream', title: 'Dream Sequence', speech: '…giant biscuit… yes…' },
  { id: 'inspect', title: 'Browser Inspection', speech: 'Page inspected. Several suspicious buttons.' },
]);

const ULTRA_RARE_EVENTS = Object.freeze([
  { id: 'birthday', title: 'Tiny Birthday', speech: 'There is cake somewhere. I can feel it.' },
  { id: 'friend', title: 'Mysterious Guest', speech: 'I do not know that dog. Cool though.' },
  { id: 'golden_ball', title: 'Golden Ball', speech: 'Legendary fetch material acquired.' },
  { id: 'duck_parade', title: 'Duck Parade', speech: 'Quack traffic jam. I approve.' },
  { id: 'inspector', title: 'Chief Browser Inspector', speech: 'Badge on. Tabs under review.' },
]);

const COMBO_TABLE = Object.freeze([
  {
    id: 'fetch_water',
    steps: [ACTION_FETCH, ACTION_WATER],
    speech: 'Shake protocol engaged. Droplets incoming.',
    effect: 'shake',
  },
  {
    id: 'feed_belly',
    steps: [ACTION_FEED, ACTION_BELLY],
    speech: 'Absolutely not. Please consult the tummy.',
    effect: 'refuse',
  },
  {
    id: 'pet_boop',
    steps: [ACTION_PET, ACTION_BOOP],
    speech: 'Roll sequence unlocked.',
    effect: 'roll',
  },
  {
    id: 'triple_fetch',
    steps: [ACTION_FETCH, ACTION_FETCH, ACTION_FETCH],
    speech: 'Ball? What ball? I have never seen a ball.',
    effect: 'hide_ball',
  },
  {
    id: 'water_ball',
    steps: [ACTION_WATER, ACTION_FETCH],
    speech: 'Ball in bowl. Science.',
    effect: 'ball_in_bowl',
  },
]);

const SPEECH_FUN = Object.freeze({
  food: [
    'I have detected a biscuit shortage.',
    'My bowl has become theoretical.',
    'Snack inspection required.',
    'I have not eaten in several dramatic minutes.',
    '{name} would like a briefing… about snacks.',
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
    'Play department is understaffed. Help.',
  ],
  break: [
    'Walkies? The internet can guard itself.',
    'You have been here a while. I have also been here a while.',
    'Two-minute patrol outside the screen?',
    'Short walk. Tabs will survive.',
  ],
  memoryBall: ['You brought the ball. Excellent decision.'],
  memoryCarrot: ['Carrots again? We discussed this.'],
  memoryCorner: ['This corner is mine now.'],
  memoryBreak: ['You normally take a break around this time.'],
});

function createDefaultMemory() {
  return {
    favouriteFood: null,
    favouriteToy: 'ball',
    preferredAction: null,
    walkiesAccepted: 0,
    walkiesDeclined: 0,
    foodCounts: {},
    actionCounts: {},
    lastCornerX: null,
    activeHourBuckets: {},
  };
}

function createDefaultExcitement(nowMs) {
  const dateKey =
    typeof getLocalDateString === 'function'
      ? getLocalDateString(nowMs || Date.now())
      : new Date(nowMs || Date.now()).toISOString().slice(0, 10);
  return {
    mood: MOOD_CURIOUS,
    finds: [],
    recentActions: [],
    fetchStreak: 0,
    squeakCount: 0,
    lastBarkAt: null,
    lastRareAt: null,
    lastUltraAt: null,
    raresToday: { date: dateKey, count: 0 },
    ignoredFoodRequest: false,
    equipped: null,
    memory: createDefaultMemory(),
  };
}

function validateExcitement(raw, nowMs) {
  const defaults = createDefaultExcitement(nowMs);
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }
  const moods = [MOOD_RELAXED, MOOD_PLAYFUL, MOOD_CURIOUS, MOOD_SNACK];
  const knownFindIds = FINDABLES.map(function mapFind(item) {
    return item.id;
  });
  const finds = Array.isArray(raw.finds)
    ? raw.finds.filter(function keep(id) {
        return knownFindIds.indexOf(id) !== -1;
      })
    : [];
  const uniqueFinds = Array.from(new Set(finds));
  const memory =
    raw.memory && typeof raw.memory === 'object'
      ? Object.assign(createDefaultMemory(), raw.memory)
      : createDefaultMemory();
  const dateKey =
    typeof getLocalDateString === 'function'
      ? getLocalDateString(nowMs || Date.now())
      : defaults.raresToday.date;
  const raresToday =
    raw.raresToday && raw.raresToday.date === dateKey
      ? {
          date: dateKey,
          count: clampInteger(raw.raresToday.count, 0, 10, 0),
        }
      : { date: dateKey, count: 0 };
  return {
    mood: moods.includes(raw.mood) ? raw.mood : defaults.mood,
    finds: uniqueFinds,
    recentActions: Array.isArray(raw.recentActions) ? raw.recentActions.slice(-6) : [],
    fetchStreak: clampInteger(raw.fetchStreak, 0, 20, 0),
    squeakCount: clampInteger(raw.squeakCount, 0, 20, 0),
    lastBarkAt: typeof raw.lastBarkAt === 'number' ? raw.lastBarkAt : null,
    lastRareAt: typeof raw.lastRareAt === 'number' ? raw.lastRareAt : null,
    lastUltraAt: typeof raw.lastUltraAt === 'number' ? raw.lastUltraAt : null,
    raresToday: raresToday,
    ignoredFoodRequest: raw.ignoredFoodRequest === true,
    equipped: typeof raw.equipped === 'string' ? raw.equipped : null,
    memory: memory,
  };
}

function pushRecentAction(excitement, action) {
  const recentActions = excitement.recentActions.concat([action]).slice(-6);
  let fetchStreak = excitement.fetchStreak;
  if (action === ACTION_FETCH) {
    fetchStreak += 1;
  } else {
    fetchStreak = 0;
  }
  return Object.assign({}, excitement, {
    recentActions: recentActions,
    fetchStreak: fetchStreak,
  });
}

function matchCombo(excitement) {
  const recent = excitement.recentActions;
  for (let index = 0; index < COMBO_TABLE.length; index += 1) {
    const combo = COMBO_TABLE[index];
    const needed = combo.steps.length;
    if (recent.length < needed) {
      continue;
    }
    const slice = recent.slice(-needed);
    let ok = true;
    for (let step = 0; step < needed; step += 1) {
      if (slice[step] !== combo.steps[step]) {
        ok = false;
        break;
      }
    }
    if (ok) {
      return combo;
    }
  }
  if (excitement.fetchStreak >= 3) {
    return COMBO_TABLE.find(function findTriple(entry) {
      return entry.id === 'triple_fetch';
    });
  }
  return null;
}

function pickFind(excitement, preferRare) {
  const owned = {};
  excitement.finds.forEach(function mark(id) {
    owned[id] = true;
  });
  const pool = FINDABLES.filter(function available(item) {
    if (owned[item.id]) {
      return false;
    }
    if (preferRare) {
      return item.rare === true;
    }
    return item.rare !== true;
  });
  if (pool.length === 0) {
    return null;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function addFind(excitement, findId) {
  if (!findId || excitement.finds.indexOf(findId) !== -1) {
    return { excitement: excitement, added: false };
  }
  return {
    excitement: Object.assign({}, excitement, {
      finds: excitement.finds.concat([findId]),
    }),
    added: true,
  };
}

function collectionProgress(excitement) {
  return {
    owned: excitement.finds.length,
    total: FINDABLES.length,
    finds: excitement.finds.slice(),
  };
}

function canBark(excitement, nowMs) {
  if (!excitement.lastBarkAt) {
    return true;
  }
  return nowMs - excitement.lastBarkAt >= 15 * 60 * 1000;
}

function markBark(excitement, nowMs) {
  return Object.assign({}, excitement, { lastBarkAt: nowMs });
}

function canRareEvent(excitement, nowMs) {
  if (excitement.raresToday.count >= 2) {
    return false;
  }
  if (excitement.lastRareAt && nowMs - excitement.lastRareAt < 3 * 60 * 60 * 1000) {
    return false;
  }
  return true;
}

function canUltraRare(excitement, nowMs) {
  if (excitement.lastUltraAt && nowMs - excitement.lastUltraAt < 7 * 24 * 60 * 60 * 1000) {
    return false;
  }
  return true;
}

function rollEvent(excitement, nowMs) {
  if (canUltraRare(excitement, nowMs) && Math.random() < 0.002) {
    const event = ULTRA_RARE_EVENTS[Math.floor(Math.random() * ULTRA_RARE_EVENTS.length)];
    return {
      kind: 'ultra',
      event: event,
      excitement: Object.assign({}, excitement, {
        lastUltraAt: nowMs,
        raresToday: {
          date: excitement.raresToday.date,
          count: excitement.raresToday.count + 1,
        },
      }),
    };
  }
  if (canRareEvent(excitement, nowMs) && Math.random() < 0.02) {
    const event = RARE_EVENTS[Math.floor(Math.random() * RARE_EVENTS.length)];
    return {
      kind: 'rare',
      event: event,
      excitement: Object.assign({}, excitement, {
        lastRareAt: nowMs,
        raresToday: {
          date: excitement.raresToday.date,
          count: excitement.raresToday.count + 1,
        },
      }),
    };
  }
  return null;
}

function deriveMood(excitement, hour) {
  if (excitement.ignoredFoodRequest) {
    return MOOD_SNACK;
  }
  if (excitement.fetchStreak > 0 || excitement.squeakCount > 0) {
    return MOOD_PLAYFUL;
  }
  if (hour >= 22 || hour < 7) {
    return MOOD_RELAXED;
  }
  if (hour >= 9 && hour <= 17) {
    return MOOD_CURIOUS;
  }
  return MOOD_PLAYFUL;
}

function rememberAction(excitement, action, detail) {
  const memory = Object.assign({}, excitement.memory);
  const actionCounts = Object.assign({}, memory.actionCounts);
  actionCounts[action] = (actionCounts[action] || 0) + 1;
  memory.actionCounts = actionCounts;
  memory.preferredAction = Object.keys(actionCounts).sort(function sortActions(a, b) {
    return actionCounts[b] - actionCounts[a];
  })[0];

  if (action === ACTION_FEED && detail) {
    const foodCounts = Object.assign({}, memory.foodCounts);
    foodCounts[detail] = (foodCounts[detail] || 0) + 1;
    memory.foodCounts = foodCounts;
    memory.favouriteFood = Object.keys(foodCounts).sort(function sortFood(a, b) {
      return foodCounts[b] - foodCounts[a];
    })[0];
  }
  if (action === ACTION_FETCH || action === ACTION_SQUEAK) {
    memory.favouriteToy = action === ACTION_SQUEAK ? 'squeak' : 'ball';
  }
  if (action === ACTION_WALKIES && detail === 'accept') {
    memory.walkiesAccepted += 1;
  }
  if (action === ACTION_WALKIES && detail === 'decline') {
    memory.walkiesDeclined += 1;
  }
  return Object.assign({}, excitement, { memory: memory });
}

function rememberCorner(excitement, x) {
  return Object.assign({}, excitement, {
    memory: Object.assign({}, excitement.memory, { lastCornerX: x }),
  });
}

function memoryLine(excitement, dogName) {
  const memory = excitement.memory;
  if (memory.favouriteToy === 'ball' && (memory.actionCounts[ACTION_FETCH] || 0) >= 3) {
    return SPEECH_FUN.memoryBall[0];
  }
  if (memory.favouriteFood === 'carrot' && (memory.foodCounts.carrot || 0) >= 2) {
    return SPEECH_FUN.memoryCarrot[0];
  }
  if (typeof memory.lastCornerX === 'number') {
    return SPEECH_FUN.memoryCorner[0];
  }
  if (memory.walkiesAccepted >= 2) {
    return SPEECH_FUN.memoryBreak[0].replace('{name}', dogName || 'Biscuit');
  }
  return null;
}

function wakeReaction(personality) {
  const pool = {
    [PERSONALITY_CALM]: ['Oh. Hello.', 'Soft reboot complete.'],
    [PERSONALITY_PLAYFUL]: ['I was practising sleep-fetch.', 'Boop-ready.'],
    [PERSONALITY_GOOFY]: ['I invented gravity. Briefly.', 'Who turned the lights on in my face?'],
    [PERSONALITY_DRAMATIC]: ['I have returned from the void.', 'The nap was cinema.'],
  };
  const lines = pool[personality] || pool[PERSONALITY_GOOFY];
  return lines[Math.floor(Math.random() * lines.length)];
}

function funSpeech(kind, nowMs, dogName) {
  const lines = SPEECH_FUN[kind] || SPEECH_FUN.play;
  const index = Math.abs(Math.floor(nowMs / 45000) + kind.length) % lines.length;
  return String(lines[index]).replace(/\{name\}/g, dogName || 'Biscuit');
}

function findById(findId) {
  for (let index = 0; index < FINDABLES.length; index += 1) {
    if (FINDABLES[index].id === findId) {
      return FINDABLES[index];
    }
  }
  return null;
}

const excitementApi = {
  MOOD_RELAXED,
  MOOD_PLAYFUL,
  MOOD_CURIOUS,
  MOOD_SNACK,
  PERSONALITY_CALM,
  PERSONALITY_PLAYFUL,
  PERSONALITY_GOOFY,
  PERSONALITY_DRAMATIC,
  ACTION_PET,
  ACTION_BOOP,
  ACTION_BELLY,
  ACTION_FEED,
  ACTION_WATER,
  ACTION_FETCH,
  ACTION_SQUEAK,
  ACTION_WALKIES,
  ACTION_WAKE,
  ACTION_IGNORE_FOOD,
  FINDABLES,
  RARE_EVENTS,
  ULTRA_RARE_EVENTS,
  COMBO_TABLE,
  SPEECH_FUN,
  createDefaultMemory,
  createDefaultExcitement,
  validateExcitement,
  pushRecentAction,
  matchCombo,
  pickFind,
  addFind,
  collectionProgress,
  canBark,
  markBark,
  canRareEvent,
  canUltraRare,
  rollEvent,
  deriveMood,
  rememberAction,
  rememberCorner,
  memoryLine,
  wakeReaction,
  funSpeech,
  findById,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = excitementApi;
}

if (typeof globalThis !== 'undefined') {
  Object.keys(excitementApi).forEach(function assign(key) {
    globalThis[key] = excitementApi[key];
  });
}
