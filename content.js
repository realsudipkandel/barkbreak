'use strict';

const HOST_ID = 'barkbreak-dog-root';
const ASSET = function asset(name) {
  return chrome.runtime.getURL(`assets/dog/${name}`);
};

const FRAMES = Object.freeze({
  standRight: ASSET('stand-right.png'),
  standLeft: ASSET('stand-left.png'),
  walkRight: [ASSET('walk-right-1.png'), ASSET('walk-right-2.png')],
  walkLeft: [ASSET('walk-left-1.png'), ASSET('walk-left-2.png')],
  sit: ASSET('sit.png'),
  sleep: ASSET('sleep.png'),
  ask: ASSET('ask.png'),
  eat: ASSET('eat.png'),
  drink: ASSET('drink.png'),
  play: ASSET('play.png'),
  pet: ASSET('pet.png'),
  bark: ASSET('bark.png'),
});

const STYLE = `
:host { all: initial; }
.bb-layer {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  pointer-events: none;
  font-family: "Trebuchet MS", "Segoe UI", sans-serif;
}
.bb-dog-wrap {
  position: fixed;
  bottom: 8px;
  left: 40px;
  pointer-events: auto;
  cursor: grab;
  user-select: none;
  touch-action: none;
  filter: drop-shadow(0 6px 10px rgba(0,0,0,.25));
  transition: bottom 0.4s ease, opacity 0.35s ease, left 0.05s linear;
}
.bb-dog-wrap.waiting { opacity: 0; pointer-events: none; }
.bb-dog-wrap.dragging { cursor: grabbing; transition: none; }
.bb-dog-wrap.dizzy { animation: bb-dizzy 0.8s ease; }
.bb-dog-wrap.shake { animation: bb-shake 0.7s ease; }
.bb-dog-wrap.roll { animation: bb-roll 0.9s ease; }
@keyframes bb-dizzy { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-8deg)} 75%{transform:rotate(8deg)} }
@keyframes bb-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} }
@keyframes bb-roll { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
.bb-dog {
  display: block;
  height: var(--bb-h, 140px);
  width: auto;
  max-width: 42vw;
  object-fit: contain;
  -webkit-user-drag: none;
  filter: var(--bb-dog-filter, none);
}
.bb-bubble {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translateX(-50%);
  background: #fff8ee;
  color: #18324A;
  border: 2px solid #18324A;
  border-radius: 16px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 700;
  max-width: min(260px, 70vw);
  white-space: normal;
  text-align: center;
  pointer-events: none;
  box-shadow: 0 8px 20px rgba(0,0,0,.15);
  z-index: 2;
}
.bb-bubble::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translateX(-50%);
  border: 8px solid transparent;
  border-top-color: #18324A;
}
.bb-mood {
  position: absolute;
  right: -4px;
  top: -4px;
  font-size: 11px;
  font-weight: 800;
  background: #B9DDF2;
  border: 2px solid #18324A;
  border-radius: 999px;
  padding: 2px 7px;
  color: #18324A;
  pointer-events: none;
}
.bb-menu, .bb-tray, .bb-break, .bb-play {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 12px);
  transform: translateX(-50%);
  background: #fff8ee;
  border: 2px solid #18324A;
  border-radius: 16px;
  padding: 10px;
  display: grid;
  gap: 6px;
  min-width: 168px;
  pointer-events: auto;
  box-shadow: 0 10px 24px rgba(0,0,0,.18);
  z-index: 3;
}
.bb-menu.hidden, .bb-tray.hidden, .bb-break.hidden, .bb-play.hidden,
.bb-bubble.hidden, .bb-timer.hidden, .bb-fx.hidden { display: none !important; }
.bb-btn {
  appearance: none;
  border: 2px solid #18324A;
  border-radius: 999px;
  background: #EF6A5B;
  color: #18324A;
  font-weight: 700;
  font-size: 13px;
  padding: 8px 10px;
  cursor: pointer;
  min-height: 36px;
}
.bb-btn.secondary { background: #B9DDF2; }
.bb-btn.ghost { background: transparent; }
.bb-tray, .bb-play { grid-template-columns: 1fr 1fr; min-width: 210px; }
.bb-timer {
  position: fixed;
  right: 16px;
  bottom: 16px;
  pointer-events: auto;
  background: #fff8ee;
  border: 2px solid #18324A;
  border-radius: 14px;
  padding: 10px 14px;
  font-weight: 800;
  color: #18324A;
  box-shadow: 0 8px 20px rgba(0,0,0,.15);
}
.bb-live {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.bb-paw {
  position: fixed;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(24,50,74,.22);
  pointer-events: none;
  animation: bb-fade 2.2s ease forwards;
}
@keyframes bb-fade { to { opacity: 0; transform: translateY(8px); } }
.bb-fx {
  position: fixed;
  pointer-events: none;
  font-size: 22px;
  font-weight: 900;
  color: #18324A;
  text-shadow: 0 2px 0 #fff8ee;
  z-index: 2147483647;
  transition: left 0.08s linear, bottom 0.08s linear, opacity 0.4s ease;
}
.bb-ball {
  position: fixed;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #fff, #E7AE32 45%, #c48a12);
  border: 2px solid #18324A;
  pointer-events: none;
  z-index: 2147483645;
}
.bb-drop {
  position: fixed;
  width: 4px;
  height: 8px;
  border-radius: 2px;
  background: rgba(80,160,220,.65);
  pointer-events: none;
  animation: bb-drip 0.9s ease forwards;
}
@keyframes bb-drip { to { opacity: 0; transform: translateY(28px); } }
`;

let shadow = null;
let dogWrap = null;
let dogImg = null;
let bubble = null;
let moodBadge = null;
let menu = null;
let tray = null;
let playTray = null;
let breakBox = null;
let timerBox = null;
let live = null;
let fxEl = null;
let layerEl = null;

let behavior = STATE_WALKING;
let facing = 1;
let x = 40;
let yBottom = 8;
let walkFrame = 0;
let settings = createDefaultSettings();
let appState = createDefaultState(Date.now());
let excitement = createDefaultExcitement(Date.now());
let hiddenByPage = false;
let dragging = false;
let dragOffsetX = 0;
let nextTransitionAt = Date.now() + 6000;
let frameTimer = null;
let loopTimer = null;
let engagedTimer = null;
let eventTimer = null;
let petting = false;
let lastScrollY = window.scrollY || 0;
let lastScrollAt = Date.now();
let busyEvent = false;
let squeakSession = 0;
let pawCooldownUntil = 0;

function send(type, payload) {
  return new Promise(function resolveSend(resolve) {
    chrome.runtime.sendMessage(Object.assign({ type: type }, payload || {}), function onResp(resp) {
      resolve(resp || { ok: false });
    });
  });
}

function announce(text) {
  if (live) {
    live.textContent = text;
  }
}

function setFrame(src) {
  if (dogImg && dogImg.getAttribute('src') !== src) {
    dogImg.setAttribute('src', src);
  }
}

function applySize() {
  const height = dogHeightForSize(settings.size);
  dogWrap.style.setProperty('--bb-h', `${height}px`);
}

function applyDogLook() {
  const dogType = getDogType(settings.dogType);
  dogWrap.style.setProperty('--bb-dog-filter', dogType.filter);
  if (dogImg) {
    dogImg.alt = settings.dogName || 'Dog';
  }
}

function soundEnabled() {
  return settings.sound === true;
}

function say(kind) {
  return pickSpeech(kind, Date.now(), settings.dogName);
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

function updateMoodBadge() {
  if (!moodBadge) {
    return;
  }
  moodBadge.textContent = moodLabel(excitement.mood || MOOD_CURIOUS);
}

function placeDog() {
  const maxX = Math.max(8, window.innerWidth - dogWrap.offsetWidth - 8);
  x = Math.min(maxX, Math.max(8, x));
  dogWrap.style.left = `${x}px`;
  dogWrap.style.bottom = `${yBottom}px`;
}

function showBubble(text) {
  bubble.textContent = text;
  bubble.classList.remove('hidden');
  announce(text);
}

function hideBubble() {
  bubble.classList.add('hidden');
}

function hidePanels() {
  menu.classList.add('hidden');
  tray.classList.add('hidden');
  playTray.classList.add('hidden');
  breakBox.classList.add('hidden');
}

function leavePawprint() {
  if (!layerEl || Date.now() < pawCooldownUntil) {
    return;
  }
  pawCooldownUntil = Date.now() + 420;
  const paw = document.createElement('div');
  paw.className = 'bb-paw';
  paw.style.left = `${x + 28}px`;
  paw.style.bottom = `${yBottom + 4}px`;
  layerEl.appendChild(paw);
  setTimeout(function removePaw() {
    paw.remove();
  }, 2300);
}

function spawnDrops() {
  for (let index = 0; index < 8; index += 1) {
    const drop = document.createElement('div');
    drop.className = 'bb-drop';
    drop.style.left = `${x + 20 + Math.random() * 80}px`;
    drop.style.bottom = `${yBottom + 60 + Math.random() * 40}px`;
    layerEl.appendChild(drop);
    setTimeout(function removeDrop() {
      drop.remove();
    }, 1000);
  }
}

function flashClass(className, ms) {
  dogWrap.classList.add(className);
  setTimeout(function clearClass() {
    dogWrap.classList.remove(className);
  }, ms || 800);
}

function persistExcitement(next) {
  excitement = next;
  updateMoodBadge();
  return send(MESSAGE.SAVE_EXCITEMENT, { excitement: excitement }).then(function onSaved(response) {
    if (response && response.state) {
      appState = response.state;
      excitement = response.state.excitement;
      updateMoodBadge();
    }
  });
}

function recordAction(action, detail, extra) {
  return send(
    MESSAGE.RECORD_ACTION,
    Object.assign({ action: action, detail: detail }, extra || {}),
  ).then(function onAction(response) {
    if (response && response.state) {
      appState = response.state;
      excitement = response.state.excitement;
      updateMoodBadge();
    }
    if (response && response.combo) {
      playCombo(response.combo);
    } else if (response && response.memoryLine && Math.random() < 0.35) {
      showBubble(response.memoryLine);
      setTimeout(hideBubble, 2500);
    }
    return response;
  });
}

function playCombo(combo) {
  showBubble(combo.speech);
  playFunSound('happy', soundEnabled());
  if (combo.effect === 'shake') {
    flashClass('shake', 700);
    spawnDrops();
  } else if (combo.effect === 'roll') {
    flashClass('roll', 900);
    setFrame(FRAMES.pet);
  } else if (combo.effect === 'refuse') {
    setFrame(FRAMES.sit);
  } else if (combo.effect === 'hide_ball') {
    setFrame(FRAMES.ask);
  } else if (combo.effect === 'ball_in_bowl') {
    setFrame(FRAMES.drink);
  }
  setBehavior(STATE_INTERACTING, 2800);
  setTimeout(function afterCombo() {
    hideBubble();
    setBehavior(STATE_LOOKING, 4000);
  }, 2600);
}

function updateWalkFrame() {
  if (behavior !== STATE_WALKING) {
    return;
  }
  walkFrame = (walkFrame + 1) % 2;
  const frames = facing > 0 ? FRAMES.walkRight : FRAMES.walkLeft;
  setFrame(frames[walkFrame]);
  leavePawprint();
}

function setBehavior(next, durationMs) {
  behavior = next;
  nextTransitionAt = Date.now() + (durationMs || 8000);
  if (next === STATE_WALKING) {
    updateWalkFrame();
  } else if (next === STATE_LOOKING) {
    setFrame(facing > 0 ? FRAMES.standRight : FRAMES.standLeft);
  } else if (next === STATE_RESTING) {
    setFrame(FRAMES.sit);
  } else if (next === STATE_SLEEPING) {
    setFrame(FRAMES.sleep);
  } else if (next === STATE_REQUESTING) {
    setFrame(FRAMES.ask);
  }
}

function shouldFlee() {
  const active = document.activeElement;
  if (active) {
    const tag = (active.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || active.isContentEditable) {
      const type = (active.getAttribute('type') || '').toLowerCase();
      if (
        type === 'password' ||
        tag === 'textarea' ||
        active.isContentEditable ||
        type === 'text' ||
        type === 'email' ||
        type === 'search'
      ) {
        return true;
      }
    }
  }
  if (document.fullscreenElement) {
    return true;
  }
  return false;
}

function maybeRequest() {
  if (busyEvent || behavior === STATE_INTERACTING || behavior === STATE_REQUESTING) {
    return;
  }
  if (!canOfferAttention(appState, Date.now())) {
    return;
  }
  if (canOfferBreak(appState, Date.now())) {
    startBreakRequest();
    return;
  }
  if (excitement.mood === MOOD_SNACK) {
    startCareRequest(REQUEST_FOOD);
    return;
  }
  if (Math.random() > 0.35) {
    return;
  }
  const kinds =
    excitement.mood === MOOD_PLAYFUL
      ? [REQUEST_PLAY, REQUEST_PLAY, REQUEST_WATER]
      : [REQUEST_FOOD, REQUEST_WATER, REQUEST_PLAY];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  startCareRequest(kind);
}

function startCareRequest(kind) {
  hidePanels();
  setBehavior(STATE_REQUESTING, 20000);
  x = Math.max(40, Math.min(window.innerWidth / 2 - 60, window.innerWidth - 160));
  placeDog();
  showBubble(say(kind));
  if (canBark(excitement, Date.now())) {
    playFunSound(kind === REQUEST_PLAY ? 'ask' : 'bark', soundEnabled());
    excitement = markBark(excitement, Date.now());
    persistExcitement(excitement);
  } else {
    playFunSound('ask', soundEnabled());
  }
  send(MESSAGE.RECORD_REQUEST, { kind: kind });
  menu.dataset.pending = kind;
  if (kind === REQUEST_FOOD) {
    setTimeout(function maybeIgnore() {
      if (behavior === STATE_REQUESTING && menu.dataset.pending === REQUEST_FOOD) {
        recordAction(ACTION_IGNORE_FOOD);
      }
    }, 18000);
  }
}

function startBreakRequest() {
  hidePanels();
  setBehavior(STATE_REQUESTING, 30000);
  x = Math.max(40, window.innerWidth / 2 - 80);
  yBottom = Math.max(8, Math.floor(window.innerHeight * 0.2));
  placeDog();
  showBubble(say(REQUEST_BREAK));
  playFunSound('jingle', soundEnabled());
  breakBox.classList.remove('hidden');
  send(MESSAGE.RECORD_REQUEST, { kind: REQUEST_BREAK });
}

function runZoomies() {
  busyEvent = true;
  setBehavior(STATE_WALKING, 8000);
  showBubble(say('zoomies'));
  let hops = 0;
  const zoom = setInterval(function hop() {
    facing = hops % 2 === 0 ? 1 : -1;
    x = hops % 2 === 0 ? window.innerWidth - 160 : 24;
    yBottom = 8 + (hops % 2) * 18;
    placeDog();
    hops += 1;
    if (hops >= 4) {
      clearInterval(zoom);
      setFrame(FRAMES.sleep);
      showBubble('Dramatic collapse.');
      setBehavior(STATE_SLEEPING, 12000);
      busyEvent = false;
      setTimeout(hideBubble, 2000);
    }
  }, 700);
}

function runSquirrel() {
  busyEvent = true;
  fxEl.textContent = '🐿️';
  fxEl.classList.remove('hidden');
  let squirrelX = -40;
  fxEl.style.bottom = '18px';
  fxEl.style.left = `${squirrelX}px`;
  showBubble('SQUIRREL— I mean, nothing.');
  setBehavior(STATE_WALKING, 6000);
  const chase = setInterval(function chaseTick() {
    squirrelX += 18;
    fxEl.style.left = `${squirrelX}px`;
    facing = 1;
    x = Math.min(squirrelX - 40, window.innerWidth - 120);
    placeDog();
    if (squirrelX > window.innerWidth + 40) {
      clearInterval(chase);
      fxEl.classList.add('hidden');
      showBubble('Chase closed. Pride open.');
      setBehavior(STATE_LOOKING, 5000);
      busyEvent = false;
      setTimeout(hideBubble, 2500);
    }
  }, 40);
}

function runDelivery() {
  busyEvent = true;
  fxEl.textContent = '📦';
  fxEl.classList.remove('hidden');
  fxEl.style.left = `${Math.min(x + 90, window.innerWidth - 40)}px`;
  fxEl.style.bottom = `${yBottom + 10}px`;
  showBubble('Package sniffed. Contents: destiny.');
  setFrame(FRAMES.ask);
  setBehavior(STATE_INTERACTING, 5000);
  setTimeout(function openBox() {
    fxEl.classList.add('hidden');
    const find = pickFind(excitement, false);
    if (find) {
      send(MESSAGE.RECORD_FIND, { findId: find.id }).then(function onFind(response) {
        if (response && response.state) {
          appState = response.state;
          excitement = response.state.excitement;
        }
        showBubble(
          response && response.added
            ? `Found: ${find.name}`
            : 'Box contained… vibes.',
        );
      });
    } else {
      showBubble('Box contained… vibes.');
    }
    setFrame(FRAMES.play);
    busyEvent = false;
    setTimeout(function afterDelivery() {
      hideBubble();
      setBehavior(STATE_WALKING, 6000);
    }, 2800);
  }, 1800);
}

function runBathEscape() {
  busyEvent = true;
  setFrame(FRAMES.play);
  flashClass('shake', 700);
  spawnDrops();
  showBubble('I was never wet. You imagined it.');
  setBehavior(STATE_INTERACTING, 4000);
  setTimeout(function afterBath() {
    hideBubble();
    busyEvent = false;
    setBehavior(STATE_WALKING, 5000);
  }, 3500);
}

function runDream() {
  if (behavior !== STATE_SLEEPING) {
    return;
  }
  busyEvent = true;
  const dreams = ['🎾', '🍪', '🐿️', '🪵'];
  fxEl.textContent = dreams[Math.floor(Math.random() * dreams.length)];
  fxEl.classList.remove('hidden');
  fxEl.style.left = `${x + 40}px`;
  fxEl.style.bottom = `${yBottom + 110}px`;
  showBubble('…giant biscuit… yes…');
  setTimeout(function endDream() {
    fxEl.classList.add('hidden');
    hideBubble();
    busyEvent = false;
  }, 4000);
}

function runInspect() {
  busyEvent = true;
  setFrame(FRAMES.ask);
  showBubble('Page inspected. Several suspicious buttons.');
  setBehavior(STATE_INTERACTING, 5000);
  setTimeout(function afterInspect() {
    hideBubble();
    busyEvent = false;
    setBehavior(STATE_LOOKING, 5000);
  }, 4500);
}

function runUltraEvent(event) {
  busyEvent = true;
  showBubble(event.speech);
  if (event.id === 'duck_parade') {
    let duckX = -20;
    fxEl.textContent = '🦆🦆🦆';
    fxEl.classList.remove('hidden');
    const parade = setInterval(function paradeTick() {
      duckX += 12;
      fxEl.style.left = `${duckX}px`;
      fxEl.style.bottom = '24px';
      if (duckX > window.innerWidth + 40) {
        clearInterval(parade);
        fxEl.classList.add('hidden');
        busyEvent = false;
        hideBubble();
      }
    }, 50);
    send(MESSAGE.RECORD_FIND, { findId: 'duck_parade' });
    return;
  }
  if (event.id === 'golden_ball') {
    send(MESSAGE.RECORD_FIND, { findId: 'golden_ball' });
    setFrame(FRAMES.play);
  } else if (event.id === 'friend') {
    fxEl.textContent = '🐶';
    fxEl.classList.remove('hidden');
    fxEl.style.left = `${Math.max(20, x - 90)}px`;
    fxEl.style.bottom = `${yBottom}px`;
    send(MESSAGE.RECORD_FIND, { findId: 'mystery_friend' });
  } else if (event.id === 'inspector') {
    setFrame(FRAMES.ask);
  } else {
    fxEl.textContent = '🎂';
    fxEl.classList.remove('hidden');
    fxEl.style.left = `${x + 70}px`;
    fxEl.style.bottom = `${yBottom + 20}px`;
  }
  setBehavior(STATE_INTERACTING, 6000);
  setTimeout(function endUltra() {
    fxEl.classList.add('hidden');
    hideBubble();
    busyEvent = false;
    setBehavior(STATE_WALKING, 6000);
  }, 5500);
}

function maybeEvent() {
  if (busyEvent || behavior === STATE_REQUESTING || behavior === STATE_INTERACTING) {
    return;
  }
  const rolled = rollEvent(excitement, Date.now());
  if (!rolled) {
    if (behavior === STATE_SLEEPING && Math.random() < 0.08) {
      runDream();
    }
    return;
  }
  excitement = rolled.excitement;
  persistExcitement(excitement);
  if (rolled.kind === 'ultra') {
    runUltraEvent(rolled.event);
    return;
  }
  const id = rolled.event.id;
  if (id === 'squirrel') {
    runSquirrel();
  } else if (id === 'delivery') {
    runDelivery();
  } else if (id === 'zoomies') {
    runZoomies();
  } else if (id === 'bath') {
    runBathEscape();
  } else if (id === 'dream') {
    runDream();
  } else {
    runInspect();
  }
}

function tickMovement() {
  if (dragging || hiddenByPage || !settings.visible || isPaused(appState, Date.now())) {
    return;
  }
  if (shouldFlee() && behavior !== STATE_HIDDEN) {
    yBottom = 8;
    x = facing > 0 ? window.innerWidth + 20 : -200;
    placeDog();
    setBehavior(STATE_WALKING, 4000);
    hideBubble();
    hidePanels();
    return;
  }
  if (behavior === STATE_WALKING) {
    const speed = excitement.mood === MOOD_PLAYFUL ? 3.1 : excitement.mood === MOOD_RELAXED ? 1.4 : 2.2;
    x += facing * speed;
    if (x > window.innerWidth - 40) {
      if (Math.random() < 0.25) {
        facing = -1;
        x = window.innerWidth - 40;
        showBubble('Edge detected. Retrying.');
        setTimeout(hideBubble, 1200);
      } else {
        facing = -1;
        x = window.innerWidth - 40;
      }
    }
    if (x < 8) {
      facing = 1;
      x = 8;
    }
    yBottom = 8;
    placeDog();
  }
  if (
    Date.now() >= nextTransitionAt &&
    behavior !== STATE_INTERACTING &&
    behavior !== STATE_REQUESTING &&
    !busyEvent
  ) {
    const roll = Math.random();
    if (behavior === STATE_WALKING) {
      if (excitement.mood === MOOD_RELAXED || roll < 0.35) {
        setBehavior(STATE_RESTING, 20000 + Math.random() * 40000);
      } else if (roll < 0.55) {
        setBehavior(STATE_LOOKING, 4000 + Math.random() * 4000);
      } else if (roll < 0.8) {
        setBehavior(STATE_SLEEPING, 30000 + Math.random() * 30000);
        maybeRequest();
      } else {
        setBehavior(STATE_LOOKING, 5000);
        maybeEvent();
      }
    } else if (
      behavior === STATE_SLEEPING ||
      behavior === STATE_RESTING ||
      behavior === STATE_LOOKING
    ) {
      facing = Math.random() > 0.5 ? 1 : -1;
      setBehavior(STATE_WALKING, 5000 + Math.random() * 5000);
      hideBubble();
    } else if (behavior === STATE_REQUESTING) {
      hideBubble();
      hidePanels();
      setBehavior(STATE_WALKING, 6000);
      yBottom = 8;
    }
  }
}

function openMenu() {
  hideBubble();
  tray.classList.add('hidden');
  playTray.classList.add('hidden');
  breakBox.classList.add('hidden');
  menu.classList.remove('hidden');
}

function onPetVariant(kind) {
  petting = true;
  hidePanels();
  setBehavior(STATE_INTERACTING, 2500);
  if (kind === ACTION_BOOP) {
    setFrame(FRAMES.pet);
    showBubble(say('boop'));
  } else if (kind === ACTION_BELLY) {
    setFrame(FRAMES.sit);
    showBubble(say('belly'));
  } else {
    setFrame(FRAMES.pet);
    showBubble(say('pet'));
  }
  playFunSound('pet', soundEnabled());
  recordAction(kind);
  setTimeout(function afterPet() {
    petting = false;
    if (behavior === STATE_INTERACTING) {
      hideBubble();
      setBehavior(STATE_LOOKING, 3000);
    }
  }, 1100);
}

function onWakeIfSleeping() {
  if (behavior !== STATE_SLEEPING) {
    return false;
  }
  const line = wakeReaction(settings.personality || PERSONALITY_GOOFY);
  showBubble(line);
  setFrame(FRAMES.bark);
  setBehavior(STATE_INTERACTING, 2500);
  recordAction(ACTION_WAKE);
  playFunSound('bark', soundEnabled());
  setTimeout(function afterWake() {
    hideBubble();
    setBehavior(STATE_LOOKING, 4000);
  }, 2200);
  return true;
}

function feedItem(kind) {
  tray.classList.add('hidden');
  setBehavior(STATE_INTERACTING, 2800);
  if (kind === 'water') {
    setFrame(FRAMES.drink);
    playFunSound('drink', soundEnabled());
    recordAction(ACTION_WATER);
  } else {
    setFrame(FRAMES.eat);
    playFunSound('eat', soundEnabled());
    recordAction(ACTION_FEED, kind);
  }
  send(MESSAGE.SET_FULL).then(function onFed(response) {
    showBubble((response && response.message) || say('thanks'));
    if (response && response.state) {
      appState = response.state;
      excitement = response.state.excitement || excitement;
      updateMoodBadge();
    }
    setTimeout(function doneFeed() {
      hideBubble();
      setBehavior(STATE_RESTING, 15000);
    }, 2200);
  });
}

function throwBall() {
  playTray.classList.add('hidden');
  setBehavior(STATE_INTERACTING, 4000);
  const ball = document.createElement('div');
  ball.className = 'bb-ball';
  let ballX = x + 60;
  let ballY = yBottom + 80;
  let vx = facing * (7 + Math.random() * 5);
  let vy = 6 + Math.random() * 4;
  ball.style.left = `${ballX}px`;
  ball.style.bottom = `${ballY}px`;
  layerEl.appendChild(ball);
  showBubble(excitement.finds.indexOf('golden_ball') !== -1 ? 'Golden fetch!' : 'Fetch!');
  playFunSound('play', soundEnabled());
  let hops = 0;
  const bounce = setInterval(function bounceTick() {
    ballX += vx;
    ballY += vy;
    vy -= 0.55;
    if (ballY <= 12) {
      ballY = 12;
      vy = Math.abs(vy) * 0.55;
      hops += 1;
    }
    if (ballX < 8 || ballX > window.innerWidth - 20) {
      vx *= -1;
    }
    ball.style.left = `${ballX}px`;
    ball.style.bottom = `${ballY}px`;
    x += (ballX - x) * 0.18;
    placeDog();
    setFrame(FRAMES.play);
    if (hops >= 3 || Math.abs(ballX - x) < 28) {
      clearInterval(bounce);
      ball.remove();
      const refuse = Math.random() < 0.12;
      if (refuse) {
        showBubble('Ball? What ball?');
      } else if (Math.random() < 0.08) {
        showBubble('Wrong object. Still proud.');
      } else {
        showBubble(say('thanks'));
      }
      recordAction(ACTION_FETCH).then(function afterFetch(response) {
        if (response && !response.combo && Math.random() < 0.25) {
          runZoomies();
        } else {
          setTimeout(function donePlay() {
            hideBubble();
            setBehavior(STATE_WALKING, 5000);
          }, 1800);
        }
      });
    }
  }, 30);
}

function playSqueak() {
  playTray.classList.add('hidden');
  squeakSession += 1;
  excitement = Object.assign({}, excitement, { squeakCount: squeakSession });
  if (squeakSession === 1) {
    setBehavior(STATE_WALKING, 3000);
    x = Math.max(24, Math.min(window.innerWidth - 160, window.innerWidth / 2));
    placeDog();
    showBubble('I heard that.');
    playFunSound('ask', soundEnabled());
  } else if (squeakSession === 2) {
    setFrame(FRAMES.ask);
    showBubble('Head tilt unlocked.');
    setBehavior(STATE_LOOKING, 3000);
  } else {
    showBubble('Toy confiscated. For science.');
    setFrame(FRAMES.play);
    squeakSession = 0;
    setBehavior(STATE_INTERACTING, 2500);
  }
  recordAction(ACTION_SQUEAK);
  setTimeout(hideBubble, 2000);
}

function playTug() {
  playTray.classList.add('hidden');
  setBehavior(STATE_INTERACTING, 3500);
  setFrame(FRAMES.play);
  const win = Math.random() > 0.45;
  if (win) {
    showBubble('Victory! …wait.');
    setTimeout(function loseEarly() {
      showBubble('Celebrated too early. Rematch pending.');
    }, 1200);
  } else {
    showBubble('Grip renegotiation in progress.');
  }
  playFunSound('play', soundEnabled());
  recordAction(ACTION_FETCH, 'tug');
  setTimeout(function afterTug() {
    hideBubble();
    setBehavior(STATE_WALKING, 5000);
  }, 2800);
}

function acceptBreak() {
  breakBox.classList.add('hidden');
  hideBubble();
  setBehavior(STATE_WALKING, 5000);
  facing = 1;
  recordAction(ACTION_WALKIES, 'accept');
  const walkOff = setInterval(function leave() {
    x += 8;
    placeDog();
    if (x > window.innerWidth + 40) {
      clearInterval(walkOff);
      dogWrap.style.opacity = '0';
    }
  }, 30);
  send(MESSAGE.START_BREAK).then(function onBreak(response) {
    timerBox.classList.remove('hidden');
    const endsAt = (response && response.endsAt) || Date.now() + 120000;
    const tick = setInterval(function updateTimer() {
      const left = Math.max(0, endsAt - Date.now());
      timerBox.textContent = `Walk ${formatMs(left)}`;
      if (left <= 0) {
        clearInterval(tick);
        timerBox.classList.add('hidden');
        dogWrap.style.opacity = '1';
        x = 40;
        facing = 1;
        placeDog();
        setFrame(FRAMES.play);
        send(MESSAGE.END_BREAK).then(function onEnd(endResponse) {
          if (endResponse && endResponse.state) {
            appState = endResponse.state;
            excitement = endResponse.state.excitement;
            updateMoodBadge();
          }
          if (endResponse && endResponse.find && endResponse.added) {
            showBubble(`Found: ${endResponse.find.name}`);
          } else {
            showBubble(say('returnBreak'));
          }
          playFunSound('happy', soundEnabled());
          setBehavior(STATE_INTERACTING, 4000);
          setTimeout(function afterReturn() {
            hideBubble();
            setBehavior(STATE_WALKING, 6000);
          }, 3500);
        });
      }
    }, 250);
  });
}

function onFastScroll() {
  const now = Date.now();
  const currentY = window.scrollY || 0;
  const delta = Math.abs(currentY - lastScrollY);
  const elapsed = now - lastScrollAt;
  lastScrollY = currentY;
  lastScrollAt = now;
  if (elapsed > 0 && delta / elapsed > 2.8 && behavior !== STATE_INTERACTING && !busyEvent) {
    flashClass('dizzy', 800);
    setFrame(FRAMES.ask);
    showBubble(say('skid'));
    setBehavior(STATE_INTERACTING, 2200);
    x = Math.min(window.innerWidth - 140, Math.max(24, x + (facing > 0 ? 40 : -40)));
    placeDog();
    setTimeout(function afterSkid() {
      hideBubble();
      setBehavior(STATE_LOOKING, 3000);
    }, 2000);
  } else if (behavior === STATE_LOOKING || behavior === STATE_RESTING) {
    setFrame(facing > 0 ? FRAMES.standRight : FRAMES.standLeft);
  }
}

function buildUi() {
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('data-barkbreak', 'pet');
  document.documentElement.appendChild(host);
  shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = STYLE;
  const layer = document.createElement('div');
  layer.className = 'bb-layer';
  layer.innerHTML = `
    <div class="bb-live" aria-live="polite"></div>
    <div class="bb-fx hidden" aria-hidden="true"></div>
    <div class="bb-dog-wrap" data-testid="barkbreak-dog">
      <div class="bb-mood" data-testid="barkbreak-mood">Curious</div>
      <div class="bb-bubble hidden"></div>
      <div class="bb-menu hidden">
        <button type="button" class="bb-btn" data-act="pet">Pet</button>
        <button type="button" class="bb-btn" data-act="feed">Feed</button>
        <button type="button" class="bb-btn" data-act="water">Water</button>
        <button type="button" class="bb-btn" data-act="play">Play</button>
        <button type="button" class="bb-btn secondary" data-act="boop">Nose boop</button>
        <button type="button" class="bb-btn secondary" data-act="belly">Belly rub</button>
        <button type="button" class="bb-btn ghost" data-act="move">Move</button>
        <button type="button" class="bb-btn ghost" data-act="hide">Hide</button>
        <button type="button" class="bb-btn ghost" data-act="pause">Pause</button>
      </div>
      <div class="bb-tray hidden">
        <button type="button" class="bb-btn secondary" data-food="kibble">Dog food</button>
        <button type="button" class="bb-btn secondary" data-food="biscuit">Biscuit</button>
        <button type="button" class="bb-btn secondary" data-food="carrot">Carrot</button>
        <button type="button" class="bb-btn secondary" data-food="water">Water</button>
      </div>
      <div class="bb-play hidden">
        <button type="button" class="bb-btn secondary" data-toy="ball">Ball</button>
        <button type="button" class="bb-btn secondary" data-toy="squeak">Squeaky</button>
        <button type="button" class="bb-btn secondary" data-toy="tug">Tug rope</button>
      </div>
      <div class="bb-break hidden">
        <button type="button" class="bb-btn" data-break="yes">Take a 2-minute break</button>
        <button type="button" class="bb-btn secondary" data-break="later">Later</button>
        <button type="button" class="bb-btn ghost" data-break="no">Not today</button>
      </div>
      <img class="bb-dog" alt="Biscuit the dog" draggable="false" />
    </div>
    <div class="bb-timer hidden" data-testid="barkbreak-timer"></div>
  `;
  shadow.appendChild(style);
  shadow.appendChild(layer);
  layerEl = layer;
  dogWrap = shadow.querySelector('.bb-dog-wrap');
  dogImg = shadow.querySelector('.bb-dog');
  bubble = shadow.querySelector('.bb-bubble');
  moodBadge = shadow.querySelector('.bb-mood');
  menu = shadow.querySelector('.bb-menu');
  tray = shadow.querySelector('.bb-tray');
  playTray = shadow.querySelector('.bb-play');
  breakBox = shadow.querySelector('.bb-break');
  timerBox = shadow.querySelector('.bb-timer');
  live = shadow.querySelector('.bb-live');
  fxEl = shadow.querySelector('.bb-fx');

  dogWrap.addEventListener('click', function onDogClick(event) {
    event.stopPropagation();
    unlockFunAudio().then(function afterUnlock() {
      if (dragging) {
        return;
      }
      if (onWakeIfSleeping()) {
        return;
      }
      openMenu();
    });
  });

  dogWrap.addEventListener('pointerdown', function onPointerDown(event) {
    if (event.button !== 0) {
      return;
    }
    if (event.target.closest('.bb-btn')) {
      unlockFunAudio();
      return;
    }
    dragging = false;
    dragOffsetX = event.clientX - x;
    dogWrap.classList.add('dragging');
    dogWrap.setPointerCapture(event.pointerId);
    unlockFunAudio().then(function afterUnlock() {
      if (behavior === STATE_SLEEPING) {
        onWakeIfSleeping();
      } else {
        onPetVariant(ACTION_PET);
      }
    });
  });

  dogWrap.addEventListener('pointermove', function onPointerMove(event) {
    if (!dogWrap.hasPointerCapture(event.pointerId)) {
      return;
    }
    const nextX = event.clientX - dragOffsetX;
    if (Math.abs(nextX - x) > 4) {
      dragging = true;
    }
    if (dragging) {
      x = nextX;
      yBottom = Math.max(8, window.innerHeight - event.clientY - 40);
      yBottom = Math.min(yBottom, Math.floor(window.innerHeight * 0.45));
      placeDog();
    }
  });

  dogWrap.addEventListener('pointerup', function onPointerUp(event) {
    dogWrap.releasePointerCapture(event.pointerId);
    dogWrap.classList.remove('dragging');
    if (dragging) {
      recordAction(ACTION_PET, 'move', { cornerX: x });
    }
    setTimeout(function clearDrag() {
      dragging = false;
    }, 50);
  });

  menu.querySelectorAll('[data-act]').forEach(function bindAct(button) {
    button.addEventListener('click', function onAct(event) {
      event.stopPropagation();
      const act = button.getAttribute('data-act');
      hidePanels();
      if (act === 'pet') {
        onPetVariant(ACTION_PET);
      } else if (act === 'boop') {
        onPetVariant(ACTION_BOOP);
      } else if (act === 'belly') {
        onPetVariant(ACTION_BELLY);
      } else if (act === 'feed') {
        tray.classList.remove('hidden');
      } else if (act === 'water') {
        feedItem('water');
      } else if (act === 'play') {
        playTray.classList.remove('hidden');
      } else if (act === 'move') {
        x = Math.random() > 0.5 ? 24 : window.innerWidth - 180;
        yBottom = 8;
        placeDog();
        recordAction(ACTION_PET, 'move', { cornerX: x });
        setBehavior(STATE_WALKING, 5000);
      } else if (act === 'hide') {
        dogWrap.style.display = 'none';
        send(MESSAGE.TOGGLE_VISIBLE, { visible: false });
      } else if (act === 'pause') {
        send(MESSAGE.PAUSE_HOUR);
        dogWrap.style.display = 'none';
      }
    });
  });

  tray.querySelectorAll('[data-food]').forEach(function bindFood(button) {
    button.addEventListener('click', function onFood(event) {
      event.stopPropagation();
      feedItem(button.getAttribute('data-food'));
    });
  });

  playTray.querySelectorAll('[data-toy]').forEach(function bindToy(button) {
    button.addEventListener('click', function onToy(event) {
      event.stopPropagation();
      const toy = button.getAttribute('data-toy');
      if (toy === 'ball') {
        throwBall();
      } else if (toy === 'squeak') {
        playSqueak();
      } else {
        playTug();
      }
    });
  });

  breakBox.querySelectorAll('[data-break]').forEach(function bindBreak(button) {
    button.addEventListener('click', function onBreak(event) {
      event.stopPropagation();
      const choice = button.getAttribute('data-break');
      breakBox.classList.add('hidden');
      if (choice === 'yes') {
        acceptBreak();
      } else {
        recordAction(ACTION_WALKIES, 'decline');
        showBubble(say('later'));
        playFunSound('sigh', soundEnabled());
        yBottom = 8;
        setBehavior(STATE_SLEEPING, 20000);
        setTimeout(hideBubble, 2000);
      }
    });
  });
}

function syncFromStorage(state) {
  appState = state;
  settings = state.settings;
  excitement = state.excitement || createDefaultExcitement(Date.now());
  applySize();
  applyDogLook();
  updateMoodBadge();
  const paused = isPaused(state, Date.now()) || !settings.visible;
  if (!dogWrap.classList.contains('waiting')) {
    dogWrap.style.display = paused ? 'none' : 'block';
  }
}

function revealDog() {
  dogWrap.classList.remove('waiting');
  const paused = isPaused(appState, Date.now()) || !settings.visible;
  dogWrap.style.display = paused ? 'none' : 'block';
}

function onVisibility() {
  if (document.visibilityState === 'hidden') {
    if (frameTimer) {
      clearInterval(frameTimer);
      frameTimer = null;
    }
    if (loopTimer) {
      clearInterval(loopTimer);
      loopTimer = null;
    }
  } else {
    startLoops();
  }
}

function startLoops() {
  if (!frameTimer) {
    frameTimer = setInterval(updateWalkFrame, 180);
  }
  if (!loopTimer) {
    loopTimer = setInterval(tickMovement, 32);
  }
  if (!engagedTimer) {
    engagedTimer = setInterval(function engagedTick() {
      if (document.visibilityState !== 'visible' || !document.hasFocus()) {
        return;
      }
      send('ENGAGED_TICK', { ms: 15000 }).then(function onTick(response) {
        if (response && response.state) {
          appState = response.state;
          excitement = response.state.excitement || excitement;
          updateMoodBadge();
        }
        if (response && (response.canRequest || response.canBreak)) {
          maybeRequest();
        }
      });
    }, 15000);
  }
  if (!eventTimer) {
    eventTimer = setInterval(function eventTick() {
      if (document.visibilityState !== 'visible') {
        return;
      }
      maybeEvent();
    }, 45000);
  }
}

function boot() {
  if (window.__barkBreakPetLoaded) {
    return;
  }
  window.__barkBreakPetLoaded = true;
  if (isRestrictedUrl(location.href)) {
    return;
  }
  buildUi();
  dogWrap.classList.add('waiting');
  x = Math.random() > 0.5 ? -120 : window.innerWidth + 20;
  facing = x < 0 ? 1 : -1;
  placeDog();
  setBehavior(STATE_WALKING, 8000);
  send(MESSAGE.GET_STATE).then(function onState(response) {
    if (response && response.state) {
      syncFromStorage(response.state);
    }
    const delayMs = (settings.appearDelaySeconds || 0) * 1000;
    setTimeout(revealDog, delayMs);
    startLoops();
  });
  chrome.storage.onChanged.addListener(function onChange(changes, area) {
    if (area !== 'local' || !changes[STORAGE_KEY]) {
      return;
    }
    syncFromStorage(validateState(changes[STORAGE_KEY].newValue, Date.now()));
  });
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', placeDog);
  window.addEventListener('scroll', onFastScroll, { passive: true });
}

boot();
