'use strict';

let endsAt = null;
let careDone = false;
let tickId = null;
let careTimeoutId = null;

function queryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function send(type, payload) {
  return new Promise(function sendPromise(resolve) {
    chrome.runtime.sendMessage(Object.assign({ type: type }, payload || {}), function onResponse(response) {
      resolve(response || { ok: false });
    });
  });
}

function showPhase(phaseName) {
  document.querySelectorAll('.panel').forEach(function hide(panel) {
    panel.classList.remove('active');
  });
  document.getElementById(`${phaseName}-phase`).classList.add('active');
}

function renderTimer() {
  const remaining = remainingMsFromEndsAt(endsAt, Date.now());
  document.getElementById('break-timer').textContent = formatMs(remaining);
  if (remaining <= 0) {
    finishBreak(false);
  }
}

function enterAwayPhase(response) {
  showPhase('away');
  document.getElementById('away-prompt').textContent =
    response.awayPrompt || pickAwayPrompt(Date.now());
  if (response.state && response.state.activeSession) {
    endsAt = response.state.activeSession.endsAt;
  }
  renderTimer();
  if (tickId !== null) {
    clearInterval(tickId);
  }
  tickId = setInterval(renderTimer, 250);
}

function finishBreak(early) {
  if (tickId !== null) {
    clearInterval(tickId);
    tickId = null;
  }
  if (careTimeoutId !== null) {
    clearTimeout(careTimeoutId);
    careTimeoutId = null;
  }
  send(MESSAGE.END_BREAK, { early: early === true }).then(function onEnded(response) {
    showPhase('return');
    const copy = response.copy || getCopy(
      (response.state && response.state.settings) || createDefaultSettings(),
      (response.state && response.state.pet) || createDefaultPet(),
    );
    document.getElementById('return-line').textContent = copy.returnLine;
    const reward = response.reward || { biscuits: 0, bond: 0, minutes: 0 };
    document.getElementById('reward-summary').textContent =
      `+${reward.biscuits || 0} biscuits · +${reward.bond || 0} bond · ${reward.minutes || 0} minutes away.`;
  });
}

function onCare(action) {
  if (careDone) {
    return;
  }
  careDone = true;
  send(MESSAGE.CARE_ACTION, { action: action }).then(function onCareResult(response) {
    document.getElementById('care-status').textContent = response.message || 'Nice.';
    if (careTimeoutId !== null) {
      clearTimeout(careTimeoutId);
    }
    enterAwayPhase(response);
  });
}

function bindBreakUi() {
  document.getElementById('care-water').addEventListener('click', function onWater() {
    onCare(CARE_WATER);
  });
  document.getElementById('care-pet').addEventListener('click', function onPet() {
    onCare(CARE_PET);
  });
  document.getElementById('care-play').addEventListener('click', function onPlay() {
    onCare(CARE_PLAY);
  });
  document.getElementById('care-feed').addEventListener('click', function onFeed() {
    onCare(CARE_FEED);
  });
  document.getElementById('back-early').addEventListener('click', function onEarly() {
    finishBreak(true);
  });
  document.getElementById('end-break').addEventListener('click', function onEnd() {
    finishBreak(false);
  });
  document.getElementById('close-break').addEventListener('click', function onClose() {
    window.close();
  });
  document.querySelectorAll('[data-feeling]').forEach(function bindFeeling(button) {
    button.addEventListener('click', function onFeeling() {
      send(MESSAGE.REFRESH_CHECKIN, { feeling: button.getAttribute('data-feeling') }).then(
        function afterCheckin() {
          window.close();
        },
      );
    });
  });
}

function bootBreakPage() {
  bindBreakUi();
  send(MESSAGE.GET_STATE).then(function onState(response) {
    if (!response.ok || !response.state) {
      return;
    }
    const scene = document.getElementById('break-dog-scene');
    scene.className = `dog-scene coat-${response.state.pet.coat}`;
    document.getElementById('care-prompt').textContent = response.copy
      ? response.copy.breakLine
      : 'One short kindness, then I hold the gate.';
    if (response.state.activeSession && response.state.activeSession.type === SESSION_BREAK) {
      endsAt = response.state.activeSession.endsAt;
    } else {
      const minutes = Number(queryParam('minutes') || 3);
      endsAt = Date.now() + minutes * 60 * 1000;
    }
    careTimeoutId = setTimeout(function autoAway() {
      if (!careDone) {
        careDone = true;
        enterAwayPhase(response);
      }
    }, CARE_PHASE_MAX_MS);
  });
}

bootBreakPage();
