'use strict';

/**
 * Clear cute animal vocal FX via Web Audio (no media files).
 * Dogs: punchy woof / arf. Cats: clear mee-ow / chirp / purr.
 *
 * Chrome autoplay policy: create/resume AudioContext only from a user gesture
 * via unlockFunAudio() (click / pointerdown). playFunSound is silent until unlocked.
 */

const SOUND_SPECIES_DOG = 'dog';
const SOUND_SPECIES_CAT = 'cat';
const MASTER_GAIN = 2.4;
const SAMPLE_GAIN = 0.9;

let audioContext = null;
let audioUnlocked = false;
let masterGainNode = null;
let meowSampleEntries = [];
let meowBuffersLoading = null;

function sampleKindForFile(fileName) {
  if (typeof meowSampleKindForFile === 'function') {
    return meowSampleKindForFile(fileName);
  }
  if (
    typeof MEOW_SAMPLE_KIND_BY_FILE !== 'undefined' &&
    MEOW_SAMPLE_KIND_BY_FILE &&
    MEOW_SAMPLE_KIND_BY_FILE[fileName]
  ) {
    return MEOW_SAMPLE_KIND_BY_FILE[fileName];
  }
  return 'meow';
}

function isOfflineAudioContext(context) {
  if (!context) {
    return false;
  }
  if (typeof OfflineAudioContext !== 'undefined' && context instanceof OfflineAudioContext) {
    return true;
  }
  return typeof context.startRendering === 'function' && context.constructor &&
    /OfflineAudioContext/.test(context.constructor.name || '');
}

function getRunningAudioContext() {
  if (!audioUnlocked || !audioContext) {
    return null;
  }
  if (isOfflineAudioContext(audioContext)) {
    return audioContext;
  }
  if (audioContext.state !== 'running') {
    return null;
  }
  return audioContext;
}

function ensureMasterGain(context) {
  if (masterGainNode && masterGainNode.context === context) {
    return masterGainNode;
  }
  masterGainNode = context.createGain();
  masterGainNode.gain.value = MASTER_GAIN;
  masterGainNode.connect(context.destination);
  return masterGainNode;
}

function outputNode(context) {
  return ensureMasterGain(context);
}

function extensionAssetUrl(relativePath) {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.runtime.getURL) {
      return chrome.runtime.getURL(relativePath);
    }
  } catch (error) {
    return relativePath;
  }
  return relativePath;
}

function loadMeowSampleBuffers() {
  if (meowSampleEntries.length > 0) {
    return Promise.resolve(meowSampleEntries);
  }
  if (meowBuffersLoading) {
    return meowBuffersLoading;
  }
  const context = audioContext;
  if (!context) {
    return Promise.resolve([]);
  }
  const files =
    typeof MEOW_SAMPLE_FILES !== 'undefined' && Array.isArray(MEOW_SAMPLE_FILES)
      ? MEOW_SAMPLE_FILES
      : [];
  if (files.length === 0) {
    return Promise.resolve([]);
  }
  meowBuffersLoading = Promise.all(
    files.map(function loadOne(fileName) {
      const url = extensionAssetUrl(`assets/sounds/meow/${fileName}`);
      return fetch(url)
        .then(function onResponse(response) {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return response.arrayBuffer();
        })
        .then(function onBuffer(arrayBuffer) {
          return context.decodeAudioData(arrayBuffer.slice(0)).then(function onDecoded(buffer) {
            return {
              buffer: buffer,
              kind: sampleKindForFile(fileName),
              fileName: fileName,
            };
          });
        })
        .catch(function onFail() {
          return null;
        });
    }),
  ).then(function onAll(entries) {
    meowSampleEntries = entries.filter(Boolean);
    meowBuffersLoading = null;
    return meowSampleEntries;
  });
  return meowBuffersLoading;
}

function playSampleBuffer(buffer, gainValue) {
  const context = getRunningAudioContext();
  if (!context || !buffer) {
    return false;
  }
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = gainValue || SAMPLE_GAIN;
  source.connect(gain);
  gain.connect(outputNode(context));
  source.start(0);
  return true;
}

function pickCatSampleEntry(preferredKinds) {
  if (meowSampleEntries.length === 0) {
    return null;
  }
  let pool = meowSampleEntries;
  if (Array.isArray(preferredKinds) && preferredKinds.length > 0) {
    pool = meowSampleEntries.filter(function matchKind(entry) {
      return preferredKinds.indexOf(entry.kind) !== -1;
    });
  }
  if (pool.length === 0) {
    pool = meowSampleEntries.filter(function notPurr(entry) {
      return entry.kind !== 'purr';
    });
  }
  if (pool.length === 0) {
    return null;
  }
  return pool[pickVariant(pool.length)];
}

function playRandomMeowSample(preferredKinds) {
  const entry = pickCatSampleEntry(preferredKinds);
  if (!entry) {
    return false;
  }
  const gainValue = entry.kind === 'purr' ? 0.72 : SAMPLE_GAIN;
  return playSampleBuffer(entry.buffer, gainValue);
}

function playSilentUnlockTick(context) {
  const buffer = context.createBuffer(1, 1, context.sampleRate);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(outputNode(context));
  source.start(0);
}

function unlockFunAudio() {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return Promise.resolve(false);
    }
    if (!audioContext) {
      audioContext = new AudioCtx();
      masterGainNode = null;
    }
  } catch (_error) {
    audioContext = null;
    audioUnlocked = false;
    masterGainNode = null;
    return Promise.resolve(false);
  }

  function markReady() {
    if (!audioContext || audioContext.state !== 'running') {
      audioUnlocked = false;
      return false;
    }
    audioUnlocked = true;
    ensureMasterGain(audioContext);
    try {
      playSilentUnlockTick(audioContext);
    } catch (_tickError) {
      // Ignore unlock tick failures; context may still be usable.
    }
    loadMeowSampleBuffers();
    return true;
  }

  if (audioContext.state === 'running') {
    return Promise.resolve(markReady());
  }

  return audioContext
    .resume()
    .then(function onResumed() {
      return markReady();
    })
    .catch(function onResumeFail() {
      audioUnlocked = false;
      return false;
    });
}

function normalizeSpecies(species) {
  if (species === SOUND_SPECIES_CAT) {
    return SOUND_SPECIES_CAT;
  }
  return SOUND_SPECIES_DOG;
}

function pickVariant(count) {
  return Math.floor(Math.random() * count);
}

function safeHz(value) {
  return Math.max(40, value);
}

/**
 * One clear voiced note with pitch curve + vowel color.
 * Dry path keeps volume audible; formant path adds animal character.
 */
function playVoice(options) {
  const context = getRunningAudioContext();
  if (!context) {
    return false;
  }
  const startAt = options.when || context.currentTime;
  const durationSec = Math.max(0.05, (options.durationMs || 200) / 1000);
  const peakGain = options.gain || 0.22;
  const type = options.type || 'sawtooth';
  const formantHz = options.formantHz || 900;
  const formantQ = options.formantQ || 3.2;
  const pitchPoints = options.pitchPoints || [{ time: 0, hz: 400 }];
  const destination = outputNode(context);

  const oscillator = context.createOscillator();
  const formant = context.createBiquadFilter();
  const presence = context.createBiquadFilter();
  const wetGain = context.createGain();
  const dryGain = context.createGain();
  const envelope = context.createGain();

  oscillator.type = type;
  const firstHz = safeHz(pitchPoints[0].hz);
  oscillator.frequency.setValueAtTime(firstHz, startAt);
  for (let index = 1; index < pitchPoints.length; index += 1) {
    const point = pitchPoints[index];
    const at = startAt + durationSec * Math.min(1, Math.max(0, point.time));
    oscillator.frequency.linearRampToValueAtTime(safeHz(point.hz), at);
  }

  formant.type = 'bandpass';
  formant.frequency.setValueAtTime(formantHz, startAt);
  formant.Q.value = formantQ;

  presence.type = 'peaking';
  presence.frequency.setValueAtTime(options.presenceHz || formantHz * 1.35, startAt);
  presence.Q.value = 1.1;
  presence.gain.value = 8;

  wetGain.gain.value = 0.85;
  dryGain.gain.value = 0.35;

  const attack = Math.min(0.025, durationSec * 0.1);
  const release = Math.min(0.09, durationSec * 0.3);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(peakGain, startAt + attack);
  envelope.gain.setValueAtTime(peakGain, startAt + Math.max(attack, durationSec - release));
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);

  oscillator.connect(formant);
  formant.connect(presence);
  presence.connect(wetGain);
  wetGain.connect(envelope);

  oscillator.connect(dryGain);
  dryGain.connect(envelope);

  envelope.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + durationSec + 0.05);
  return true;
}

function playAttackNoise(durationMs, gainValue, centerHz, when) {
  const context = getRunningAudioContext();
  if (!context) {
    return false;
  }
  const startAt = when || context.currentTime;
  const durationSec = Math.max(0.02, durationMs / 1000);
  const length = Math.max(1, Math.floor(context.sampleRate * durationSec));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / length);
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(centerHz || 800, startAt);
  filter.Q.value = 1.6;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainValue || 0.12, startAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(outputNode(context));
  source.start(startAt);
  source.stop(startAt + durationSec + 0.02);
  return true;
}

function playTone(frequency, durationMs, type, gainValue, when, glideToHz) {
  const context = getRunningAudioContext();
  if (!context) {
    return false;
  }
  const startAt = when || context.currentTime;
  const durationSec = Math.max(0.03, durationMs / 1000);
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type || 'sine';
  oscillator.frequency.setValueAtTime(safeHz(frequency), startAt);
  if (typeof glideToHz === 'number') {
    oscillator.frequency.exponentialRampToValueAtTime(
      safeHz(glideToHz),
      startAt + durationSec * 0.9,
    );
  }
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainValue || 0.16, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
  oscillator.connect(gain);
  gain.connect(outputNode(context));
  oscillator.start(startAt);
  oscillator.stop(startAt + durationSec + 0.02);
  return true;
}

function playFilteredNoise(durationMs, gainValue, centerHz, when, qValue) {
  const context = getRunningAudioContext();
  if (!context) {
    return false;
  }
  const startAt = when || context.currentTime;
  const durationSec = Math.max(0.02, durationMs / 1000);
  const length = Math.max(1, Math.floor(context.sampleRate * durationSec));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / length);
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(centerHz || 900, startAt);
  filter.Q.value = qValue || 1.2;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainValue || 0.1, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(outputNode(context));
  source.start(startAt);
  source.stop(startAt + durationSec + 0.02);
  return true;
}

function playDogBarkFx() {
  const context = getRunningAudioContext();
  if (!context) {
    return;
  }
  const variant = pickVariant(3);
  const now = context.currentTime;

  if (variant === 0) {
    playAttackNoise(50, 0.14, 700, now);
    playVoice({
      when: now + 0.012,
      durationMs: 180,
      gain: 0.32,
      type: 'sawtooth',
      formantHz: 760,
      formantQ: 3,
      presenceHz: 1100,
      pitchPoints: [
        { time: 0, hz: 340 },
        { time: 0.25, hz: 260 },
        { time: 1, hz: 150 },
      ],
    });
  } else if (variant === 1) {
    playAttackNoise(45, 0.13, 900, now);
    playVoice({
      when: now + 0.01,
      durationMs: 150,
      gain: 0.3,
      type: 'square',
      formantHz: 880,
      formantQ: 3.2,
      presenceHz: 1300,
      pitchPoints: [
        { time: 0, hz: 420 },
        { time: 0.35, hz: 280 },
        { time: 1, hz: 170 },
      ],
    });
  } else {
    playAttackNoise(40, 0.12, 1050, now);
    playVoice({
      when: now + 0.01,
      durationMs: 120,
      gain: 0.28,
      type: 'sawtooth',
      formantHz: 980,
      formantQ: 3.4,
      presenceHz: 1450,
      pitchPoints: [
        { time: 0, hz: 520 },
        { time: 0.4, hz: 300 },
        { time: 1, hz: 190 },
      ],
    });
    playVoice({
      when: now + 0.14,
      durationMs: 110,
      gain: 0.24,
      type: 'sawtooth',
      formantHz: 860,
      formantQ: 3,
      presenceHz: 1200,
      pitchPoints: [
        { time: 0, hz: 380 },
        { time: 1, hz: 160 },
      ],
    });
  }
}

function playDogYipFx() {
  const context = getRunningAudioContext();
  if (!context) {
    return;
  }
  const now = context.currentTime;
  playAttackNoise(30, 0.08, 1400, now);
  playVoice({
    when: now,
    durationMs: 130,
    gain: 0.26,
    type: 'triangle',
    formantHz: 1200,
    formantQ: 3.5,
    presenceHz: 1600,
    pitchPoints: [
      { time: 0, hz: 760 },
      { time: 0.4, hz: 980 },
      { time: 1, hz: 520 },
    ],
  });
}

function playSynthMeowFallback() {
  const context = getRunningAudioContext();
  if (!context) {
    return;
  }
  const variant = pickVariant(3);
  const now = context.currentTime;
  if (variant === 0) {
    playVoice({
      when: now,
      durationMs: 460,
      gain: 0.3,
      type: 'sawtooth',
      formantHz: 1450,
      formantQ: 3.5,
      presenceHz: 2100,
      pitchPoints: [
        { time: 0, hz: 520 },
        { time: 0.22, hz: 860 },
        { time: 0.45, hz: 920 },
        { time: 0.72, hz: 540 },
        { time: 1, hz: 320 },
      ],
    });
    return;
  }
  if (variant === 1) {
    playVoice({
      when: now,
      durationMs: 390,
      gain: 0.28,
      type: 'sawtooth',
      formantHz: 1600,
      formantQ: 3.6,
      presenceHz: 2300,
      pitchPoints: [
        { time: 0, hz: 640 },
        { time: 0.18, hz: 980 },
        { time: 0.4, hz: 1040 },
        { time: 0.7, hz: 620 },
        { time: 1, hz: 360 },
      ],
    });
    return;
  }
  playVoice({
    when: now,
    durationMs: 300,
    gain: 0.27,
    type: 'triangle',
    formantHz: 1700,
    formantQ: 3.8,
    presenceHz: 2400,
    pitchPoints: [
      { time: 0, hz: 780 },
      { time: 0.3, hz: 1180 },
      { time: 0.55, hz: 900 },
      { time: 1, hz: 400 },
    ],
  });
}

function playCatMeowFx() {
  if (playRandomMeowSample(['meow', 'ask'])) {
    return;
  }
  loadMeowSampleBuffers().then(function onLoaded() {
    if (!playRandomMeowSample(['meow', 'ask'])) {
      playSynthMeowFallback();
    }
  });
}

function playCatChirpFx() {
  if (playRandomMeowSample(['meow'])) {
    return;
  }
  const context = getRunningAudioContext();
  if (!context) {
    return;
  }
  const now = context.currentTime;
  playVoice({
    when: now,
    durationMs: 100,
    gain: 0.22,
    type: 'triangle',
    formantHz: 1900,
    formantQ: 4,
    presenceHz: 2500,
    pitchPoints: [
      { time: 0, hz: 900 },
      { time: 0.5, hz: 1280 },
      { time: 1, hz: 980 },
    ],
  });
  playVoice({
    when: now + 0.09,
    durationMs: 90,
    gain: 0.2,
    type: 'triangle',
    formantHz: 1800,
    formantQ: 4,
    presenceHz: 2400,
    pitchPoints: [
      { time: 0, hz: 1100 },
      { time: 1, hz: 760 },
    ],
  });
}

function playCatPurrFx() {
  if (playRandomMeowSample(['purr'])) {
    return;
  }
  loadMeowSampleBuffers().then(function onLoaded() {
    if (playRandomMeowSample(['purr'])) {
      return;
    }
    const context = getRunningAudioContext();
    if (!context) {
      return;
    }
    const now = context.currentTime;
    playTone(58, 380, 'sawtooth', 0.08, now, 52);
    playTone(116, 360, 'triangle', 0.055, now + 0.01, 108);
    playFilteredNoise(340, 0.05, 160, now, 0.9);
  });
}

function playHappyDogFx() {
  const context = getRunningAudioContext();
  if (!context) {
    return;
  }
  const now = context.currentTime;
  playDogYipFx();
  playTone(640, 80, 'sine', 0.08, now + 0.14, 780);
}

function playHappyCatFx() {
  playCatChirpFx();
  playCatPurrFx();
}

function playAskDogFx() {
  const context = getRunningAudioContext();
  if (!context) {
    return;
  }
  playVoice({
    when: context.currentTime,
    durationMs: 240,
    gain: 0.26,
    type: 'triangle',
    formantHz: 1000,
    formantQ: 3.2,
    presenceHz: 1400,
    pitchPoints: [
      { time: 0, hz: 380 },
      { time: 0.45, hz: 720 },
      { time: 1, hz: 860 },
    ],
  });
}

function playAskCatFx() {
  if (playRandomMeowSample(['ask', 'meow'])) {
    return;
  }
  playCatMeowFx();
}

function playJingleFx() {
  const context = getRunningAudioContext();
  if (!context) {
    return;
  }
  const now = context.currentTime;
  playTone(880, 60, 'triangle', 0.1, now);
  playTone(1180, 75, 'triangle', 0.09, now + 0.06);
  playTone(1480, 90, 'sine', 0.07, now + 0.13);
}

function playCrunchFx() {
  playFilteredNoise(120, 0.14, 1400, undefined, 0.9);
  playTone(170, 60, 'sawtooth', 0.07);
}

function playDrinkFx() {
  const context = getRunningAudioContext();
  if (!context) {
    return;
  }
  const now = context.currentTime;
  playTone(260, 60, 'sine', 0.08, now, 220);
  playTone(210, 60, 'sine', 0.07, now + 0.09, 180);
  playTone(240, 65, 'sine', 0.06, now + 0.18, 200);
  playFilteredNoise(45, 0.04, 700, now + 0.05, 1.5);
}

function playSighFx() {
  const context = getRunningAudioContext();
  if (!context) {
    return;
  }
  const now = context.currentTime;
  playTone(240, 280, 'sine', 0.07, now, 140);
  playFilteredNoise(240, 0.05, 500, now, 0.7);
}

function playPlayDogFx() {
  playDogYipFx();
}

function playPlayCatFx() {
  playCatChirpFx();
}

function playKind(kind, species) {
  const isCat = species === SOUND_SPECIES_CAT;
  if (kind === 'bark' || kind === 'voice') {
    if (isCat) {
      playCatMeowFx();
    } else {
      playDogBarkFx();
    }
    return;
  }
  if (kind === 'meow') {
    playCatMeowFx();
    return;
  }
  if (kind === 'happy' || kind === 'pet') {
    if (isCat) {
      playHappyCatFx();
    } else {
      playHappyDogFx();
    }
    return;
  }
  if (kind === 'jingle') {
    playJingleFx();
    return;
  }
  if (kind === 'ask') {
    if (isCat) {
      playAskCatFx();
    } else {
      playAskDogFx();
    }
    return;
  }
  if (kind === 'crunch' || kind === 'eat') {
    playCrunchFx();
    return;
  }
  if (kind === 'drink') {
    playDrinkFx();
    return;
  }
  if (kind === 'sigh' || kind === 'sleep') {
    playSighFx();
    return;
  }
  if (kind === 'paw' || kind === 'play') {
    if (isCat) {
      playPlayCatFx();
    } else {
      playPlayDogFx();
    }
    return;
  }
  if (isCat) {
    playHappyCatFx();
  } else {
    playHappyDogFx();
  }
}

function isAudioReady() {
  return Boolean(getRunningAudioContext());
}

function playFunSound(kind, enabled, species) {
  if (!enabled) {
    return false;
  }
  if (!getRunningAudioContext()) {
    return false;
  }
  playKind(kind, normalizeSpecies(species));
  return true;
}

function measureBufferPeak(audioBuffer) {
  let peak = 0;
  const channel = audioBuffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) {
    const abs = Math.abs(channel[index]);
    if (abs > peak) {
      peak = abs;
    }
  }
  return peak;
}

function renderFunSoundOffline(kind, species, durationSec) {
  if (typeof OfflineAudioContext === 'undefined' && typeof window === 'undefined') {
    return Promise.resolve({ ok: false, peak: 0 });
  }
  const OfflineCtx =
    typeof OfflineAudioContext !== 'undefined'
      ? OfflineAudioContext
      : window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineCtx) {
    return Promise.resolve({ ok: false, peak: 0 });
  }
  const sampleRate = 44100;
  const seconds = Math.max(0.4, durationSec || 0.7);
  const offline = new OfflineCtx(1, Math.floor(sampleRate * seconds), sampleRate);
  const previousContext = audioContext;
  const previousUnlocked = audioUnlocked;
  const previousMaster = masterGainNode;
  audioContext = offline;
  audioUnlocked = true;
  masterGainNode = null;
  playKind(kind, normalizeSpecies(species));
  return offline
    .startRendering()
    .then(function onRendered(buffer) {
      const peak = measureBufferPeak(buffer);
      return { ok: peak > 0.02, peak: peak };
    })
    .catch(function onFail() {
      return { ok: false, peak: 0 };
    })
    .then(function restore(result) {
      audioContext = previousContext;
      audioUnlocked = previousUnlocked;
      masterGainNode = previousMaster;
      return result;
    });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    playFunSound,
    unlockFunAudio,
    isAudioReady,
    loadMeowSampleBuffers,
    renderFunSoundOffline,
    SOUND_SPECIES_DOG,
    SOUND_SPECIES_CAT,
    normalizeSpecies,
    MASTER_GAIN,
  };
}

if (typeof globalThis !== 'undefined') {
  globalThis.playFunSound = playFunSound;
  globalThis.unlockFunAudio = unlockFunAudio;
  globalThis.isAudioReady = isAudioReady;
  globalThis.loadMeowSampleBuffers = loadMeowSampleBuffers;
  globalThis.renderFunSoundOffline = renderFunSoundOffline;
  globalThis.SOUND_SPECIES_DOG = SOUND_SPECIES_DOG;
  globalThis.SOUND_SPECIES_CAT = SOUND_SPECIES_CAT;
}
