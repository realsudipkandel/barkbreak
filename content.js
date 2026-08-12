'use strict';

const HOST_ID = 'barkbreak-dog-root';
const CONTENT_INSTANCE_ID = 'paw-pause-2.4.4';

let extensionAlive = true;
let engagedTimer = null;
let eventTimer = null;
let fetchGame = null;
let rafId = null;

function isExtensionContextValid() {
  if (!extensionAlive) {
    return false;
  }
  try {
    return Boolean(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
  } catch (error) {
    return false;
  }
}

function stopBackgroundTimers() {
  if (engagedTimer) {
    clearInterval(engagedTimer);
    engagedTimer = null;
  }
  if (eventTimer) {
    clearInterval(eventTimer);
    eventTimer = null;
  }
}

function teardownInvalidatedExtension() {
  if (!extensionAlive) {
    return;
  }
  extensionAlive = false;
  try {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  } catch (error) {
    rafId = null;
  }
  stopBackgroundTimers();
  try {
    if (fetchGame) {
      endFetchGame(true);
    }
  } catch (error) {
    fetchGame = null;
  }
  try {
    const host = document.getElementById(HOST_ID);
    if (host) {
      host.remove();
    }
  } catch (error) {
    // Host may already be gone with the page.
  }
}

function companionAssetUrl(folder, name) {
  if (!isExtensionContextValid()) {
    return '';
  }
  try {
    return chrome.runtime.getURL(`assets/${folder}/${name}`);
  } catch (error) {
    if (isExtensionContextInvalidationError(error)) {
      teardownInvalidatedExtension();
    }
    return '';
  }
}

function buildPoseFrames(folder) {
  const standRight = companionAssetUrl(folder, 'stand-right.png');
  const standLeft = companionAssetUrl(folder, 'stand-left.png');
  return Object.freeze({
    standRight: standRight,
    standLeft: standLeft,
    walkRight: Object.freeze([
      companionAssetUrl(folder, 'walk-right-1.png'),
      standRight,
      companionAssetUrl(folder, 'walk-right-2.png'),
      standRight,
    ]),
    walkLeft: Object.freeze([
      companionAssetUrl(folder, 'walk-left-1.png'),
      standLeft,
      companionAssetUrl(folder, 'walk-left-2.png'),
      standLeft,
    ]),
    sit: companionAssetUrl(folder, 'sit.png'),
    sleep: companionAssetUrl(folder, 'sleep.png'),
    ask: companionAssetUrl(folder, 'ask.png'),
    eat: companionAssetUrl(folder, 'eat.png'),
    drink: companionAssetUrl(folder, 'drink.png'),
    play: companionAssetUrl(folder, 'play.png'),
    pet: companionAssetUrl(folder, 'pet.png'),
    bark: companionAssetUrl(folder, 'bark.png'),
  });
}

let poseFrames = buildPoseFrames(ASSET_FOLDER_DOG);

const WALK_POSE_CROSSFADE_MS = 70;
const WALK_BOB_PX = WALK_BOB_AMPLITUDE_PX;
const MOVEMENT_BASE_MS = 16.67;
const POINTER_TRACK_MS = 32;

const STYLE = `
:host { all: initial; }
.bb-layer {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  pointer-events: none;
  font-family: "Trebuchet MS", "Segoe UI", sans-serif;
  perspective: 900px;
}
.bb-dog-wrap {
  position: fixed;
  bottom: 0;
  left: 0;
  pointer-events: auto;
  cursor: grab;
  user-select: none;
  touch-action: none;
  will-change: transform;
  transition: opacity 0.35s ease;
  transform: translate3d(40px, -8px, 0);
  contain: layout style;
}
.bb-dog-wrap.waiting { opacity: 0; pointer-events: none; }
.bb-dog-wrap.dragging { cursor: grabbing; transition: none; }
.bb-dog-wrap.dizzy .bb-dog-stage { animation: bb-dizzy 0.8s ease; }
.bb-dog-wrap.shake .bb-dog-stage { animation: bb-shake 0.7s ease; }
.bb-dog-wrap.roll .bb-dog-stage { animation: bb-roll 0.9s ease; }
@keyframes bb-dizzy { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-8deg)} 75%{transform:rotate(8deg)} }
@keyframes bb-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} }
@keyframes bb-roll { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
.bb-dog-stage {
  position: relative;
  display: block;
  height: var(--bb-h, 140px);
  width: max-content;
  max-width: 58vw;
}
.bb-dog-presence {
  position: relative;
  display: block;
  height: 100%;
  width: max-content;
  max-width: 58vw;
  transform-origin: 50% 88%;
  transform-style: preserve-3d;
  will-change: transform;
  transition: transform 0.12s linear;
}
.bb-dog-shadow {
  position: absolute;
  left: 50%;
  bottom: 4px;
  width: min(72%, 150px);
  height: 14px;
  transform: translateX(-50%) scale(var(--bb-shadow-sx, 1), var(--bb-shadow-sy, 1));
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(12, 18, 28, 0.38) 0%, rgba(12, 18, 28, 0.16) 42%, rgba(12, 18, 28, 0) 72%);
  opacity: var(--bb-shadow-op, 0.38);
  pointer-events: none;
  z-index: 0;
  filter: blur(1.5px);
}
.bb-dog {
  display: block;
  height: var(--bb-h, 140px);
  width: auto;
  max-width: 58vw;
  object-fit: contain;
  -webkit-user-drag: none;
  filter: var(--bb-dog-filter, none);
  backface-visibility: hidden;
  transform: translateZ(0);
  z-index: 1;
}
.bb-dog.bb-dog-crossfade {
  transition: opacity ${WALK_POSE_CROSSFADE_MS}ms ease-out;
}
.bb-dog.bb-dog-back {
  position: absolute;
  left: 0;
  bottom: 0;
  opacity: 0;
  pointer-events: none;
}
.bb-dog.bb-dog-front {
  position: relative;
  opacity: 1;
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
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #fff, #E7AE32 45%, #c48a12);
  border: 2px solid #18324A;
  pointer-events: none;
  z-index: 2147483645;
  box-shadow: 0 2px 0 rgba(24, 50, 74, 0.25);
  touch-action: none;
  user-select: none;
}
.bb-ball.throwable {
  pointer-events: auto;
  cursor: grab;
  width: 28px;
  height: 28px;
}
.bb-ball.throwable:active,
.bb-ball.dragging {
  cursor: grabbing;
}
.bb-ball.carried {
  opacity: 0;
  pointer-events: none;
}
.bb-fetch-hint {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  background: rgba(255, 248, 238, 0.95);
  color: #18324A;
  border: 2px solid #18324A;
  border-radius: 14px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 700;
  pointer-events: none;
  z-index: 2147483646;
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
let dogPresence = null;
let dogImg = null;
let dogImgBack = null;
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
let walkAnimStartedAt = 0;
let walkBob = 0;
let settings = createDefaultSettings();
let appState = createDefaultState(Date.now());
let excitement = createDefaultExcitement(Date.now());
let hiddenByPage = false;
let dragging = false;
let dragOffsetX = 0;
let nextTransitionAt = Date.now() + 6000;
let lastFrameTs = 0;
let petting = false;
let lastScrollY = window.scrollY || 0;
let lastScrollAt = Date.now();
let busyEvent = false;
let squeakSession = 0;
let pawCooldownUntil = 0;
let frontIsPrimary = true;
let currentFrameSrc = '';
let crossfadeTimer = null;
let walkDistanceAccum = 0;
let nextDiscoverDistance = 420;
let lastWalkDiscoverAt = 0;
let discoverBusyUntil = 0;
let pointerClientX = 0;
let pointerClientY = 0;
let lastPointerTrackAt = 0;
let stageBreath = 1;
let stageLeanX = 0;
let stageLeanY = 0;

function send(type, payload) {
  return new Promise(function resolveSend(resolve) {
    if (!isExtensionContextValid()) {
      teardownInvalidatedExtension();
      resolve({ ok: false, invalidated: true });
      return;
    }

    let settled = false;
    function finish(result) {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    }

    function failFromError(error) {
      if (isExtensionContextInvalidationError(error)) {
        teardownInvalidatedExtension();
      }
      finish({
        ok: false,
        error: String(error && error.message ? error.message : error),
        invalidated: isExtensionContextInvalidationError(error),
      });
    }

    try {
      const maybePromise = chrome.runtime.sendMessage(
        Object.assign({ type: type }, payload || {}),
        function onResp(resp) {
          const runtimeError = chrome.runtime.lastError;
          if (runtimeError) {
            failFromError(runtimeError);
            return;
          }
          finish(resp || { ok: false });
        },
      );
      // Chrome may also return a Promise that rejects on invalidated context.
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then(
          function onMessageOk(resp) {
            if (!settled) {
              finish(resp || { ok: false });
            }
          },
          function onMessageFail(error) {
            failFromError(error);
          },
        );
      }
    } catch (error) {
      failFromError(error);
    }
  });
}

function announce(text) {
  if (live) {
    live.textContent = text;
  }
}

function preloadPoseFrames(frames) {
  const urls = [
    frames.standRight,
    frames.standLeft,
    frames.sit,
    frames.sleep,
    frames.ask,
    frames.eat,
    frames.drink,
    frames.play,
    frames.pet,
    frames.bark,
  ].concat(frames.walkRight, frames.walkLeft);
  urls.forEach(function preloadUrl(url) {
    const image = new Image();
    image.src = url;
  });
}

function frontDogImage() {
  return frontIsPrimary ? dogImg : dogImgBack;
}

function backDogImage() {
  return frontIsPrimary ? dogImgBack : dogImg;
}

function syncDogImageClasses() {
  if (!dogImg || !dogImgBack) {
    return;
  }
  if (frontIsPrimary) {
    dogImg.classList.add('bb-dog-front');
    dogImg.classList.remove('bb-dog-back');
    dogImgBack.classList.add('bb-dog-back');
    dogImgBack.classList.remove('bb-dog-front');
  } else {
    dogImgBack.classList.add('bb-dog-front');
    dogImgBack.classList.remove('bb-dog-back');
    dogImg.classList.add('bb-dog-back');
    dogImg.classList.remove('bb-dog-front');
  }
}

function setFrame(src, options) {
  if (!dogImg || !src) {
    return;
  }
  const useCrossfade = options && options.crossfade === true && dogImgBack;
  if (src === currentFrameSrc) {
    return;
  }
  currentFrameSrc = src;
  if (!useCrossfade || !dogImgBack) {
    if (crossfadeTimer) {
      clearTimeout(crossfadeTimer);
      crossfadeTimer = null;
    }
    if (dogImg) {
      dogImg.classList.remove('bb-dog-crossfade');
    }
    if (dogImgBack) {
      dogImgBack.classList.remove('bb-dog-crossfade');
    }
    dogImg.setAttribute('src', src);
    dogImg.style.opacity = '1';
    if (dogImgBack) {
      dogImgBack.style.opacity = '0';
    }
    frontIsPrimary = true;
    syncDogImageClasses();
    return;
  }
  const incoming = backDogImage();
  const outgoing = frontDogImage();
  incoming.classList.add('bb-dog-crossfade');
  outgoing.classList.add('bb-dog-crossfade');
  incoming.setAttribute('src', src);
  incoming.style.opacity = '0';
  requestAnimationFrame(function prepareFade() {
    requestAnimationFrame(function startFade() {
      incoming.style.opacity = '1';
      outgoing.style.opacity = '0';
      frontIsPrimary = !frontIsPrimary;
      syncDogImageClasses();
    });
  });
  if (crossfadeTimer) {
    clearTimeout(crossfadeTimer);
  }
  crossfadeTimer = setTimeout(function afterCrossfade() {
    crossfadeTimer = null;
    if (dogImg) {
      dogImg.classList.remove('bb-dog-crossfade');
    }
    if (dogImgBack) {
      dogImgBack.classList.remove('bb-dog-crossfade');
    }
  }, WALK_POSE_CROSSFADE_MS + 20);
}

function applySize() {
  const height = dogHeightForSize(settings.size, settings.dogType);
  dogWrap.style.setProperty('--bb-h', `${height}px`);
}

function applyDogLook() {
  const dogType = getDogType(settings.dogType);
  const folder = companionAssetFolder(settings.dogType);
  poseFrames = buildPoseFrames(folder);
  preloadPoseFrames(poseFrames);
  dogWrap.style.setProperty('--bb-dog-filter', dogType.filter || 'none');
  const alt = settings.dogName || dogType.label || 'Companion';
  if (dogImg) {
    dogImg.alt = alt;
  }
  if (dogImgBack) {
    dogImgBack.alt = '';
  }
  applyPoseFrame();
}

function soundEnabled() {
  return settings.sound === true;
}

function soundSpecies() {
  return companionSoundSpecies(settings.dogType);
}

function playCompanionSound(kind) {
  if (!soundEnabled() || !isExtensionContextValid()) {
    return;
  }
  if (isAudioReady()) {
    playFunSound(kind, true, soundSpecies());
    return;
  }
  unlockFunAudio()
    .then(function onUnlocked(ready) {
      if (ready && isExtensionContextValid()) {
        playFunSound(kind, true, soundSpecies());
      }
    })
    .catch(function onUnlockFail() {
      return false;
    });
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
  if (!dogWrap) {
    return;
  }
  const width = dogWrap.offsetWidth || 120;
  const maxX = Math.max(8, window.innerWidth - width - 8);
  x = Math.min(maxX, Math.max(8, x));
  const bob = behavior === STATE_WALKING && !dragging ? walkBob : 0;
  const pixelX = Math.round(x * 100) / 100;
  const pixelY = Math.round((yBottom + bob) * 100) / 100;
  dogWrap.style.transform = `translate3d(${pixelX}px, ${-pixelY}px, 0)`;
  updateStagePresence();
}

function updateStagePresence() {
  if (!dogPresence) {
    return;
  }
  const shadow = contactShadowStyle(yBottom - 8, Math.floor(window.innerHeight * 0.45));
  if (dogWrap) {
    dogWrap.style.setProperty('--bb-shadow-sx', String(shadow.scaleX));
    dogWrap.style.setProperty('--bb-shadow-sy', String(shadow.scaleY));
    dogWrap.style.setProperty('--bb-shadow-op', String(shadow.opacity));
  }
  const breath = behavior === STATE_WALKING || dragging ? 1 : stageBreath;
  dogPresence.style.transform =
    `translate3d(0, 0, 0) rotateX(${stageLeanX.toFixed(2)}deg) rotateY(${stageLeanY.toFixed(2)}deg) scale(${breath.toFixed(4)})`;
}

function updatePointerPresence(nowMs) {
  if (!dogWrap || dragging || hiddenByPage) {
    return;
  }
  const now = typeof nowMs === 'number' ? nowMs : performance.now();
  if (now - lastPointerTrackAt < POINTER_TRACK_MS) {
    return;
  }
  lastPointerTrackAt = now;
  const width = dogWrap.offsetWidth || 120;
  const height = dogWrap.offsetHeight || 120;
  const centerX = x + width * 0.5;
  const centerY = window.innerHeight - yBottom - height * 0.45;
  const lean = pointerLeanDegrees(pointerClientX - centerX, pointerClientY - centerY);
  stageLeanX = lean.rotateX;
  stageLeanY = lean.rotateY;
  if (
    (behavior === STATE_LOOKING || behavior === STATE_RESTING) &&
    !busyEvent &&
    !petting
  ) {
    const nextFacing = facingTowardPointer(centerX, pointerClientX, facing);
    if (nextFacing !== facing) {
      facing = nextFacing;
      applyPoseFrame();
    }
  }
  updateStagePresence();
}

function updateIdleLife(nowMs) {
  if (behavior === STATE_WALKING || dragging) {
    stageBreath = 1;
    return;
  }
  const period =
    behavior === STATE_SLEEPING ? IDLE_BREATH_PERIOD_MS * 1.45 : IDLE_BREATH_PERIOD_MS;
  stageBreath = idleBreathScale(nowMs, period);
  updateStagePresence();
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
  playCompanionSound('happy');
  if (combo.effect === 'shake') {
    flashClass('shake', 700);
    spawnDrops();
  } else if (combo.effect === 'roll') {
    flashClass('roll', 900);
    setFrame(poseFrames.pet);
  } else if (combo.effect === 'refuse') {
    setFrame(poseFrames.sit);
  } else if (combo.effect === 'hide_ball') {
    setFrame(poseFrames.ask);
  } else if (combo.effect === 'ball_in_bowl') {
    setFrame(poseFrames.drink);
  }
  setBehavior(STATE_INTERACTING, 2800);
  setTimeout(function afterCombo() {
    hideBubble();
    setBehavior(STATE_LOOKING, 4000);
  }, 2600);
}

function updateWalkFrame(nowMs) {
  if (behavior !== STATE_WALKING) {
    walkBob = 0;
    return;
  }
  const frames = facing > 0 ? poseFrames.walkRight : poseFrames.walkLeft;
  const nextFrame = walkFrameIndex(walkDistanceAccum, frames.length, WALK_STEP_PX);
  walkBob = walkBobOffset(walkDistanceAccum, WALK_STEP_PX, WALK_BOB_PX);
  if (nextFrame !== walkFrame) {
    walkFrame = nextFrame;
    setFrame(frames[walkFrame], { crossfade: false });
    leavePawprint();
  }
}

function setBehavior(next, durationMs) {
  behavior = next;
  nextTransitionAt = Date.now() + (durationMs || 8000);
  walkBob = 0;
  if (next === STATE_WALKING) {
    walkAnimStartedAt = performance.now();
    walkFrame = -1;
    updateWalkFrame(performance.now());
  } else if (next === STATE_LOOKING) {
    setFrame(facing > 0 ? poseFrames.standRight : poseFrames.standLeft, {
      crossfade: true,
    });
  } else if (next === STATE_RESTING) {
    setFrame(poseFrames.sit, { crossfade: true });
  } else if (next === STATE_SLEEPING) {
    setFrame(poseFrames.sleep, { crossfade: true });
  } else if (next === STATE_REQUESTING) {
    setFrame(poseFrames.ask, { crossfade: true });
  }
  placeDog();
}

function applyPoseFrame() {
  if (behavior === STATE_WALKING) {
    updateWalkFrame();
    return;
  }
  if (behavior === STATE_LOOKING) {
    setFrame(facing > 0 ? poseFrames.standRight : poseFrames.standLeft);
    return;
  }
  if (behavior === STATE_RESTING || behavior === STATE_INTERACTING) {
    setFrame(poseFrames.sit);
    return;
  }
  if (behavior === STATE_SLEEPING) {
    setFrame(poseFrames.sleep);
    return;
  }
  if (behavior === STATE_REQUESTING) {
    setFrame(poseFrames.ask);
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
    playCompanionSound(kind === REQUEST_PLAY ? 'ask' : 'bark');
    excitement = markBark(excitement, Date.now());
    persistExcitement(excitement);
  } else {
    playCompanionSound('ask');
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
  playCompanionSound('jingle');
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
      setFrame(poseFrames.sleep);
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
  setFrame(poseFrames.ask);
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
    setFrame(poseFrames.play);
    busyEvent = false;
    setTimeout(function afterDelivery() {
      hideBubble();
      setBehavior(STATE_WALKING, 6000);
    }, 2800);
  }, 1800);
}

function runBathEscape() {
  busyEvent = true;
  setFrame(poseFrames.play);
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
  setFrame(poseFrames.ask);
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
    setFrame(poseFrames.play);
  } else if (event.id === 'friend') {
    fxEl.textContent = '🐶';
    fxEl.classList.remove('hidden');
    fxEl.style.left = `${Math.max(20, x - 90)}px`;
    fxEl.style.bottom = `${yBottom}px`;
    send(MESSAGE.RECORD_FIND, { findId: 'mystery_friend' });
  } else if (event.id === 'inspector') {
    setFrame(poseFrames.ask);
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

function announceWalkDiscovery() {
  if (
    busyEvent ||
    Date.now() < discoverBusyUntil ||
    behavior === STATE_INTERACTING ||
    behavior === STATE_REQUESTING ||
    behavior === STATE_HIDDEN ||
    dragging
  ) {
    return false;
  }
  if (!canWalkDiscover(lastWalkDiscoverAt, Date.now())) {
    return false;
  }
  const discovery = buildWalkDiscoveryStory(
    settings.dogName,
    Date.now(),
    `${x}|${walkDistanceAccum}|${excitement.finds.length}`,
  );
  lastWalkDiscoverAt = Date.now();
  discoverBusyUntil = Date.now() + 4500;
  nextDiscoverDistance = nextWalkDiscoverDistance(discovery.seed);
  walkDistanceAccum = 0;
  hidePanels();
  showBubble(discovery.story);
  playCompanionSound('bark');
  setBehavior(STATE_LOOKING, 4200);
  announce(discovery.story);

  const collectible = pickFind(excitement, false);
  if (collectible && Math.random() < 0.28) {
    send(MESSAGE.RECORD_FIND, { findId: collectible.id }).then(function onFind(response) {
      if (response && response.state) {
        appState = response.state;
        excitement = response.state.excitement || excitement;
      }
    });
  }

  setTimeout(function resumeWalkAfterFind() {
    hideBubble();
    if (behavior === STATE_LOOKING && !busyEvent && !dragging) {
      facing = Math.random() > 0.5 ? 1 : -1;
      setBehavior(STATE_WALKING, 10000 + Math.random() * 10000);
    }
  }, 3800);
  return true;
}

function tickMovement(deltaMs) {
  if (!extensionAlive || !isExtensionContextValid()) {
    teardownInvalidatedExtension();
    return;
  }
  if (dragging || hiddenByPage || !settings.visible || isPaused(appState, Date.now())) {
    return;
  }
  if (tickFetch(deltaMs)) {
    return;
  }
  const stepScale = (typeof deltaMs === 'number' ? deltaMs : MOVEMENT_BASE_MS) / MOVEMENT_BASE_MS;
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
    const speed =
      (excitement.mood === MOOD_PLAYFUL ? 3.1 : excitement.mood === MOOD_RELAXED ? 1.6 : 2.35) *
      stepScale;
    const width = dogWrap && dogWrap.offsetWidth ? dogWrap.offsetWidth : 120;
    const bounds = walkBoundsForViewport(window.innerWidth, width, 8);
    x += facing * speed;
    walkDistanceAccum += Math.abs(speed);
    const bounce = resolveWalkEdgeBounce(x, facing, bounds.minX, bounds.maxX);
    x = bounce.x;
    if (bounce.turned) {
      facing = bounce.facing;
      walkAnimStartedAt = performance.now();
      walkFrame = -1;
      updateWalkFrame(performance.now());
    } else {
      facing = bounce.facing;
    }
    yBottom = 8;
    placeDog();
    if (walkDistanceAccum >= nextDiscoverDistance) {
      announceWalkDiscovery();
    }
  }
  if (
    Date.now() >= nextTransitionAt &&
    behavior !== STATE_INTERACTING &&
    behavior !== STATE_REQUESTING &&
    !busyEvent
  ) {
    const roll = Math.random();
    if (behavior === STATE_WALKING) {
      if (roll < 0.64) {
        setBehavior(STATE_WALKING, 9000 + Math.random() * 14000);
        if (roll < 0.22) {
          announceWalkDiscovery();
        }
      } else if (roll < 0.8) {
        setBehavior(STATE_LOOKING, 2800 + Math.random() * 3200);
      } else if (roll < 0.92) {
        setBehavior(STATE_RESTING, 10000 + Math.random() * 16000);
      } else {
        setBehavior(STATE_SLEEPING, 18000 + Math.random() * 22000);
        maybeRequest();
      }
    } else if (
      behavior === STATE_SLEEPING ||
      behavior === STATE_RESTING ||
      behavior === STATE_LOOKING
    ) {
      facing = Math.random() > 0.5 ? 1 : -1;
      setBehavior(STATE_WALKING, 10000 + Math.random() * 12000);
      hideBubble();
      if (Math.random() < 0.2) {
        maybeEvent();
      }
    } else if (behavior === STATE_REQUESTING) {
      hideBubble();
      hidePanels();
      setBehavior(STATE_WALKING, 8000);
      yBottom = 8;
    }
  }
}

function openMenu() {
  if (fetchGame) {
    return;
  }
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
    setFrame(poseFrames.pet);
    showBubble(say('boop'));
  } else if (kind === ACTION_BELLY) {
    setFrame(poseFrames.sit);
    showBubble(say('belly'));
  } else {
    setFrame(poseFrames.pet);
    showBubble(say('pet'));
  }
  playCompanionSound('pet');
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
  setFrame(poseFrames.bark);
  setBehavior(STATE_INTERACTING, 2500);
  recordAction(ACTION_WAKE);
  playCompanionSound('bark');
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
    setFrame(poseFrames.drink);
    playCompanionSound('drink');
    recordAction(ACTION_WATER);
  } else {
    setFrame(poseFrames.eat);
    playCompanionSound('eat');
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

function clientToBallY(clientY, ballSize) {
  const size = typeof ballSize === 'number' ? ballSize : BALL_SIZE_PX;
  return Math.max(BALL_GROUND_Y_PX, window.innerHeight - clientY - size * 0.5);
}

function placeFetchBall() {
  if (!fetchGame || !fetchGame.ballEl) {
    return;
  }
  fetchGame.ballEl.style.left = `${fetchGame.ball.x}px`;
  fetchGame.ballEl.style.bottom = `${fetchGame.ball.y}px`;
}

function clearFetchHint() {
  if (fetchGame && fetchGame.hintEl) {
    fetchGame.hintEl.remove();
    fetchGame.hintEl = null;
  }
}

function endFetchGame(silent) {
  if (!fetchGame) {
    return;
  }
  clearFetchHint();
  if (fetchGame.ballEl) {
    fetchGame.ballEl.remove();
  }
  if (fetchGame.aimTimer) {
    clearTimeout(fetchGame.aimTimer);
  }
  fetchGame = null;
  busyEvent = false;
  if (!silent) {
    setBehavior(STATE_WALKING, 5000);
  }
}

function finishFetchSuccess() {
  if (!fetchGame) {
    return;
  }
  fetchGame.phase = FETCH_PHASE_DONE;
  clearFetchHint();
  if (fetchGame.ballEl) {
    fetchGame.ballEl.classList.remove('carried');
    fetchGame.ball.x = x + (dogWrap && dogWrap.offsetWidth ? dogWrap.offsetWidth * 0.35 : 40);
    fetchGame.ball.y = BALL_GROUND_Y_PX;
    placeFetchBall();
  }
  setFrame(poseFrames.play);
  const refuse = Math.random() < 0.1;
  if (refuse) {
    showBubble('Ball? What ball?');
  } else if (Math.random() < 0.08) {
    showBubble('Wrong object. Still proud.');
  } else {
    showBubble(excitement.finds.indexOf('golden_ball') !== -1 ? 'Golden retrieve!' : say('thanks'));
  }
  playCompanionSound('happy');
  recordAction(ACTION_FETCH).then(function afterFetch(response) {
    const ballEl = fetchGame && fetchGame.ballEl;
    setTimeout(function cleanupBall() {
      if (ballEl) {
        ballEl.remove();
      }
    }, 900);
    fetchGame = null;
    busyEvent = false;
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

function launchFetchBall(vx, vy) {
  if (!fetchGame || fetchGame.phase !== FETCH_PHASE_AIM) {
    return;
  }
  clearFetchHint();
  fetchGame.ballEl.classList.remove('throwable', 'dragging');
  fetchGame.ballEl.style.pointerEvents = 'none';
  fetchGame.ball = createBallState(fetchGame.ball.x, fetchGame.ball.y, vx, vy);
  fetchGame.phase = FETCH_PHASE_FLIGHT;
  fetchGame.returnX = x;
  setBehavior(STATE_LOOKING, 20000);
  showBubble('Go get it!');
  playCompanionSound('play');
  facing = vx >= 0 ? 1 : -1;
  applyPoseFrame();
}

function onFetchBallPointerDown(event) {
  if (!fetchGame || fetchGame.phase !== FETCH_PHASE_AIM || event.button !== 0) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  unlockFunAudio();
  fetchGame.draggingBall = true;
  fetchGame.dragSamples = [];
  fetchGame.ballEl.classList.add('dragging');
  fetchGame.ballEl.setPointerCapture(event.pointerId);
  const size = fetchGame.ballEl.offsetWidth || BALL_SIZE_PX;
  fetchGame.ball.x = event.clientX - size * 0.5;
  fetchGame.ball.y = clientToBallY(event.clientY, size);
  fetchGame.dragSamples.push({
    x: fetchGame.ball.x,
    y: fetchGame.ball.y,
    at: performance.now(),
  });
  placeFetchBall();
}

function onFetchBallPointerMove(event) {
  if (!fetchGame || !fetchGame.draggingBall) {
    return;
  }
  event.preventDefault();
  const size = fetchGame.ballEl.offsetWidth || BALL_SIZE_PX;
  fetchGame.ball.x = Math.min(
    window.innerWidth - size - 8,
    Math.max(8, event.clientX - size * 0.5)
  );
  fetchGame.ball.y = Math.min(
    window.innerHeight - 40,
    clientToBallY(event.clientY, size)
  );
  const now = performance.now();
  fetchGame.dragSamples.push({
    x: fetchGame.ball.x,
    y: fetchGame.ball.y,
    at: now,
  });
  if (fetchGame.dragSamples.length > 8) {
    fetchGame.dragSamples.shift();
  }
  placeFetchBall();
  facing = event.clientX >= x + (dogWrap ? dogWrap.offsetWidth * 0.5 : 60) ? 1 : -1;
  setFrame(facing > 0 ? poseFrames.standRight : poseFrames.standLeft);
}

function onFetchBallPointerUp(event) {
  if (!fetchGame || !fetchGame.draggingBall) {
    return;
  }
  event.preventDefault();
  fetchGame.draggingBall = false;
  fetchGame.ballEl.classList.remove('dragging');
  try {
    fetchGame.ballEl.releasePointerCapture(event.pointerId);
  } catch (releaseError) {
    // Pointer may already be released.
  }
  const samples = fetchGame.dragSamples || [];
  if (samples.length < 2) {
    const auto = defaultThrowVelocity(facing);
    launchFetchBall(auto.vx, auto.vy);
    return;
  }
  const last = samples[samples.length - 1];
  let start = samples[0];
  let index = samples.length - 2;
  while (index >= 0) {
    if (last.at - samples[index].at >= 32) {
      start = samples[index];
      break;
    }
    index -= 1;
  }
  const tossed = throwVelocityFromDrag(start.x, start.y, last.x, last.y, last.at - start.at);
  if (tossed.tooSoft) {
    const auto = defaultThrowVelocity(facing);
    launchFetchBall(auto.vx, auto.vy);
    return;
  }
  launchFetchBall(tossed.vx, tossed.vy);
}

function throwBall() {
  if (fetchGame) {
    endFetchGame(true);
  }
  playTray.classList.add('hidden');
  hidePanels();
  busyEvent = true;
  setBehavior(STATE_LOOKING, 30000);
  const width = dogWrap && dogWrap.offsetWidth ? dogWrap.offsetWidth : 120;
  const startX = Math.min(window.innerWidth - 40, Math.max(8, x + width * 0.55));
  const startY = Math.max(BALL_GROUND_Y_PX + 40, yBottom + 70);
  const ball = document.createElement('div');
  ball.className = 'bb-ball throwable';
  ball.setAttribute('data-testid', 'barkbreak-ball');
  const hint = document.createElement('div');
  hint.className = 'bb-fetch-hint';
  hint.textContent = 'Drag the ball and throw — I will fetch it!';
  hint.setAttribute('data-testid', 'barkbreak-fetch-hint');
  layerEl.appendChild(hint);
  layerEl.appendChild(ball);
  fetchGame = {
    phase: FETCH_PHASE_AIM,
    ballEl: ball,
    hintEl: hint,
    ball: createBallState(startX, startY, 0, 0),
    returnX: x,
    draggingBall: false,
    dragSamples: [],
    aimTimer: null,
  };
  placeFetchBall();
  showBubble(excitement.finds.indexOf('golden_ball') !== -1 ? 'Golden fetch ready!' : 'Throw it!');
  playCompanionSound('ask');
  ball.addEventListener('pointerdown', onFetchBallPointerDown);
  ball.addEventListener('pointermove', onFetchBallPointerMove);
  ball.addEventListener('pointerup', onFetchBallPointerUp);
  ball.addEventListener('pointercancel', onFetchBallPointerUp);
  fetchGame.aimTimer = setTimeout(function autoToss() {
    if (!fetchGame || fetchGame.phase !== FETCH_PHASE_AIM || fetchGame.draggingBall) {
      return;
    }
    const auto = defaultThrowVelocity(facing);
    launchFetchBall(auto.vx, auto.vy);
  }, 8000);
}

function tickFetch(deltaMs) {
  if (!fetchGame) {
    return false;
  }
  const width = dogWrap && dogWrap.offsetWidth ? dogWrap.offsetWidth : 120;
  const chaseSpeed =
    (excitement.mood === MOOD_PLAYFUL ? 5.2 : excitement.mood === MOOD_RELAXED ? 3.4 : 4.3) *
    ((typeof deltaMs === 'number' ? deltaMs : MOVEMENT_BASE_MS) / MOVEMENT_BASE_MS);

  if (fetchGame.phase === FETCH_PHASE_AIM) {
    return true;
  }

  if (fetchGame.phase === FETCH_PHASE_FLIGHT) {
    fetchGame.ball = stepBallPhysics(fetchGame.ball, deltaMs, window.innerWidth, BALL_GROUND_Y_PX);
    placeFetchBall();
    facing = fetchGame.ball.x >= x + width * 0.5 ? 1 : -1;
    setFrame(facing > 0 ? poseFrames.standRight : poseFrames.standLeft);
    if (fetchGame.ball.settled) {
      fetchGame.phase = FETCH_PHASE_CHASE;
      walkDistanceAccum = 0;
      walkFrame = -1;
      setBehavior(STATE_WALKING, 30000);
      showBubble('On it!');
    }
    return true;
  }

  if (fetchGame.phase === FETCH_PHASE_CHASE) {
    const chase = stepFetchChase(x, fetchGame.ball.x - width * 0.25, chaseSpeed);
    x = chase.x;
    facing = chase.facing;
    yBottom = 8;
    const bounds = walkBoundsForViewport(window.innerWidth, width, 8);
    const bounced = resolveWalkEdgeBounce(x, facing, bounds.minX, bounds.maxX);
    x = bounced.x;
    facing = bounced.facing;
    walkDistanceAccum += Math.abs(chaseSpeed);
    placeDog();
    updateWalkFrame(performance.now());
    if (chase.caught) {
      fetchGame.phase = FETCH_PHASE_RETURN;
      fetchGame.ballEl.classList.add('carried');
      walkDistanceAccum = 0;
      walkFrame = -1;
      showBubble('Got it!');
      playCompanionSound('bark');
    }
    return true;
  }

  if (fetchGame.phase === FETCH_PHASE_RETURN) {
    const home = stepFetchReturn(x, fetchGame.returnX, chaseSpeed * 0.92);
    x = home.x;
    facing = home.facing;
    yBottom = 8;
    const bounds = walkBoundsForViewport(window.innerWidth, width, 8);
    const bounced = resolveWalkEdgeBounce(x, facing, bounds.minX, bounds.maxX);
    x = bounced.x;
    facing = bounced.facing;
    walkDistanceAccum += Math.abs(chaseSpeed);
    placeDog();
    updateWalkFrame(performance.now());
    if (home.caught) {
      finishFetchSuccess();
    }
    return true;
  }

  return fetchGame.phase === FETCH_PHASE_DONE;
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
    playCompanionSound('ask');
  } else if (squeakSession === 2) {
    setFrame(poseFrames.ask);
    showBubble('Head tilt unlocked.');
    setBehavior(STATE_LOOKING, 3000);
  } else {
    showBubble('Toy confiscated. For science.');
    setFrame(poseFrames.play);
    squeakSession = 0;
    setBehavior(STATE_INTERACTING, 2500);
  }
  recordAction(ACTION_SQUEAK);
  setTimeout(hideBubble, 2000);
}

function playTug() {
  playTray.classList.add('hidden');
  setBehavior(STATE_INTERACTING, 3500);
  setFrame(poseFrames.play);
  const win = Math.random() > 0.45;
  if (win) {
    showBubble('Victory! …wait.');
    setTimeout(function loseEarly() {
      showBubble('Celebrated too early. Rematch pending.');
    }, 1200);
  } else {
    showBubble('Grip renegotiation in progress.');
  }
  playCompanionSound('play');
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
        setFrame(poseFrames.play);
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
          playCompanionSound('happy');
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
    setFrame(poseFrames.ask);
    showBubble(say('skid'));
    setBehavior(STATE_INTERACTING, 2200);
    x = Math.min(window.innerWidth - 140, Math.max(24, x + (facing > 0 ? 40 : -40)));
    placeDog();
    setTimeout(function afterSkid() {
      hideBubble();
      setBehavior(STATE_LOOKING, 3000);
    }, 2000);
  } else if (behavior === STATE_LOOKING || behavior === STATE_RESTING) {
    setFrame(facing > 0 ? poseFrames.standRight : poseFrames.standLeft);
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
        <button type="button" class="bb-btn secondary" data-toy="ball">Throw ball</button>
        <button type="button" class="bb-btn secondary" data-toy="squeak">Squeaky</button>
        <button type="button" class="bb-btn secondary" data-toy="tug">Tug rope</button>
      </div>
      <div class="bb-break hidden">
        <button type="button" class="bb-btn" data-break="yes">Take a 2-minute break</button>
        <button type="button" class="bb-btn secondary" data-break="later">Later</button>
        <button type="button" class="bb-btn ghost" data-break="no">Not today</button>
      </div>
      <div class="bb-dog-stage">
        <div class="bb-dog-shadow" aria-hidden="true"></div>
        <div class="bb-dog-presence">
          <img class="bb-dog bb-dog-front" alt="Kabs" draggable="false" />
          <img class="bb-dog bb-dog-back" alt="" draggable="false" aria-hidden="true" />
        </div>
      </div>
    </div>
    <div class="bb-timer hidden" data-testid="barkbreak-timer"></div>
  `;
  shadow.appendChild(style);
  shadow.appendChild(layer);
  layerEl = layer;
  dogWrap = shadow.querySelector('.bb-dog-wrap');
  dogPresence = shadow.querySelector('.bb-dog-presence');
  dogImg = shadow.querySelector('.bb-dog-front');
  dogImgBack = shadow.querySelector('.bb-dog-back');
  frontIsPrimary = true;
  currentFrameSrc = '';
  syncDogImageClasses();
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
    if (fetchGame) {
      unlockFunAudio();
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
        endFetchGame(true);
        dogWrap.style.display = 'none';
        send(MESSAGE.TOGGLE_VISIBLE, { visible: false });
      } else if (act === 'pause') {
        endFetchGame(true);
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
        playCompanionSound('sigh');
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
    stopAnimationLoop();
  } else {
    startLoops();
  }
}

function onAnimationFrame(timestamp) {
  if (!extensionAlive || !isExtensionContextValid()) {
    teardownInvalidatedExtension();
    return;
  }
  rafId = requestAnimationFrame(onAnimationFrame);
  if (document.visibilityState === 'hidden') {
    return;
  }
  const deltaMs = lastFrameTs ? Math.min(48, timestamp - lastFrameTs) : MOVEMENT_BASE_MS;
  lastFrameTs = timestamp;
  updateWalkFrame(timestamp);
  tickMovement(deltaMs);
  updateIdleLife(timestamp);
  updatePointerPresence(timestamp);
}

function onPointerTrack(event) {
  pointerClientX = event.clientX;
  pointerClientY = event.clientY;
}

function stopAnimationLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  lastFrameTs = 0;
}

function startLoops() {
  if (!isExtensionContextValid()) {
    teardownInvalidatedExtension();
    return;
  }
  if (!rafId) {
    lastFrameTs = 0;
    rafId = requestAnimationFrame(onAnimationFrame);
  }
  if (!engagedTimer) {
    engagedTimer = setInterval(function engagedTick() {
      if (!isExtensionContextValid()) {
        teardownInvalidatedExtension();
        return;
      }
      if (document.visibilityState !== 'visible' || !document.hasFocus()) {
        return;
      }
      send('ENGAGED_TICK', { ms: 15000 }).then(function onTick(response) {
        if (!response || response.invalidated) {
          return;
        }
        if (response.state) {
          appState = response.state;
          excitement = response.state.excitement || excitement;
          updateMoodBadge();
        }
        if (response.canRequest || response.canBreak) {
          maybeRequest();
        }
      });
    }, 15000);
  }
  if (!eventTimer) {
    eventTimer = setInterval(function eventTick() {
      if (!isExtensionContextValid()) {
        teardownInvalidatedExtension();
        return;
      }
      if (document.visibilityState !== 'visible') {
        return;
      }
      maybeEvent();
    }, 45000);
  }
}

function boot() {
  if (window.__barkBreakPetInstance === CONTENT_INSTANCE_ID) {
    return;
  }
  // Take over after extension reload/reinjection; orphan scripts from older
  // builds keep the old flag and would otherwise block the new instance.
  window.__barkBreakPetInstance = CONTENT_INSTANCE_ID;
  window.__barkBreakPetLoaded = true;
  if (isRestrictedUrl(location.href)) {
    return;
  }
  try {
    const existingHost = document.getElementById(HOST_ID);
    if (existingHost) {
      existingHost.remove();
    }
  } catch (error) {
    // Ignore DOM race during takeover.
  }
  if (!isExtensionContextValid()) {
    return;
  }
  buildUi();
  dogWrap.classList.add('waiting');
  x = Math.random() > 0.5 ? -120 : window.innerWidth + 20;
  facing = x < 0 ? 1 : -1;
  walkDistanceAccum = 0;
  nextDiscoverDistance = nextWalkDiscoverDistance(Date.now());
  placeDog();
  setBehavior(STATE_WALKING, 14000);
  send(MESSAGE.GET_STATE).then(function onState(response) {
    if (!response || response.invalidated || !isExtensionContextValid()) {
      teardownInvalidatedExtension();
      return;
    }
    if (response.state) {
      syncFromStorage(response.state);
    }
    const delayMs = (settings.appearDelaySeconds || 0) * 1000;
    setTimeout(revealDog, delayMs);
    startLoops();
  });
  try {
    chrome.storage.onChanged.addListener(function onChange(changes, area) {
      if (!isExtensionContextValid()) {
        teardownInvalidatedExtension();
        return;
      }
      if (area !== 'local' || !changes[STORAGE_KEY]) {
        return;
      }
      syncFromStorage(validateState(changes[STORAGE_KEY].newValue, Date.now()));
    });
  } catch (error) {
    if (isExtensionContextInvalidationError(error)) {
      teardownInvalidatedExtension();
    }
  }
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', placeDog);
  window.addEventListener('scroll', onFastScroll, { passive: true });
  window.addEventListener('pointermove', onPointerTrack, { passive: true });
  pointerClientX = window.innerWidth * 0.5;
  pointerClientY = window.innerHeight * 0.65;
}

boot();
