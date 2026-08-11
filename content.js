'use strict';

const HOST_ROOT_ID = 'barkbreak-host-root';
const SHADOW_STYLE = `
:host, .bb-root {
  all: initial;
  font-family: "Trebuchet MS", "Segoe UI", sans-serif;
  color: #18324A;
}
.bb-root {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  pointer-events: none;
}
.bb-warn {
  pointer-events: auto;
  position: fixed;
  right: 16px;
  bottom: 16px;
  background: #FFF6E8;
  border: 3px solid #18324A;
  border-radius: 18px;
  padding: 12px 14px;
  max-width: 280px;
  box-shadow: 0 8px 24px rgba(24, 50, 74, 0.18);
}
.bb-gate {
  pointer-events: auto;
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(24, 50, 74, 0.55);
  backdrop-filter: blur(4px);
}
.bb-card {
  background: #FFF6E8;
  border: 3px solid #18324A;
  border-radius: 24px;
  padding: 24px;
  width: min(420px, calc(100vw - 32px));
  box-shadow: 0 16px 40px rgba(24, 50, 74, 0.25);
}
.bb-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 8px;
}
.bb-reason, .bb-message {
  margin: 0 0 12px;
  font-size: 15px;
  line-height: 1.4;
}
.bb-dog {
  width: 120px;
  height: 100px;
  margin: 0 auto 12px;
  display: block;
}
.bb-actions {
  display: grid;
  gap: 8px;
}
.bb-btn {
  appearance: none;
  border: 2px solid #18324A;
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  background: #EF6A5B;
  color: #18324A;
}
.bb-btn.secondary {
  background: #B9DDF2;
}
.bb-btn.ghost {
  background: transparent;
}
.bb-btn:focus-visible {
  outline: 3px solid #2A8C82;
  outline-offset: 2px;
}
.bb-live {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.bb-intention {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}
.bb-hidden { display: none !important; }
@media (prefers-reduced-motion: reduce) {
  .bb-gate { backdrop-filter: none; }
}
`;

let lastActivityAt = Date.now();
let deltaTimerId = null;
let hostRoot = null;
let shadowRoot = null;
let currentMode = 'clear';
let focusTrapHandler = null;
let currentBreakMinutes = 3;

function markActivity() {
  lastActivityAt = Date.now();
}

function isFullscreenActive() {
  return Boolean(document.fullscreenElement);
}

function ensureHost() {
  if (hostRoot && document.documentElement.contains(hostRoot)) {
    return shadowRoot;
  }
  hostRoot = document.getElementById(HOST_ROOT_ID);
  if (!hostRoot) {
    hostRoot = document.createElement('div');
    hostRoot.id = HOST_ROOT_ID;
    hostRoot.setAttribute('data-barkbreak', 'true');
    document.documentElement.appendChild(hostRoot);
  }
  shadowRoot = hostRoot.shadowRoot;
  if (!shadowRoot) {
    shadowRoot = hostRoot.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = SHADOW_STYLE;
    const root = document.createElement('div');
    root.className = 'bb-root';
    root.innerHTML = `
      <div class="bb-live" aria-live="polite" data-testid="barkbreak-live"></div>
      <div class="bb-warn bb-hidden" role="status" data-testid="barkbreak-warn"></div>
      <div class="bb-gate bb-hidden" role="dialog" aria-modal="true" aria-labelledby="bb-gate-title" data-testid="barkbreak-gate"></div>
    `;
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(root);
  }
  return shadowRoot;
}

function announce(text) {
  const root = ensureHost();
  const live = root.querySelector('.bb-live');
  if (live) {
    live.textContent = text;
  }
}

function clearUi() {
  const root = ensureHost();
  const warn = root.querySelector('.bb-warn');
  const gate = root.querySelector('.bb-gate');
  warn.classList.add('bb-hidden');
  gate.classList.add('bb-hidden');
  gate.innerHTML = '';
  warn.innerHTML = '';
  currentMode = 'clear';
  if (focusTrapHandler) {
    document.removeEventListener('keydown', focusTrapHandler, true);
    focusTrapHandler = null;
  }
}

function dogSvg() {
  return `
<svg class="bb-dog" viewBox="0 0 120 100" aria-hidden="true">
  <ellipse cx="60" cy="70" rx="34" ry="22" fill="#E7AE32" stroke="#18324A" stroke-width="3"/>
  <circle cx="60" cy="42" r="24" fill="#E7AE32" stroke="#18324A" stroke-width="3"/>
  <ellipse cx="38" cy="28" rx="10" ry="14" fill="#EF6A5B" stroke="#18324A" stroke-width="3"/>
  <ellipse cx="82" cy="28" rx="10" ry="14" fill="#EF6A5B" stroke="#18324A" stroke-width="3"/>
  <circle cx="52" cy="42" r="3" fill="#18324A"/>
  <circle cx="68" cy="42" r="3" fill="#18324A"/>
  <ellipse cx="60" cy="50" rx="5" ry="3" fill="#18324A"/>
  <path d="M20 78 H100" stroke="#18324A" stroke-width="4"/>
  <rect x="46" y="62" width="28" height="18" rx="4" fill="#2A8C82" stroke="#18324A" stroke-width="3"/>
</svg>`;
}

function showWarning(view, remainingSeconds) {
  if (isFullscreenActive()) {
    announce(view.message || 'Two minutes left.');
    return;
  }
  const root = ensureHost();
  const warn = root.querySelector('.bb-warn');
  const minutesLeft = Math.max(1, Math.ceil((remainingSeconds || WARNING_SECONDS) / 60));
  warn.innerHTML = `
    <strong>Tiny woof</strong>
    <p>${minutesLeft} minute${minutesLeft === 1 ? '' : 's'} left here.</p>
    <div class="bb-actions">
      <button type="button" class="bb-btn" data-action="break-now">Break now</button>
      <button type="button" class="bb-btn ghost" data-action="dismiss-warn">Finish up</button>
    </div>
  `;
  warn.classList.remove('bb-hidden');
  currentMode = 'warn';
  announce(view.warning || view.message || 'Two minutes left.');
  warn.querySelector('[data-action="break-now"]').addEventListener('click', onBreakNow);
  warn.querySelector('[data-action="dismiss-warn"]').addEventListener('click', function onDismiss() {
    warn.classList.add('bb-hidden');
  });
}

function trapFocus(container) {
  focusTrapHandler = function onKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      showUrgentMenu(container);
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const focusable = container.querySelectorAll('button, [href], input, select, textarea');
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  document.addEventListener('keydown', focusTrapHandler, true);
}

function showUrgentMenu(gate) {
  const intention = gate.querySelector('.bb-intention');
  if (intention) {
    intention.classList.remove('bb-hidden');
    const first = intention.querySelector('button');
    if (first) {
      first.focus();
    }
    return;
  }
  onUrgentPass(null);
}

function showGate(view) {
  if (isFullscreenActive()) {
    announce(view.message || 'Gate ready after fullscreen.');
    return;
  }
  currentBreakMinutes = view.breakMinutes || 3;
  const root = ensureHost();
  const gate = root.querySelector('.bb-gate');
  const warn = root.querySelector('.bb-warn');
  warn.classList.add('bb-hidden');
  gate.innerHTML = `
    <div class="bb-card">
      ${dogSvg()}
      <h2 class="bb-title" id="bb-gate-title">${view.dogName || 'Biscuit'} closed the gate</h2>
      <p class="bb-message">${view.message || 'Biscuit has confiscated the scroll.'}</p>
      <p class="bb-reason">${view.reason || ''}</p>
      <div class="bb-actions">
        <button type="button" class="bb-btn" data-action="break">Take a ${view.breakMinutes || 3}-minute break</button>
        <button type="button" class="bb-btn secondary" data-action="close-tab">Close this tab</button>
        <button type="button" class="bb-btn ghost" data-action="urgent">I need 5 minutes</button>
        <button type="button" class="bb-btn ghost" data-action="settings">Change settings</button>
      </div>
      <div class="bb-intention bb-hidden" data-testid="barkbreak-intention">
        <p>What are you opening this for?</p>
        ${URGENT_PRESETS.map(function mapPreset(preset) {
          return `<button type="button" class="bb-btn secondary" data-intention="${preset}">${preset}</button>`;
        }).join('')}
      </div>
    </div>
  `;
  gate.classList.remove('bb-hidden');
  currentMode = 'gate';
  announce(view.message || 'Gate is closed for a short pause.');
  trapFocus(gate);
  const primary = gate.querySelector('[data-action="break"]');
  if (primary) {
    primary.focus();
  }
  gate.querySelector('[data-action="break"]').addEventListener('click', onBreakNow);
  gate.querySelector('[data-action="close-tab"]').addEventListener('click', onCloseTab);
  gate.querySelector('[data-action="urgent"]').addEventListener('click', function onUrgentClick() {
    onUrgentPass(null);
  });
  gate.querySelector('[data-action="settings"]').addEventListener('click', onOpenSettings);
  gate.querySelectorAll('[data-intention]').forEach(function bindIntention(button) {
    button.addEventListener('click', function onIntentionClick() {
      onUrgentPass(button.getAttribute('data-intention'));
    });
  });
}

function onBreakNow() {
  const minutes = currentBreakMinutes || undefined;
  chrome.runtime.sendMessage({
    type: MESSAGE.START_BREAK,
    minutes: minutes,
    origin: originFromUrl(window.location.href),
  });
  clearUi();
}

function onCloseTab() {
  chrome.runtime.sendMessage({ type: MESSAGE.CLOSE_TAB });
}

function onOpenSettings() {
  chrome.runtime.sendMessage({ type: MESSAGE.GET_STATE }, function onState() {
    window.open(chrome.runtime.getURL('options.html'), '_blank');
  });
}

function onUrgentPass(note) {
  chrome.runtime.sendMessage(
    {
      type: MESSAGE.URGENT_PASS,
      origin: originFromUrl(window.location.href),
      note: note,
    },
    function onUrgentResponse(response) {
      if (response && response.needsIntention && !note) {
        const root = ensureHost();
        const gate = root.querySelector('.bb-gate');
        const intention = gate.querySelector('.bb-intention');
        if (intention) {
          intention.classList.remove('bb-hidden');
          return;
        }
      }
      clearUi();
    },
  );
}

function collectEngagementFlags() {
  const visible = document.visibilityState === 'visible';
  const windowFocused = document.hasFocus();
  const recentActivity = Date.now() - lastActivityAt <= ACTIVITY_WINDOW_MS;
  return {
    visible: visible,
    windowFocused: windowFocused,
    recentActivity: recentActivity,
  };
}

function sendDelta() {
  if (!shouldCountEngaged(collectEngagementFlags())) {
    return;
  }
  if (currentMode === 'gate') {
    return;
  }
  const hostname = normalizeHostname(window.location.hostname);
  chrome.runtime.sendMessage(
    {
      type: MESSAGE.ENGAGED_DELTA,
      hostname: hostname,
      deltaSeconds: Math.round(DELTA_INTERVAL_MS / 1000),
    },
    function onDeltaResponse(response) {
      if (!response || !response.ok) {
        return;
      }
      if (response.shouldGate) {
        showGate(
          response.state
            ? buildGateViewModel(response.state, hostname, Date.now())
            : { dogName: 'Biscuit', message: 'Biscuit has confiscated the scroll.', breakMinutes: 3 },
        );
      } else if (response.shouldWarn) {
        showWarning(
          response.copy || { warning: 'Tiny woof: two minutes left here.' },
          response.remainingSeconds,
        );
      }
    },
  );
}

function startMeter() {
  if (deltaTimerId !== null) {
    return;
  }
  deltaTimerId = setInterval(sendDelta, DELTA_INTERVAL_MS);
}

function stopMeter() {
  if (deltaTimerId !== null) {
    clearInterval(deltaTimerId);
    deltaTimerId = null;
  }
}

function onRuntimeMessage(message) {
  if (!message || message.type !== MESSAGE.GATE_STATUS) {
    return;
  }
  if (message.mode === 'clear') {
    clearUi();
    return;
  }
  if (message.mode === 'warn') {
    showWarning(message.view || {}, message.remainingSeconds);
    return;
  }
  if (message.mode === 'gate') {
    showGate(message.view || {});
  }
}

function bootContentScript() {
  if (window.__barkBreakContentLoaded) {
    return;
  }
  window.__barkBreakContentLoaded = true;
  if (isRestrictedUrl(window.location.href)) {
    return;
  }
  ['pointerdown', 'keydown', 'scroll', 'mousemove', 'touchstart'].forEach(function bind(eventName) {
    window.addEventListener(eventName, markActivity, { passive: true });
  });
  document.addEventListener('visibilitychange', function onVisibility() {
    if (document.visibilityState === 'hidden') {
      stopMeter();
    } else {
      startMeter();
    }
  });
  chrome.runtime.onMessage.addListener(onRuntimeMessage);
  ensureHost();
  startMeter();
}

bootContentScript();
