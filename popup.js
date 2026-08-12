'use strict';

let selectedDogType = DOG_BLACK_CAT;

function send(type, payload) {
  return new Promise(function resolveSend(resolve) {
    chrome.runtime.sendMessage(Object.assign({ type: type }, payload || {}), function onResp(resp) {
      resolve(resp || { ok: false });
    });
  });
}

function moodLabel(mood) {
  if (mood === MOOD_RELAXED) {
    return 'Relaxed';
  }
  if (mood === MOOD_PLAYFUL) {
    return 'Playful';
  }
  if (mood === MOOD_SNACK) {
    return 'Snack-minded';
  }
  return 'Curious';
}

function renderCollection(state) {
  const progress = collectionProgress(state.excitement || createDefaultExcitement(Date.now()));
  const name = state.settings.dogName || 'Kabs';
  document.getElementById('collection-title').textContent =
    `${name}’s Important Possessions: ${progress.owned}/${progress.total}`;
  if (progress.owned === 0) {
    document.getElementById('collection-list').textContent =
      'Nothing found yet. Try walkies or wait for a rare surprise.';
  } else {
    const names = progress.finds
      .map(function mapFind(id) {
        const item = findById(id);
        return item ? item.name : id;
      })
      .join(' · ');
    document.getElementById('collection-list').textContent = names;
  }
  document.getElementById('mood-line').textContent =
    `Mood: ${moodLabel((state.excitement && state.excitement.mood) || MOOD_CURIOUS)}`;
}

function renderDogTypes(selectedId) {
  const grid = document.getElementById('dog-type-grid');
  grid.innerHTML = '';
  DOG_TYPES.forEach(function renderType(dogType) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dog-option';
    button.setAttribute('aria-pressed', dogType.id === selectedId ? 'true' : 'false');
    button.setAttribute('data-testid', `dog-type-${dogType.id}`);
    const previewSrc = companionPreviewSrc(dogType.id);
    button.innerHTML = `<img src="${previewSrc}" alt="" style="filter:${dogType.filter}" /><span>${dogType.label}</span>`;
    button.addEventListener('click', function onPick() {
      selectedDogType = dogType.id;
      renderDogTypes(dogType.id);
      saveSettings();
    });
    grid.appendChild(button);
  });
}

function fill(state) {
  selectedDogType = state.settings.dogType;
  document.getElementById('dog-name').value = state.settings.dogName;
  document.getElementById('title-name').textContent = state.settings.dogName;
  document.getElementById('personality').value = state.settings.personality || 'goofy';
  document.getElementById('visible').checked = state.settings.visible !== false;
  document.getElementById('sound').checked = state.settings.sound === true;
  document.getElementById('size').value = state.settings.size;
  document.getElementById('popup-minutes').value = String(state.settings.popupMinutes);
  document.getElementById('appear-delay').value = String(state.settings.appearDelaySeconds);
  document.getElementById('freq').value = state.settings.attentionFrequency;
  renderDogTypes(selectedDogType);
  renderCollection(state);
  const paused = isPaused(state, Date.now());
  document.getElementById('status-line').textContent = paused
    ? 'Paused'
    : state.settings.visible
      ? `On duty · asks every ${state.settings.popupMinutes} min`
      : 'Hidden';
}

function collectSettings() {
  return {
    dogName: document.getElementById('dog-name').value,
    dogType: selectedDogType,
    personality: document.getElementById('personality').value,
    visible: document.getElementById('visible').checked,
    sound: document.getElementById('sound').checked,
    size: document.getElementById('size').value,
    popupMinutes: Number(document.getElementById('popup-minutes').value),
    appearDelaySeconds: Number(document.getElementById('appear-delay').value),
    attentionFrequency: document.getElementById('freq').value,
  };
}

function saveSettings() {
  return send(MESSAGE.SAVE_SETTINGS, { settings: collectSettings() }).then(function onSaved(response) {
    document.getElementById('save-msg').textContent = response.ok ? 'Saved' : 'Try again';
    if (response.state) {
      fill(response.state);
    }
  });
}

document.getElementById('dog-name').addEventListener('change', saveSettings);
document.getElementById('personality').addEventListener('change', saveSettings);
document.getElementById('visible').addEventListener('change', saveSettings);
document.getElementById('sound').addEventListener('change', saveSettings);
document.getElementById('size').addEventListener('change', saveSettings);
document.getElementById('popup-minutes').addEventListener('change', saveSettings);
document.getElementById('appear-delay').addEventListener('change', saveSettings);
document.getElementById('freq').addEventListener('change', saveSettings);

document.getElementById('preview-sound').addEventListener('click', function onPreview() {
  const soundToggle = document.getElementById('sound');
  const status = document.getElementById('save-msg');
  if (!soundToggle.checked) {
    soundToggle.checked = true;
    saveSettings();
  }
  status.textContent = 'Unlocking sound…';
  unlockFunAudio().then(function onUnlocked(ready) {
    if (!ready) {
      status.textContent = 'Could not start audio — click Preview again';
      return;
    }
    const species = companionSoundSpecies(selectedDogType);
    if (species === 'cat' && typeof loadMeowSampleBuffers === 'function') {
      status.textContent = 'Loading meows…';
      loadMeowSampleBuffers().then(function onSamples() {
        const played = playFunSound('bark', true, species);
        status.textContent = played ? 'Playing meow…' : 'Audio ready but playback failed — click again';
      });
      return;
    }
    const played = playFunSound('bark', true, species);
    status.textContent = played
      ? 'Playing bark…'
      : 'Audio ready but playback failed — click again';
  });
});

document.getElementById('pause').addEventListener('click', function onPause() {
  send(MESSAGE.PAUSE_HOUR).then(function onPaused(response) {
    if (response.state) {
      fill(response.state);
    }
    document.getElementById('save-msg').textContent = 'Paused for one hour';
  });
});

document.getElementById('resume').addEventListener('click', function onResume() {
  send(MESSAGE.CLEAR_PAUSE).then(function onCleared(response) {
    if (response.state) {
      fill(response.state);
    }
    document.getElementById('save-msg').textContent = 'Resumed';
  });
});

document.getElementById('reset').addEventListener('click', function onReset() {
  send(MESSAGE.RESET_MOOD).then(function onResetDone(response) {
    if (response.state) {
      fill(response.state);
    }
    document.getElementById('save-msg').textContent = 'Reset';
  });
});

document.getElementById('sites').addEventListener('click', function onSites() {
  chrome.runtime.openOptionsPage();
});

send(MESSAGE.GET_STATE).then(function onLoad(response) {
  if (!response.state) {
    return;
  }
  if (!response.state.settings.onboardingComplete) {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
    return;
  }
  fill(response.state);
});
