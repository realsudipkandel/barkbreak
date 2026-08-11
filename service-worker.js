'use strict';

importScripts('shared.js', 'excitement.js');

async function readState() {
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  return validateState(result[STORAGE_KEY], Date.now());
}

async function writeState(state) {
  await chrome.storage.local.set({
    [STORAGE_KEY]: validateState(state, Date.now()),
  });
}

async function registerAllScripts(state) {
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] }).catch(
      function ignore() {
        return undefined;
      },
    );
  } catch (_error) {
    // Ignore.
  }

  let matches = [];
  if (state.settings.scope === SCOPE_ALL) {
    matches = ['http://*/*', 'https://*/*'];
  } else {
    matches = state.sites
      .map(originPermissionPattern)
      .filter(function keep(pattern) {
        return Boolean(pattern);
      });
  }
  if (matches.length === 0) {
    return;
  }
  await chrome.scripting.registerContentScripts([
    {
      id: CONTENT_SCRIPT_ID,
      matches: matches,
          js: ['shared.js', 'excitement.js', 'sounds.js', 'content.js'],
      runAt: 'document_idle',
      persistAcrossSessions: true,
    },
  ]);
}

async function injectIntoOrigin(origin) {
  const pattern = originPermissionPattern(origin);
  try {
    const tabs = await chrome.tabs.query({ url: pattern });
    for (let index = 0; index < tabs.length; index += 1) {
      const tab = tabs[index];
      if (typeof tab.id !== 'number') {
        continue;
      }
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['shared.js', 'excitement.js', 'sounds.js', 'content.js'],
        });
      } catch (_error) {
        // Restricted tab.
      }
    }
  } catch (_error) {
    // No permission yet.
  }
}

async function handleMessage(message) {
  if (!message || typeof message.type !== 'string') {
    return { ok: false, error: 'Invalid message.' };
  }
  let state = await readState();
  const nowMs = Date.now();

  if (message.type === MESSAGE.GET_STATE) {
    return { ok: true, state: state, nowMs: nowMs };
  }

  if (message.type === MESSAGE.SAVE_SETTINGS) {
    state = Object.assign({}, state, {
      settings: validateSettings(Object.assign({}, state.settings, message.settings || {})),
    });
    await writeState(state);
    await registerAllScripts(state);
    return { ok: true, state: state };
  }

  if (message.type === MESSAGE.COMPLETE_ONBOARDING) {
    state = Object.assign({}, state, {
      settings: validateSettings(
        Object.assign({}, state.settings, message.settings || {}, {
          onboardingComplete: true,
        }),
      ),
      sites: Array.isArray(message.sites) ? message.sites : state.sites,
    });
    await writeState(state);
    await registerAllScripts(state);
    if (state.sites[0]) {
      await injectIntoOrigin(state.sites[0]);
    }
    return { ok: true, state: state };
  }

  if (message.type === MESSAGE.TOGGLE_VISIBLE) {
    state.settings = Object.assign({}, state.settings, {
      visible: message.visible !== false,
    });
    await writeState(state);
    return { ok: true, state: state };
  }

  if (message.type === MESSAGE.PAUSE_HOUR) {
    state = Object.assign({}, state, { pauseUntil: nowMs + 60 * 60 * 1000 });
    await writeState(state);
    return { ok: true, state: state };
  }

  if (message.type === MESSAGE.CLEAR_PAUSE) {
    state = Object.assign({}, state, { pauseUntil: null });
    await writeState(state);
    return { ok: true, state: state };
  }

  if (message.type === MESSAGE.RESET_MOOD) {
    state = Object.assign({}, state, {
      fullUntil: null,
      lastFedAt: null,
      lastRequestAt: null,
      requestsToday: { date: getLocalDateString(nowMs), count: 0 },
      engagedMsToday: { date: getLocalDateString(nowMs), ms: 0 },
      breakEndsAt: null,
      excitement: Object.assign({}, state.excitement, {
        ignoredFoodRequest: false,
        fetchStreak: 0,
        squeakCount: 0,
        mood: MOOD_CURIOUS,
      }),
    });
    await writeState(state);
    return { ok: true, state: state };
  }

  if (message.type === MESSAGE.ADD_SITE) {
    const origin = message.origin;
    if (!origin) {
      return { ok: false, error: 'Missing origin.' };
    }
    if (state.sites.indexOf(origin) === -1) {
      state = Object.assign({}, state, { sites: state.sites.concat([origin]) });
    }
    await writeState(state);
    await registerAllScripts(state);
    await injectIntoOrigin(origin);
    return { ok: true, state: state };
  }

  if (message.type === MESSAGE.REMOVE_SITE) {
    state = Object.assign({}, state, {
      sites: state.sites.filter(function keep(site) {
        return site !== message.origin;
      }),
    });
    await writeState(state);
    await registerAllScripts(state);
    return { ok: true, state: state };
  }

  if (message.type === MESSAGE.RECORD_REQUEST) {
    state = recordRequest(state, nowMs);
    if (message.kind === REQUEST_BREAK) {
      state = Object.assign({}, state, {
        lastBreakOfferedDate: getLocalDateString(nowMs),
      });
    }
    await writeState(state);
    return { ok: true, state: state };
  }

  if (message.type === MESSAGE.START_BREAK) {
    const endsAt = nowMs + 2 * 60 * 1000;
    state = Object.assign({}, state, { breakEndsAt: endsAt });
    await writeState(state);
    await chrome.alarms.clear(ALARM_BREAK);
    await chrome.alarms.create(ALARM_BREAK, { when: endsAt });
    return { ok: true, state: state, endsAt: endsAt };
  }

  if (message.type === MESSAGE.END_BREAK) {
    const find = pickFind(state.excitement, false);
    let excitement = rememberAction(state.excitement, ACTION_WALKIES, 'accept');
    let findResult = { added: false, find: null };
    if (find) {
      const added = addFind(excitement, find.id);
      excitement = added.excitement;
      findResult = { added: added.added, find: find };
    }
    state = Object.assign({}, state, {
      breakEndsAt: null,
      excitement: excitement,
    });
    await writeState(state);
    await chrome.alarms.clear(ALARM_BREAK);
    return {
      ok: true,
      state: state,
      find: findResult.find,
      added: findResult.added,
      progress: collectionProgress(state.excitement),
    };
  }

  if (message.type === MESSAGE.SET_FULL) {
    const result = applyFeed(state, nowMs);
    await writeState(result.state);
    return { ok: result.ok, message: result.message, state: result.state };
  }

  if (message.type === MESSAGE.SAVE_EXCITEMENT) {
    state = Object.assign({}, state, {
      excitement: validateExcitement(message.excitement || state.excitement, nowMs),
    });
    await writeState(state);
    return { ok: true, state: state };
  }

  if (message.type === MESSAGE.RECORD_FIND) {
    const result = addFind(state.excitement, message.findId);
    state = Object.assign({}, state, { excitement: result.excitement });
    await writeState(state);
    const find = findById(message.findId);
    return {
      ok: true,
      added: result.added,
      find: find,
      state: state,
      progress: collectionProgress(state.excitement),
    };
  }

  if (message.type === MESSAGE.RECORD_ACTION) {
    let excitement = pushRecentAction(state.excitement, message.action);
    excitement = rememberAction(excitement, message.action, message.detail);
    if (typeof message.cornerX === 'number') {
      excitement = rememberCorner(excitement, message.cornerX);
    }
    if (message.action === ACTION_IGNORE_FOOD) {
      excitement = Object.assign({}, excitement, { ignoredFoodRequest: true });
    }
    if (message.action === ACTION_FEED) {
      excitement = Object.assign({}, excitement, { ignoredFoodRequest: false });
    }
    const hour = new Date(nowMs).getHours();
    excitement = Object.assign({}, excitement, {
      mood: deriveMood(excitement, hour),
    });
    if (message.bark === true && canBark(excitement, nowMs)) {
      excitement = markBark(excitement, nowMs);
    }
    const combo = matchCombo(excitement);
    state = Object.assign({}, state, { excitement: excitement });
    await writeState(state);
    return {
      ok: true,
      state: state,
      combo: combo,
      mood: excitement.mood,
      memoryLine: memoryLine(excitement, state.settings.dogName),
    };
  }

  if (message.type === 'ENGAGED_TICK') {
    state = addEngagedMs(state, clampInteger(message.ms, 0, 60000, 0), nowMs);
    await writeState(state);
    return {
      ok: true,
      state: state,
      canRequest: canOfferAttention(state, nowMs),
      canBreak: canOfferBreak(state, nowMs),
    };
  }

  return { ok: false, error: `Unknown: ${message.type}` };
}

async function bootInstall(details) {
  const state = await readState();
  await writeState(state);
  await registerAllScripts(state);
  if (details.reason === 'install' && !state.settings.onboardingComplete) {
    await chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
  }
}

async function bootStartup() {
  const state = await readState();
  await registerAllScripts(state);
}

async function clearBreakAlarm() {
  const state = await readState();
  const next = Object.assign({}, state, { breakEndsAt: null });
  await writeState(next);
}

chrome.runtime.onInstalled.addListener(function onInstalled(details) {
  bootInstall(details).catch(function onInstallError() {
    return undefined;
  });
});

chrome.runtime.onStartup.addListener(function onStartup() {
  bootStartup().catch(function onStartupError() {
    return undefined;
  });
});

chrome.alarms.onAlarm.addListener(function onAlarm(alarm) {
  if (alarm.name !== ALARM_BREAK) {
    return;
  }
  clearBreakAlarm().catch(function onAlarmError() {
    return undefined;
  });
});

chrome.runtime.onMessage.addListener(function onMessage(message, _sender, sendResponse) {
  handleMessage(message)
    .then(function ok(response) {
      sendResponse(response);
    })
    .catch(function fail(error) {
      sendResponse({
        ok: false,
        error: error && error.message ? error.message : 'Error',
      });
    });
  return true;
});
