'use strict';

/**
 * Fun lightweight sound effects via Web Audio (no media files).
 * Respects settings.sound — call sites pass enabled flag.
 *
 * Chrome autoplay policy: never create or resume AudioContext except inside
 * unlockFunAudio(), which must run from a user gesture (click / pointerdown).
 * playFunSound is silent until the context is running.
 */

let audioContext = null;
let audioUnlocked = false;

function getRunningAudioContext() {
  if (!audioUnlocked || !audioContext) {
    return null;
  }
  if (audioContext.state !== 'running') {
    return null;
  }
  return audioContext;
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
    }
  } catch (_error) {
    audioContext = null;
    audioUnlocked = false;
    return Promise.resolve(false);
  }

  if (audioContext.state === 'running') {
    audioUnlocked = true;
    return Promise.resolve(true);
  }

  return audioContext
    .resume()
    .then(function onResumed() {
      audioUnlocked = audioContext.state === 'running';
      return audioUnlocked;
    })
    .catch(function onResumeFail() {
      audioUnlocked = false;
      return false;
    });
}

function playTone(frequency, durationMs, type, gainValue, when) {
  const context = getRunningAudioContext();
  if (!context) {
    return;
  }
  const startAt = when || context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type || 'sine';
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainValue || 0.12, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationMs / 1000);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + durationMs / 1000 + 0.02);
}

function playNoise(durationMs, gainValue) {
  const context = getRunningAudioContext();
  if (!context) {
    return;
  }
  const length = Math.floor(context.sampleRate * (durationMs / 1000));
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
  filter.frequency.value = 900;
  gain.gain.value = gainValue || 0.08;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start();
}

function playBarkFx() {
  const context = getRunningAudioContext();
  if (!context) {
    return;
  }
  playTone(420, 90, 'square', 0.09, context.currentTime);
  playTone(280, 140, 'triangle', 0.11, context.currentTime + 0.08);
  playNoise(80, 0.05);
}

function playHappyFx() {
  const context = getRunningAudioContext();
  if (!context) {
    return;
  }
  playTone(520, 80, 'sine', 0.08, context.currentTime);
  playTone(660, 90, 'sine', 0.08, context.currentTime + 0.09);
  playTone(880, 120, 'triangle', 0.07, context.currentTime + 0.18);
}

function playJingleFx() {
  const context = getRunningAudioContext();
  if (!context) {
    return;
  }
  playTone(880, 60, 'triangle', 0.06, context.currentTime);
  playTone(1320, 80, 'triangle', 0.05, context.currentTime + 0.07);
}

function playCrunchFx() {
  playNoise(120, 0.1);
  playTone(180, 60, 'sawtooth', 0.04);
}

function playDrinkFx() {
  const context = getRunningAudioContext();
  if (!context) {
    return;
  }
  playTone(240, 70, 'sine', 0.05, context.currentTime);
  playTone(200, 70, 'sine', 0.05, context.currentTime + 0.1);
  playTone(260, 70, 'sine', 0.04, context.currentTime + 0.2);
}

function playSighFx() {
  playTone(220, 280, 'sine', 0.04);
  playNoise(200, 0.03);
}

function playPawFx() {
  playNoise(40, 0.06);
  playTone(160, 40, 'triangle', 0.04);
}

function playKind(kind) {
  if (kind === 'bark') {
    playBarkFx();
  } else if (kind === 'happy' || kind === 'pet') {
    playHappyFx();
  } else if (kind === 'jingle' || kind === 'ask') {
    playJingleFx();
  } else if (kind === 'crunch' || kind === 'eat') {
    playCrunchFx();
  } else if (kind === 'drink') {
    playDrinkFx();
  } else if (kind === 'sigh' || kind === 'sleep') {
    playSighFx();
  } else if (kind === 'paw' || kind === 'play') {
    playPawFx();
  } else {
    playHappyFx();
  }
}

function playFunSound(kind, enabled) {
  if (!enabled) {
    return;
  }
  if (!getRunningAudioContext()) {
    return;
  }
  playKind(kind);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { playFunSound, unlockFunAudio };
}

if (typeof globalThis !== 'undefined') {
  globalThis.playFunSound = playFunSound;
  globalThis.unlockFunAudio = unlockFunAudio;
}
