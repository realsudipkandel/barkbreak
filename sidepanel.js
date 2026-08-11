'use strict';

let latest = null;

function send(type, payload) {
  return new Promise(function sendPromise(resolve) {
    chrome.runtime.sendMessage(Object.assign({ type: type }, payload || {}), function onResponse(response) {
      resolve(response || { ok: false, error: 'No response' });
    });
  });
}

function setPanel(panelName) {
  document.querySelectorAll('.panel').forEach(function hide(panel) {
    panel.classList.remove('active');
  });
  const panel = document.getElementById(`panel-${panelName}`);
  if (panel) {
    panel.classList.add('active');
  }
  document.querySelectorAll('.nav-btn').forEach(function mark(button) {
    button.setAttribute(
      'aria-current',
      button.getAttribute('data-panel') === panelName ? 'page' : 'false',
    );
  });
}

function renderEars(ears) {
  const left = document.getElementById('ear-left');
  const right = document.getElementById('ear-right');
  if (ears === EARS_POINTY) {
    left.innerHTML = '<path d="M60 70 L50 30 L74 58 Z" fill="var(--dog-ear)" stroke="#18324A" stroke-width="4"/>';
    right.innerHTML = '<path d="M120 70 L130 30 L106 58 Z" fill="var(--dog-ear)" stroke="#18324A" stroke-width="4"/>';
    return;
  }
  if (ears === EARS_MIXED) {
    left.innerHTML = '<path d="M60 70 L50 30 L74 58 Z" fill="var(--dog-ear)" stroke="#18324A" stroke-width="4"/>';
    right.innerHTML =
      '<ellipse cx="122" cy="54" rx="14" ry="20" fill="var(--dog-ear)" stroke="#18324A" stroke-width="4"/>';
    return;
  }
  left.innerHTML =
    '<ellipse cx="58" cy="54" rx="14" ry="20" fill="var(--dog-ear)" stroke="#18324A" stroke-width="4"/>';
  right.innerHTML =
    '<ellipse cx="122" cy="54" rx="14" ry="20" fill="var(--dog-ear)" stroke="#18324A" stroke-width="4"/>';
}

function statusLabel(status) {
  if (status === STATUS_ON_BREAK) return 'On break';
  if (status === STATUS_QUIET) return 'Quiet hours';
  if (status === STATUS_OFF_DUTY) return 'Off duty';
  if (status === STATUS_FOCUS) return 'Focus Fetch';
  if (status === STATUS_PAUSED) return 'Paused';
  return 'On duty';
}

function statusColor(status) {
  if (status === STATUS_FOCUS) return '#B9DDF2';
  if (status === STATUS_ON_BREAK) return '#2A8C82';
  if (status === STATUS_PAUSED || status === STATUS_QUIET) return '#6C5B7B';
  return '#2A8C82';
}

function renderToys(state) {
  const list = document.getElementById('toy-list');
  list.innerHTML = '';
  UNLOCKABLE_ITEMS.forEach(function renderItem(item) {
    const owned = state.pet.inventory.items.indexOf(item.id) !== -1;
    const unlocked = canUnlockItem(state, item);
    const card = document.createElement('article');
    card.className = 'card';
    const title = document.createElement('p');
    title.className = 'metric';
    title.innerHTML = `<span>${item.name}</span><span>${owned ? 'Owned' : `${item.cost} biscuits`}</span>`;
    card.appendChild(title);
    if (!owned) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn secondary';
      button.textContent = unlocked ? 'Unlock' : 'Locked';
      button.disabled = !unlocked;
      button.setAttribute('data-testid', `buy-${item.id}`);
      button.addEventListener('click', function onBuy() {
        send(MESSAGE.BUY_ITEM, { itemId: item.id }).then(function onBought(response) {
          document.getElementById('care-message').textContent = response.message || '';
          if (response.ok) {
            latest = response;
            renderAll(response);
          }
        });
      });
      card.appendChild(button);
      if (!unlocked) {
        const hint = document.createElement('p');
        hint.className = 'muted';
        hint.textContent = item.unlock.startsWith('bond')
          ? `Need bond level ${item.unlock.replace('bond', '')}`
          : 'Complete more breaks or focus sessions';
        card.appendChild(hint);
      }
    }
    list.appendChild(card);
  });
}

function renderScrapbook(scrapbook) {
  const card = document.getElementById('scrapbook-card');
  const stories = (scrapbook.stories || [])
    .map(function mapStory(story) {
      return `<li>${story.title}</li>`;
    })
    .join('');
  card.innerHTML = `
    <p class="metric"><span>Intentional breaks</span><span>${scrapbook.intentionalBreaks}</span></p>
    <p class="metric"><span>Minutes away</span><span>${scrapbook.minutesAway}</span></p>
    <p class="metric"><span>Urgent passes</span><span>${scrapbook.urgentPasses}</span></p>
    <p class="muted">Most refreshing: ${scrapbook.mostRefreshing}. No judgement.</p>
    <p class="metric"><span>Bond</span><span>${scrapbook.bondLevel.name}</span></p>
    <ul>${stories || '<li>Stories will appear as you care and break.</li>'}</ul>
  `;
}

function renderAll(response) {
  if (!response || !response.state) {
    return;
  }
  const state = response.state;
  const status = response.status;
  document.body.style.setProperty('--bb-text-scale', `${state.settings.textScale || 100}%`);
  document.body.classList.toggle('high-contrast', state.settings.highContrast === true);
  document.body.classList.toggle('motion-static', state.settings.motion === MOTION_STATIC);
  document.body.classList.toggle('motion-reduced', state.settings.motion === MOTION_REDUCED);

  document.getElementById('status-label').textContent = statusLabel(status);
  document.getElementById('status-dot').style.background = statusColor(status);
  document.getElementById('biscuit-count').textContent = `${state.pet.inventory.biscuits} biscuits`;
  document.getElementById('dog-name-label').textContent = state.pet.name;
  document.getElementById('bond-label').textContent = response.bondLevel.name;

  const scene = document.getElementById('dog-scene');
  scene.className = `dog-scene coat-${state.pet.coat}`;
  renderEars(state.pet.ears);

  const siteCount = Object.keys(state.guardedSites).length;
  let context = `${siteCount} guarded site${siteCount === 1 ? '' : 's'}.`;
  const firstOrigin = Object.keys(state.guardedSites)[0];
  if (firstOrigin && !(state.activeSession && state.activeSession.type)) {
    const host = hostnameFromOrigin(firstOrigin);
    const engaged = getDomainEngagedSeconds(state, host, response.nowMs);
    const budget = state.guardedSites[firstOrigin].dailyBudgetSeconds;
    const left = Math.max(0, budget - engaged);
    context = `${host}: ${Math.ceil(left / 60)} min engaged time left (${engaged}s used / ${budget}s).`;
  }
  if (state.activeSession && state.activeSession.type === SESSION_FOCUS) {
    context = `Focus Fetch: ${formatMs(remainingMsFromEndsAt(state.activeSession.endsAt, response.nowMs))} left.`;
  } else if (state.activeSession && state.activeSession.type === SESSION_BREAK) {
    context = `On break: ${formatMs(remainingMsFromEndsAt(state.activeSession.endsAt, response.nowMs))} left.`;
  } else if (status === STATUS_OFF_DUTY) {
    context = 'Finish onboarding to start the shift.';
  }
  document.getElementById('context-text').textContent = context;

  renderToys(state);
  renderScrapbook(response.scrapbook);
}

async function refresh() {
  const response = await send(MESSAGE.GET_STATE);
  latest = response;
  if (!response || !response.ok || !response.state) {
    const message = document.getElementById('care-message');
    if (message) {
      message.textContent =
        (response && response.error) || 'Kennel could not load. Open chrome://extensions and reload Bark Break.';
    }
    return;
  }
  if (!response.state.settings.onboardingComplete) {
    window.location.href = chrome.runtime.getURL('onboarding.html');
    return;
  }
  renderAll(response);
}

function bindUi() {
  document.querySelectorAll('.nav-btn').forEach(function bindNav(button) {
    button.addEventListener('click', function onNav() {
      setPanel(button.getAttribute('data-panel'));
    });
  });

  document.querySelectorAll('[data-care]').forEach(function bindCare(button) {
    button.addEventListener('click', function onCare() {
      send(MESSAGE.CARE_ACTION, { action: button.getAttribute('data-care') }).then(
        function onCareResult(response) {
          document.getElementById('care-message').textContent =
            response.message || response.error || '';
          if (response.disclaimer) {
            document.getElementById('care-message').textContent += ` ${response.disclaimer}`;
          }
          if (response.state) {
            latest = response;
            renderAll(response);
          }
        },
      );
    });
  });

  document.getElementById('take-break').addEventListener('click', function onBreak() {
    const minutes =
      latest && latest.state ? latest.state.settings.defaultBreakMinutes : 3;
    send(MESSAGE.START_BREAK, { minutes: minutes });
  });

  document.getElementById('start-focus').addEventListener('click', function onFocus() {
    send(MESSAGE.START_FOCUS, { minutes: 25 }).then(refresh);
  });

  document.getElementById('global-pause').addEventListener('click', function onPause() {
    send(MESSAGE.GLOBAL_PAUSE, { durationMs: 60 * 60 * 1000 }).then(refresh);
  });

  document.getElementById('open-onboarding').addEventListener('click', function onReplay() {
    window.location.href = chrome.runtime.getURL('onboarding.html');
  });
}

bindUi();
refresh();
setInterval(refresh, 5000);
