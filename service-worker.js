'use strict';

importScripts('shared.js');

async function readState() {
  const result = await chrome.storage.local.get([STORAGE_KEY_STATE]);
  const nowMs = Date.now();
  let state = validateState(result[STORAGE_KEY_STATE], nowMs);
  const resolved = resolveExpiredSession(state, nowMs);
  state = ensureTodayAggregate(resolved.state, nowMs);
  if (resolved.completed || result[STORAGE_KEY_STATE] === undefined) {
    await writeState(state);
  }
  return state;
}

async function writeState(state) {
  await chrome.storage.local.set({
    [STORAGE_KEY_STATE]: validateState(state, Date.now()),
  });
}

async function clearAlarm(name) {
  await chrome.alarms.clear(name);
}

async function scheduleAlarm(name, endsAt) {
  await clearAlarm(name);
  if (typeof endsAt === 'number' && endsAt > Date.now()) {
    await chrome.alarms.create(name, { when: endsAt });
  }
}

async function syncSessionAlarms(state) {
  await clearAlarm(ALARM_BREAK);
  await clearAlarm(ALARM_FOCUS);
  await clearAlarm(ALARM_URGENT);
  if (!state.activeSession || typeof state.activeSession.endsAt !== 'number') {
    return;
  }
  if (state.activeSession.type === SESSION_BREAK) {
    await scheduleAlarm(ALARM_BREAK, state.activeSession.endsAt);
  } else if (state.activeSession.type === SESSION_FOCUS) {
    await scheduleAlarm(ALARM_FOCUS, state.activeSession.endsAt);
  } else if (state.activeSession.type === SESSION_URGENT) {
    await scheduleAlarm(ALARM_URGENT, state.activeSession.endsAt);
  }
}

function badgeForState(state, nowMs) {
  const status = getDutyStatus(state, nowMs);
  if (status === STATUS_FOCUS) {
    return { text: ' ', color: '#B9DDF2', title: 'Focus Fetch active' };
  }
  if (status === STATUS_ON_BREAK) {
    return { text: ' ', color: '#2A8C82', title: 'On break' };
  }
  if (state.activeSession && state.activeSession.type === SESSION_URGENT) {
    return { text: ' ', color: '#E7AE32', title: 'Urgent pass active' };
  }
  return { text: '', color: '#18324A', title: `${state.pet.name} is on duty.` };
}

async function updateBadge(state) {
  const nowMs = Date.now();
  const badge = badgeForState(state, nowMs);
  await chrome.action.setBadgeText({ text: badge.text });
  if (badge.text) {
    await chrome.action.setBadgeBackgroundColor({ color: badge.color });
  }
  await chrome.action.setTitle({ title: badge.title });
}

async function registerContentScriptForOrigin(origin) {
  const pattern = originPermissionPattern(origin);
  if (!pattern) {
    return false;
  }
  try {
    const existing = await chrome.scripting.getRegisteredContentScripts({
      ids: [CONTENT_SCRIPT_ID],
    });
    const matches = existing[0] && Array.isArray(existing[0].matches) ? existing[0].matches.slice() : [];
    if (matches.indexOf(pattern) === -1) {
      matches.push(pattern);
    }
    if (existing.length > 0) {
      await chrome.scripting.updateContentScripts([
        {
          id: CONTENT_SCRIPT_ID,
          matches: matches,
          js: ['shared.js', 'content.js'],
          runAt: 'document_idle',
        },
      ]);
    } else {
      await chrome.scripting.registerContentScripts([
        {
          id: CONTENT_SCRIPT_ID,
          matches: matches,
          js: ['shared.js', 'content.js'],
          runAt: 'document_idle',
          persistAcrossSessions: true,
        },
      ]);
    }
    return true;
  } catch (error) {
    console.error('barkbreak registerContentScript failed', origin, error);
    return false;
  }
}

async function unregisterOriginFromContentScripts(origin) {
  const pattern = originPermissionPattern(origin);
  try {
    const existing = await chrome.scripting.getRegisteredContentScripts({
      ids: [CONTENT_SCRIPT_ID],
    });
    if (!existing[0]) {
      return;
    }
    const matches = (existing[0].matches || []).filter(function keep(match) {
      return match !== pattern;
    });
    if (matches.length === 0) {
      await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
      return;
    }
    await chrome.scripting.updateContentScripts([
      {
        id: CONTENT_SCRIPT_ID,
        matches: matches,
        js: ['shared.js', 'content.js'],
        runAt: 'document_idle',
      },
    ]);
  } catch (_error) {
    // Permission may already be gone.
  }
}

async function ensureOriginAccess(origin, permissionGrantedInUi) {
  const pattern = originPermissionPattern(origin);
  if (!pattern) {
    return { ok: false, error: 'Invalid origin.' };
  }
  const already = await chrome.permissions.contains({ origins: [pattern] });
  if (already) {
    return { ok: true };
  }
  // Prefer UI-initiated chrome.permissions.request (keeps the user gesture).
  if (permissionGrantedInUi === true) {
    return { ok: false, error: 'Site permission missing. Allow access from the page and try again.' };
  }
  try {
    const granted = await chrome.permissions.request({ origins: [pattern] });
    if (!granted) {
      return { ok: false, error: 'Permission declined.' };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error && error.message
          ? error.message
          : 'Permission request failed. Allow site access from onboarding or settings.',
    };
  }
}

async function requestAndGuardOrigin(origin, siteConfig, permissionGrantedInUi) {
  const access = await ensureOriginAccess(origin, permissionGrantedInUi);
  if (!access.ok) {
    return access;
  }
  const registered = await registerContentScriptForOrigin(origin);
  if (!registered) {
    return { ok: false, error: 'Could not register site script.' };
  }
  const state = await readState();
  const guardedSites = Object.assign({}, state.guardedSites);
  guardedSites[origin] = validateGuardedSite(siteConfig, {
    dailyBudgetSeconds: state.settings.defaultBudgetSeconds,
    breakSeconds: state.settings.defaultBreakMinutes * 60,
    enabled: true,
  });
  const next = Object.assign({}, state, { guardedSites: guardedSites });
  await writeState(next);
  await injectIntoMatchingTabs(origin);
  return { ok: true, state: next };
}

async function injectIntoMatchingTabs(origin) {
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
          files: ['shared.js', 'content.js'],
        });
      } catch (_error) {
        // Tab may be restricted.
      }
    }
  } catch (_error) {
    // Query may fail without permission.
  }
}

async function broadcastGateToHostname(hostname, payload) {
  const tabs = await chrome.tabs.query({});
  for (let index = 0; index < tabs.length; index += 1) {
    const tab = tabs[index];
    if (typeof tab.id !== 'number' || !tab.url) {
      continue;
    }
    if (isRestrictedUrl(tab.url)) {
      continue;
    }
    const origin = originFromUrl(tab.url);
    if (!origin) {
      continue;
    }
    const tabHost = hostnameFromOrigin(origin);
    if (
      tabHost !== hostname &&
      !tabHost.endsWith(`.${hostname}`) &&
      !hostname.endsWith(`.${tabHost}`)
    ) {
      continue;
    }
    try {
      await chrome.tabs.sendMessage(tab.id, payload);
    } catch (_error) {
      // Content script may not be ready.
    }
  }
}

async function maybeNotify(title, message, state) {
  if (!state.settings.notifications) {
    return;
  }
  try {
    const hasPermission = await chrome.permissions.contains({ permissions: ['notifications'] });
    if (!hasPermission) {
      return;
    }
    await chrome.notifications.create(`barkbreak-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: title,
      message: message,
      priority: 0,
    });
  } catch (_error) {
    // Notifications optional.
  }
}

function buildPublicState(state) {
  const nowMs = Date.now();
  return {
    state: state,
    status: getDutyStatus(state, nowMs),
    bondLevel: getBondLevel(state.pet.bond),
    scrapbook: buildScrapbookSummary(state, nowMs),
    copy: getCopy(state.settings, state.pet),
    awayPrompt: pickAwayPrompt(nowMs),
    nowMs: nowMs,
  };
}

async function handleMessage(message, sender) {
  if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
    return { ok: false, error: 'Invalid message.' };
  }

  const type = message.type;
  let state = await readState();
  const nowMs = Date.now();

  if (type === MESSAGE.GET_STATE) {
    return { ok: true, ...buildPublicState(state) };
  }

  if (type === MESSAGE.COMPLETE_ONBOARDING) {
    const settings = validateSettings(
      Object.assign({}, state.settings, message.settings || {}, { onboardingComplete: true }),
    );
    const pet = validatePet(Object.assign({}, state.pet, message.pet || {}));
    state = Object.assign({}, state, { settings: settings, pet: pet });
    if (message.firstOrigin) {
      const guardResult = await requestAndGuardOrigin(
        message.firstOrigin,
        message.siteConfig,
        message.permissionGranted === true,
      );
      if (!guardResult.ok) {
        await writeState(state);
        return { ok: false, error: guardResult.error, ...buildPublicState(state) };
      }
      state = guardResult.state;
      state = Object.assign({}, state, { settings: settings, pet: pet });
    }
    await writeState(state);
    await updateBadge(state);
    return { ok: true, ...buildPublicState(state) };
  }

  if (type === MESSAGE.UPDATE_SETTINGS) {
    state = Object.assign({}, state, {
      settings: validateSettings(Object.assign({}, state.settings, message.settings || {})),
    });
    await writeState(state);
    await updateBadge(state);
    return { ok: true, ...buildPublicState(state) };
  }

  if (type === MESSAGE.UPDATE_PET) {
    state = Object.assign({}, state, {
      pet: validatePet(Object.assign({}, state.pet, message.pet || {})),
    });
    await writeState(state);
    return { ok: true, ...buildPublicState(state) };
  }

  if (type === MESSAGE.GUARD_SITE) {
    const result = await requestAndGuardOrigin(
      message.origin,
      message.siteConfig,
      message.permissionGranted === true,
    );
    if (!result.ok) {
      return { ok: false, error: result.error, ...buildPublicState(state) };
    }
    await updateBadge(result.state);
    return { ok: true, ...buildPublicState(result.state) };
  }

  if (type === MESSAGE.UNGUARD_SITE) {
    const origin = message.origin;
    const guardedSites = Object.assign({}, state.guardedSites);
    delete guardedSites[origin];
    state = Object.assign({}, state, { guardedSites: guardedSites });
    await writeState(state);
    await unregisterOriginFromContentScripts(origin);
    try {
      await chrome.permissions.remove({ origins: [originPermissionPattern(origin)] });
    } catch (_error) {
      // Ignore.
    }
    return { ok: true, ...buildPublicState(state) };
  }

  if (type === MESSAGE.ENGAGED_DELTA) {
    const hostname = normalizeHostname(message.hostname);
    const delta = clampInteger(message.deltaSeconds, 0, 120, 0);
    if (!hostname || delta <= 0) {
      return { ok: false, error: 'Bad delta.' };
    }
    if (state.activeSession && state.activeSession.type === SESSION_FOCUS) {
      const session = Object.assign({}, state.activeSession);
      session.activeMs = clampInteger((session.activeMs || 0) + delta * 1000, 0, 3600000, 0);
      state = Object.assign({}, state, { activeSession: session });
    }
    const result = applyEngagedDelta(state, hostname, delta, nowMs);
    state = result.state;
    await writeState(state);
    if (result.shouldGate) {
      await chrome.action.setBadgeBackgroundColor({ color: '#EF6A5B' });
      await chrome.action.setBadgeText({ text: ' ' });
      await broadcastGateToHostname(hostname, {
        type: MESSAGE.GATE_STATUS,
        mode: 'gate',
        view: buildGateViewModel(state, hostname, nowMs),
      });
    } else if (result.shouldWarn) {
      await chrome.action.setBadgeBackgroundColor({ color: '#E7AE32' });
      await chrome.action.setBadgeText({ text: ' ' });
      await broadcastGateToHostname(hostname, {
        type: MESSAGE.GATE_STATUS,
        mode: 'warn',
        view: buildGateViewModel(state, hostname, nowMs),
        remainingSeconds: result.remainingSeconds,
      });
    }
    return {
      ok: true,
      remainingSeconds: result.remainingSeconds,
      shouldWarn: result.shouldWarn,
      shouldGate: result.shouldGate,
      ...buildPublicState(state),
    };
  }

  if (type === MESSAGE.START_BREAK) {
    const minutes = message.minutes;
    state = startBreakSession(state, minutes, message.origin || null, nowMs);
    await writeState(state);
    await syncSessionAlarms(state);
    await updateBadge(state);
    const breakUrl = chrome.runtime.getURL(
      `break.html?minutes=${state.activeSession.minutes}&session=${state.activeSession.sessionId}`,
    );
    await chrome.tabs.create({ url: breakUrl });
    return { ok: true, ...buildPublicState(state) };
  }

  if (type === MESSAGE.END_BREAK) {
    const result = completeBreakSession(state, message.early === true, nowMs);
    state = result.state;
    await writeState(state);
    await syncSessionAlarms(state);
    await updateBadge(state);
    await maybeNotify('Break complete', 'Welcome back.', state);
    return { ok: true, reward: result.reward, ...buildPublicState(state) };
  }

  if (type === MESSAGE.START_FOCUS) {
    state = startFocusSession(state, message.minutes, nowMs);
    await writeState(state);
    await syncSessionAlarms(state);
    await updateBadge(state);
    return { ok: true, ...buildPublicState(state) };
  }

  if (type === MESSAGE.END_FOCUS) {
    const result = completeFocusSession(state, nowMs);
    state = result.state;
    await writeState(state);
    await syncSessionAlarms(state);
    await updateBadge(state);
    await maybeNotify('Focus complete', 'Fetch done. Nice work.', state);
    return { ok: true, reward: result.reward, ...buildPublicState(state) };
  }

  if (type === MESSAGE.URGENT_PASS) {
    const origin =
      message.origin ||
      (sender.tab && sender.tab.url ? originFromUrl(sender.tab.url) : null);
    const result = applyUrgentPass(state, origin, nowMs, message.note);
    state = result.state;
    await writeState(state);
    await syncSessionAlarms(state);
    await updateBadge(state);
    if (sender.tab && typeof sender.tab.id === 'number') {
      try {
        await chrome.tabs.sendMessage(sender.tab.id, {
          type: MESSAGE.GATE_STATUS,
          mode: 'clear',
        });
      } catch (_error) {
        // Ignore.
      }
    }
    return {
      ok: true,
      needsIntention: result.needsIntention,
      endsAt: result.endsAt,
      ...buildPublicState(state),
    };
  }

  if (type === MESSAGE.GLOBAL_PAUSE) {
    state = applyGlobalPause(state, message.durationMs, nowMs);
    await writeState(state);
    await syncSessionAlarms(state);
    await updateBadge(state);
    return { ok: true, ...buildPublicState(state) };
  }

  if (type === MESSAGE.CLEAR_PAUSE) {
    state = Object.assign({}, state, { globalPauseUntil: null });
    await writeState(state);
    await updateBadge(state);
    return { ok: true, ...buildPublicState(state) };
  }

  if (type === MESSAGE.CARE_ACTION) {
    const result = applyCareAction(state, message.action, nowMs);
    state = result.state;
    await writeState(state);
    return {
      ok: result.ok,
      message: result.message,
      bondGain: result.bondGain,
      disclaimer: result.disclaimer,
      ...buildPublicState(state),
    };
  }

  if (type === MESSAGE.BUY_ITEM) {
    const result = buyItem(state, message.itemId, nowMs);
    state = result.state;
    await writeState(state);
    return { ok: result.ok, message: result.message, ...buildPublicState(state) };
  }

  if (type === MESSAGE.REFRESH_CHECKIN) {
    state = applyRefreshCheckin(state, message.feeling, nowMs);
    await writeState(state);
    return { ok: true, ...buildPublicState(state) };
  }

  if (type === MESSAGE.CLEAR_TODAY) {
    state = clearTodayProgress(state, nowMs);
    await writeState(state);
    return { ok: true, ...buildPublicState(state) };
  }

  if (type === MESSAGE.CLEAR_PROGRESS) {
    state = clearAllProgress(state, nowMs);
    await writeState(state);
    return { ok: true, ...buildPublicState(state) };
  }

  if (type === MESSAGE.RESET_ALL) {
    state = resetAllState(nowMs);
    await writeState(state);
    await syncSessionAlarms(state);
    await updateBadge(state);
    try {
      await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
    } catch (_error) {
      // Ignore.
    }
    return { ok: true, ...buildPublicState(state) };
  }

  if (type === MESSAGE.EXPORT_STATE) {
    return { ok: true, export: buildExportPayload(state) };
  }

  if (type === MESSAGE.CLOSE_TAB) {
    if (sender.tab && typeof sender.tab.id === 'number') {
      await chrome.tabs.remove(sender.tab.id);
    }
    return { ok: true };
  }

  return { ok: false, error: `Unknown message: ${type}` };
}

async function bootstrapInstall(details) {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  const state = await readState();
  await writeState(state);
  await updateBadge(state);
  if (details.reason === 'install' && !state.settings.onboardingComplete) {
    await chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
  }
}

async function restoreOnStartup() {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  const state = await readState();
  await syncSessionAlarms(state);
  await updateBadge(state);
}

async function handleAlarmTick() {
  let state = await readState();
  const resolved = resolveExpiredSession(state, Date.now());
  state = resolved.state;
  await writeState(state);
  await syncSessionAlarms(state);
  await updateBadge(state);
  if (resolved.completed && resolved.completed.type === SESSION_BREAK) {
    await maybeNotify('Break complete', 'Welcome back.', state);
  }
  if (resolved.completed && resolved.completed.type === SESSION_FOCUS) {
    await maybeNotify('Focus complete', 'Fetch done.', state);
  }
}

chrome.runtime.onInstalled.addListener(function onInstalled(details) {
  bootstrapInstall(details).catch(function onInstallError() {
    // Install bootstrap is best-effort.
  });
});

chrome.runtime.onStartup.addListener(function onStartup() {
  restoreOnStartup().catch(function onStartupError() {
    // Startup restore is best-effort.
  });
});

chrome.action.onClicked.addListener(function onActionClicked(tab) {
  if (typeof tab.id !== 'number') {
    chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') }).catch(function onTabError() {
      // Ignore.
    });
    return;
  }
  chrome.sidePanel
    .open({ tabId: tab.id })
    .catch(function onOpenError() {
      chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') }).catch(function onTabError() {
        // Ignore.
      });
    });
});

chrome.alarms.onAlarm.addListener(function onAlarm() {
  handleAlarmTick().catch(function onAlarmError() {
    // Alarm completion is retried on next read.
  });
});

chrome.runtime.onMessage.addListener(function onMessage(message, sender, sendResponse) {
  handleMessage(message, sender)
    .then(function onSuccess(response) {
      sendResponse(response);
    })
    .catch(function onError(error) {
      sendResponse({
        ok: false,
        error: error && error.message ? error.message : 'Unexpected error.',
      });
    });
  return true;
});
