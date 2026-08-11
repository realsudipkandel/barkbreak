'use strict';

let latestState = null;

function send(type, payload) {
  return new Promise(function sendPromise(resolve) {
    chrome.runtime.sendMessage(Object.assign({ type: type }, payload || {}), function onResponse(response) {
      resolve(response || { ok: false, error: 'No response' });
    });
  });
}

function renderSites(state) {
  const list = document.getElementById('site-list');
  list.innerHTML = '';
  const origins = Object.keys(state.guardedSites || {});
  if (origins.length === 0) {
    list.innerHTML = '<p class="muted">No guarded sites yet.</p>';
    return;
  }
  origins.forEach(function renderOrigin(origin) {
    const site = state.guardedSites[origin];
    const row = document.createElement('div');
    row.className = 'card';
    row.innerHTML = `
      <p class="metric"><span>${origin}</span><span>${Math.round(site.dailyBudgetSeconds / 60)} min</span></p>
    `;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn ghost';
    remove.textContent = 'Remove';
    remove.setAttribute('data-testid', `remove-${hostnameFromOrigin(origin)}`);
    remove.addEventListener('click', function onRemove() {
      send(MESSAGE.UNGUARD_SITE, { origin: origin }).then(function onUnguarded(response) {
        if (response.state) {
          latestState = response.state;
          fillForm(response.state);
        }
      });
    });
    row.appendChild(remove);
    list.appendChild(row);
  });
}

function fillForm(state) {
  document.getElementById('mode').value = state.settings.mode;
  document.getElementById('break-minutes').value = String(state.settings.defaultBreakMinutes);
  document.getElementById('budget-minutes').value = String(
    Math.round(state.settings.defaultBudgetSeconds / 60),
  );
  document.getElementById('quiet-enabled').checked = state.settings.quietHours.enabled === true;
  document.getElementById('quiet-start').value = state.settings.quietHours.start;
  document.getElementById('quiet-end').value = state.settings.quietHours.end;
  document.getElementById('motion').value = state.settings.motion;
  document.getElementById('simple-copy').checked = state.settings.simpleCopy === true;
  document.getElementById('high-contrast').checked = state.settings.highContrast === true;
  document.getElementById('sound').checked = state.settings.sound === true;
  document.getElementById('text-scale').value = String(state.settings.textScale || 100);
  document.getElementById('pet-name').value = state.pet.name;
  document.getElementById('personality').value = state.pet.personality;
  document.body.style.setProperty('--bb-text-scale', `${state.settings.textScale || 100}%`);
  document.body.classList.toggle('high-contrast', state.settings.highContrast === true);
  renderSites(state);
}

function collectSettings() {
  return {
    mode: document.getElementById('mode').value,
    defaultBreakMinutes: Number(document.getElementById('break-minutes').value),
    defaultBudgetSeconds: Number(document.getElementById('budget-minutes').value) * 60,
    quietHours: {
      enabled: document.getElementById('quiet-enabled').checked,
      start: document.getElementById('quiet-start').value || '22:00',
      end: document.getElementById('quiet-end').value || '08:00',
    },
    motion: document.getElementById('motion').value,
    simpleCopy: document.getElementById('simple-copy').checked,
    highContrast: document.getElementById('high-contrast').checked,
    sound: document.getElementById('sound').checked,
    textScale: Number(document.getElementById('text-scale').value),
  };
}

function collectPet() {
  return {
    name: document.getElementById('pet-name').value.trim() || 'Biscuit',
    personality: document.getElementById('personality').value,
  };
}

function downloadExport(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `barkbreak-export-${getLocalDateString(Date.now())}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function bindOptions() {
  document.getElementById('save-settings').addEventListener('click', function onSave() {
    Promise.all([
      send(MESSAGE.UPDATE_SETTINGS, { settings: collectSettings() }),
      send(MESSAGE.UPDATE_PET, { pet: collectPet() }),
    ]).then(function onSaved(results) {
      const response = results[1] && results[1].state ? results[1] : results[0];
      document.getElementById('save-message').textContent = response.ok ? 'Saved' : 'Try again';
      if (response.state) {
        latestState = response.state;
        fillForm(response.state);
      }
    });
  });

  document.getElementById('add-site').addEventListener('click', function onAdd() {
    const raw = document.getElementById('add-domain').value.trim();
    const origin =
      raw.startsWith('http://') || raw.startsWith('https://')
        ? originFromUrl(raw)
        : originFromUrl(`https://${raw}`);
    if (!origin) {
      document.getElementById('site-message').textContent = 'Enter a valid domain.';
      return;
    }
    const pattern = originPermissionPattern(origin);
    chrome.permissions.request({ origins: [pattern] }, function onPermission(granted) {
      if (chrome.runtime.lastError) {
        document.getElementById('site-message').textContent = chrome.runtime.lastError.message;
        return;
      }
      if (!granted) {
        document.getElementById('site-message').textContent = 'Permission declined';
        return;
      }
      send(MESSAGE.GUARD_SITE, {
        origin: origin,
        permissionGranted: true,
        siteConfig: {
          dailyBudgetSeconds: Number(document.getElementById('budget-minutes').value) * 60,
          breakSeconds: Number(document.getElementById('break-minutes').value) * 60,
          enabled: true,
        },
      }).then(function onGuarded(response) {
        document.getElementById('site-message').textContent = response.ok
          ? 'Guarded'
          : response.error || 'Could not guard site';
        if (response.state) {
          latestState = response.state;
          fillForm(response.state);
          document.getElementById('add-domain').value = '';
        }
      });
    });
  });

  document.getElementById('export-data').addEventListener('click', function onExport() {
    send(MESSAGE.EXPORT_STATE).then(function onExportResult(response) {
      if (response.ok && response.export) {
        downloadExport(response.export);
        document.getElementById('privacy-message').textContent = 'Exported';
      }
    });
  });

  document.getElementById('clear-today').addEventListener('click', function onClearToday() {
    send(MESSAGE.CLEAR_TODAY).then(function onCleared(response) {
      document.getElementById('privacy-message').textContent = 'Cleared today';
      if (response.state) {
        fillForm(response.state);
      }
    });
  });

  document.getElementById('clear-progress').addEventListener('click', function onClearProgress() {
    send(MESSAGE.CLEAR_PROGRESS).then(function onCleared(response) {
      document.getElementById('privacy-message').textContent = 'Progress cleared';
      if (response.state) {
        fillForm(response.state);
      }
    });
  });

  document.getElementById('reset-all').addEventListener('click', function onReset() {
    const confirmed = window.confirm('Erase dog, sites, and progress? This cannot be undone.');
    if (!confirmed) {
      return;
    }
    send(MESSAGE.RESET_ALL).then(function onResetResult(response) {
      document.getElementById('privacy-message').textContent = 'Everything erased';
      if (response.state) {
        fillForm(response.state);
      }
      window.location.href = chrome.runtime.getURL('onboarding.html');
    });
  });

  document.querySelectorAll('[data-pause]').forEach(function bindPause(button) {
    button.addEventListener('click', function onPause() {
      send(MESSAGE.GLOBAL_PAUSE, {
        durationMs: Number(button.getAttribute('data-pause')),
      }).then(function onPaused() {
        document.getElementById('save-message').textContent = 'Paused';
      });
    });
  });

  document.getElementById('clear-pause').addEventListener('click', function onClearPause() {
    send(MESSAGE.CLEAR_PAUSE).then(function onResumed() {
      document.getElementById('save-message').textContent = 'Resumed';
    });
  });
}

send(MESSAGE.GET_STATE).then(function onLoad(response) {
  if (response.state) {
    latestState = response.state;
    fillForm(response.state);
  }
  bindOptions();
});
