'use strict';

/**
 * Fun lightweight sound effects via Web Audio (no media files).
 * Respects settings.sound — call sites pass enabled flag.
 *
 * Chrome blocks AudioContext until a user gesture. We never create or resume
 * the context until unlockFunAudio() runs from a click/pointerdown.
 */

let audioContext = null;
let audioUnlocked = false;

function getAudioContext() {
  if (!audioUnlocked) {
    return null;
  }
  if (audioContext) {
    return audioContext;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return null;
  }
  audioContext = new AudioCtx();
  return audioContext;
}

function unlockFunAudio() {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }
  audioUnlocked = true;
  const context = getAudioContext();
  if (!context) {
    audioUnlocked = false;
    return Promise.resolve(false);
  }
  if (context.state === 'running') {
    return Promise.resolve(true);
  }
  return context
    .resume()
    .then(function onResumed() {
      return context.state === 'running';
    })
    .catch(function onResumeFail() {
      return false;
    });
}

function playTone(frequency, durationMs, type, gainValue, when) {
  const context = getAudioContext();
  if (!context || context.state !== 'running') {
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
  const context = getAudioContext();
  if (!context || context.state !== 'running') {
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
  const context = getAudioContext();
  if (!context || context.state !== 'running') {
    return;
  }
  playTone(420, 90, 'square', 0.09, context.currentTime);
  playTone(280, 140, 'triangle', 0.11, context.currentTime + 0.08);
  playNoise(80, 0.05);
}

function playHappyFx() {
  const context = getAudioContext();
  if (!context || context.state !== 'running') {
    return;
  }
  playTone(520, 80, 'sine', 0.08, context.currentTime);
  playTone(660, 90, 'sine', 0.08, context.currentTime + 0.09);
  playTone(880, 120, 'triangle', 0.07, context.currentTime + 0.18);
}

function playJingleFx() {
  const context = getAudioContext();
  if (!context || context.state !== 'running') {
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
  const context = getAudioContext();
  if (!context || context.state !== 'running') {
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
  if (!audioUnlocked) {
    return;
  }
  const context = getAudioContext();
  if (!context) {
    return;
  }
  if (context.state === 'running') {
    playKind(kind);
    return;
  }
  context
    .resume()
    .then(function onResumed() {
      if (context.state === 'running') {
        playKind(kind);
      }
    })
    .catch(function ignore() {
      return undefined;
    });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { playFunSound, unlockFunAudio };
}

if (typeof globalThis !== 'undefined') {
  globalThis.playFunSound = playFunSound;
  globalThis.unlockFunAudio = unlockFunAudio;
}
