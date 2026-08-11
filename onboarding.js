'use strict';

const draft = {
  pet: {
    name: 'Biscuit',
    coat: COAT_GOLDEN,
    ears: EARS_FLOPPY,
    personality: PERSONALITY_GOOFY,
    pronouns: 'they',
  },
  settings: {
    motion: MOTION_FULL,
    sound: false,
    mode: MODE_GENTLE,
    defaultBudgetSeconds: 1200,
    defaultBreakMinutes: 3,
  },
  firstOrigin: 'https://www.youtube.com',
};

function showStep(stepNumber) {
  document.querySelectorAll('.panel').forEach(function hidePanel(panel) {
    panel.classList.remove('active');
  });
  const panel = document.getElementById(`step-${stepNumber}`);
  if (panel) {
    panel.classList.add('active');
  }
}

function makeChoiceGroup(containerId, options, selected, onSelect) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  options.forEach(function renderOption(option) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = option.label;
    button.setAttribute('aria-pressed', option.value === selected ? 'true' : 'false');
    button.addEventListener('click', function onClick() {
      onSelect(option.value);
      makeChoiceGroup(containerId, options, option.value, onSelect);
    });
    container.appendChild(button);
  });
}

function originFromDomainInput(value) {
  const trimmed = String(value || '').trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return originFromUrl(trimmed);
  }
  return originFromUrl(`https://${trimmed}`);
}

function initChoices() {
  makeChoiceGroup(
    'coat-choices',
    [
      { value: COAT_GOLDEN, label: 'Golden' },
      { value: COAT_BLACK_TAN, label: 'Black & tan' },
      { value: COAT_WHITE_BROWN, label: 'White & brown' },
      { value: COAT_GREY, label: 'Grey' },
      { value: COAT_HIGH_CONTRAST, label: 'High contrast' },
    ],
    draft.pet.coat,
    function onCoat(value) {
      draft.pet.coat = value;
    },
  );
  makeChoiceGroup(
    'ear-choices',
    [
      { value: EARS_FLOPPY, label: 'Floppy' },
      { value: EARS_POINTY, label: 'Pointy' },
      { value: EARS_MIXED, label: 'One up' },
    ],
    draft.pet.ears,
    function onEars(value) {
      draft.pet.ears = value;
    },
  );
  makeChoiceGroup(
    'personality-choices',
    [
      { value: PERSONALITY_GOOFY, label: 'Goofy' },
      { value: PERSONALITY_GENTLE, label: 'Gentle' },
      { value: PERSONALITY_DRAMATIC, label: 'Dramatic' },
      { value: PERSONALITY_DETECTIVE, label: 'Detective' },
    ],
    draft.pet.personality,
    function onPersonality(value) {
      draft.pet.personality = value;
    },
  );
}

function bindPresetSites() {
  document.querySelectorAll('#preset-sites .chip').forEach(function bind(button) {
    button.addEventListener('click', function onPreset() {
      draft.firstOrigin = button.getAttribute('data-origin');
      document.querySelectorAll('#preset-sites .chip').forEach(function clear(chip) {
        chip.setAttribute('aria-pressed', 'false');
      });
      button.setAttribute('aria-pressed', 'true');
      document.getElementById('site-error').textContent = '';
    });
  });
  document.querySelector('#preset-sites .chip').setAttribute('aria-pressed', 'true');
}

function bindRules() {
  document.querySelectorAll('[data-rule]').forEach(function bind(button) {
    button.addEventListener('click', function onRule() {
      const rule = button.getAttribute('data-rule');
      document.querySelectorAll('[data-rule]').forEach(function clear(chip) {
        chip.setAttribute('aria-pressed', 'false');
      });
      button.setAttribute('aria-pressed', 'true');
      if (rule === 'gentle') {
        draft.settings.mode = MODE_GENTLE;
        draft.settings.defaultBudgetSeconds = 1200;
        draft.settings.defaultBreakMinutes = 3;
      } else if (rule === 'balanced') {
        draft.settings.mode = MODE_GATE;
        draft.settings.defaultBudgetSeconds = 900;
        draft.settings.defaultBreakMinutes = 3;
      } else {
        draft.settings.mode = MODE_GATE;
        draft.settings.defaultBudgetSeconds = 600;
        draft.settings.defaultBreakMinutes = 3;
      }
    });
  });
}

function readAdoptionFields() {
  draft.pet.name = document.getElementById('dog-name').value.trim() || 'Biscuit';
  draft.pet.pronouns = document.getElementById('pronouns').value;
  draft.settings.motion = document.getElementById('motion').value;
  draft.settings.sound = document.getElementById('sound').value === 'on';
}

function resolveSelectedOrigin() {
  const custom = originFromDomainInput(document.getElementById('custom-domain').value);
  if (custom) {
    draft.firstOrigin = custom;
  }
  return draft.firstOrigin;
}

function finishOnboarding() {
  readAdoptionFields();
  const origin = resolveSelectedOrigin();
  const errorNode = document.getElementById('finish-error');
  errorNode.textContent = '';
  if (!origin) {
    errorNode.textContent = 'Choose a site to guard first.';
    showStep(4);
    return;
  }
  const pattern = originPermissionPattern(origin);
  errorNode.textContent = 'Requesting site access…';
  chrome.permissions.request({ origins: [pattern] }, function onPermission(granted) {
    if (chrome.runtime.lastError) {
      errorNode.textContent = chrome.runtime.lastError.message;
      return;
    }
    if (!granted) {
      errorNode.textContent = 'Allow access to that site to continue.';
      return;
    }
    chrome.runtime.sendMessage(
      {
        type: MESSAGE.COMPLETE_ONBOARDING,
        pet: draft.pet,
        settings: draft.settings,
        firstOrigin: origin,
        permissionGranted: true,
        siteConfig: {
          dailyBudgetSeconds: draft.settings.defaultBudgetSeconds,
          breakSeconds: draft.settings.defaultBreakMinutes * 60,
          enabled: true,
        },
      },
      function onComplete(response) {
        if (!response || !response.ok) {
          errorNode.textContent =
            (response && response.error) || 'Could not finish setup. Try again.';
          return;
        }
        errorNode.textContent = '';
        document.querySelectorAll('.panel').forEach(function hide(panel) {
          panel.classList.remove('active');
        });
        const done = document.createElement('section');
        done.className = 'panel active';
        done.setAttribute('data-testid', 'onboarding-done');
        done.innerHTML =
          '<h1>Shift started</h1>' +
          '<p class="lead">Click the Bark Break toolbar icon to open the kennel side panel.</p>' +
          '<p class="muted">Pin the extension from the puzzle menu if you do not see the icon.</p>' +
          '<a class="btn" id="open-kennel" href="sidepanel.html">Open kennel</a>';
        document.querySelector('main').appendChild(done);
      },
    );
  });
}

function bindNavigation() {
  document.getElementById('meet-dog').addEventListener('click', function onMeet() {
    showStep(2);
  });
  document.getElementById('to-promise').addEventListener('click', function onPromise() {
    readAdoptionFields();
    showStep(3);
  });
  document.getElementById('to-gate').addEventListener('click', function onGate() {
    showStep(4);
  });
  document.getElementById('to-rule').addEventListener('click', function onRuleStep() {
    const origin = resolveSelectedOrigin();
    if (!origin) {
      document.getElementById('site-error').textContent = 'Pick a preset or enter a domain.';
      return;
    }
    document.getElementById('site-error').textContent = '';
    showStep(5);
  });
  document.getElementById('to-rehearsal').addEventListener('click', function onRehearsal() {
    showStep(6);
  });
  document.getElementById('finish-onboarding').addEventListener('click', finishOnboarding);
  document.getElementById('guard-current').addEventListener('click', function onGuardCurrent() {
    chrome.tabs.query({ active: true, currentWindow: true }, function onTabs(tabs) {
      const tab = tabs[0];
      if (!tab || !tab.url || isRestrictedUrl(tab.url)) {
        document.getElementById('site-error').textContent =
          'Open a normal website tab, then try again.';
        return;
      }
      const origin = originFromUrl(tab.url);
      if (!origin) {
        document.getElementById('site-error').textContent = 'Could not read that site.';
        return;
      }
      draft.firstOrigin = origin;
      document.getElementById('custom-domain').value = hostnameFromOrigin(origin);
      document.getElementById('site-error').textContent = `Selected ${origin}`;
    });
  });
}

initChoices();
bindPresetSites();
bindRules();
bindNavigation();
