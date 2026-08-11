'use strict';

const draft = {
  dogName: 'Biscuit',
  dogType: DOG_GOLDEN,
  sound: false,
  size: SIZE_MEDIUM,
  popupMinutes: 30,
  appearDelaySeconds: 5,
  attentionFrequency: FREQ_DEFAULT,
  scope: SCOPE_SELECTED,
  sites: [],
};

function showStep(id) {
  document.querySelectorAll('.panel').forEach(function hide(panel) {
    panel.classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
}

function originFromInput(value) {
  const trimmed = String(value || '').trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return originFromUrl(trimmed);
  }
  return originFromUrl(`https://${trimmed}`);
}

function renderDogTypes() {
  const grid = document.getElementById('dog-type-grid');
  grid.innerHTML = '';
  DOG_TYPES.forEach(function renderType(dogType) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dog-option';
    button.setAttribute('aria-pressed', dogType.id === draft.dogType ? 'true' : 'false');
    button.innerHTML = `<img src="assets/dog/sit.png" alt="" style="filter:${dogType.filter}" /><span>${dogType.label}</span>`;
    button.addEventListener('click', function onPick() {
      draft.dogType = dogType.id;
      document.getElementById('hero-dog').style.filter = dogType.filter;
      renderDogTypes();
    });
    grid.appendChild(button);
  });
}

document.getElementById('start').addEventListener('click', function onStart() {
  showStep('step-2');
});

document.getElementById('to-sites').addEventListener('click', function onSites() {
  draft.dogName = document.getElementById('dog-name').value.trim() || 'Biscuit';
  draft.sound = document.getElementById('sound').value === 'on';
  draft.size = document.getElementById('size').value;
  draft.popupMinutes = Number(document.getElementById('popup-minutes').value);
  draft.appearDelaySeconds = Number(document.getElementById('appear-delay').value);
  draft.attentionFrequency = document.getElementById('freq').value;
  showStep('step-3');
});

document.querySelectorAll('[data-scope]').forEach(function bindScope(button) {
  button.addEventListener('click', function onScope() {
    draft.scope = button.getAttribute('data-scope');
    document.querySelectorAll('[data-scope]').forEach(function clear(chip) {
      chip.setAttribute('aria-pressed', 'false');
    });
    button.setAttribute('aria-pressed', 'true');
    document.getElementById('domain-field').style.display =
      draft.scope === SCOPE_SELECTED ? 'grid' : 'none';
  });
});

document.getElementById('finish').addEventListener('click', function onFinish() {
  const error = document.getElementById('error');
  error.textContent = '';
  let origins = [];
  let patterns = [];

  if (draft.scope === SCOPE_ALL) {
    patterns = ['http://*/*', 'https://*/*'];
  } else {
    const origin = originFromInput(document.getElementById('domain').value);
    if (!origin) {
      error.textContent = 'Enter a website like youtube.com';
      return;
    }
    origins = [origin];
    patterns = [originPermissionPattern(origin)];
  }

  error.textContent = 'Asking Chrome for access…';
  chrome.permissions.request({ origins: patterns }, function onPermission(granted) {
    if (chrome.runtime.lastError) {
      error.textContent = chrome.runtime.lastError.message;
      return;
    }
    if (!granted) {
      error.textContent = 'Allow site access so your dog can appear there.';
      return;
    }
    chrome.runtime.sendMessage(
      {
        type: MESSAGE.COMPLETE_ONBOARDING,
        settings: {
          dogName: draft.dogName,
          dogType: draft.dogType,
          sound: draft.sound,
          size: draft.size,
          popupMinutes: draft.popupMinutes,
          appearDelaySeconds: draft.appearDelaySeconds,
          attentionFrequency: draft.attentionFrequency,
          scope: draft.scope,
          visible: true,
        },
        sites: origins,
      },
      function onComplete(response) {
        if (!response || !response.ok) {
          error.textContent = (response && response.error) || 'Could not finish. Try again.';
          return;
        }
        document.getElementById('done-title').textContent = `${draft.dogName} is ready`;
        document.getElementById('done-lead').textContent =
          `Open an approved website. ${draft.dogName} walks in along the bottom. Click to pet, feed, water, or play.`;
        showStep('step-done');
      },
    );
  });
});

renderDogTypes();
