// Sound — synthesized radio and effects through WebAudio only.
// No audio files, no network. Audio starts only after a user gesture.
import { RADIO_STATIONS } from './config.js';

export function makeAudio() {
  return {
    ctx: null,
    master: null,
    radioGain: null,
    stationIndex: 0,
    muted: false,
    radioTimer: null,
    step: 0,
    unlocked: false,
  };
}

export function unlockAudio(audio) {
  if (audio.unlocked) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio.ctx = new Ctx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.5;
    audio.master.connect(audio.ctx.destination);
    audio.radioGain = audio.ctx.createGain();
    audio.radioGain.gain.value = 0.16;
    audio.radioGain.connect(audio.master);
    audio.unlocked = true;
    startRadio(audio);
  } catch {
    audio.unlocked = false;
  }
}

function noteFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function playTone(audio, freq, dur, wave, gain, when = 0) {
  if (!audio.ctx || audio.muted) return;
  const t = audio.ctx.currentTime + when;
  const osc = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g);
  g.connect(audio.master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export function startRadio(audio) {
  if (!audio.ctx || audio.radioTimer) return;
  const station = RADIO_STATIONS[audio.stationIndex];
  const stepDur = 60 / station.tempo / 2;
  audio.radioTimer = window.setInterval(() => {
    if (audio.muted || !audio.ctx) return;
    const scale = station.scale;
    const root = 57;
    const degree = scale[audio.step % scale.length];
    const octave = Math.floor(audio.step / scale.length) % 2;
    const freq = noteFreq(root + degree + octave * 12);
    const t = audio.ctx.currentTime;
    const osc = audio.ctx.createOscillator();
    const g = audio.ctx.createGain();
    osc.type = station.wave;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + stepDur * 1.8);
    osc.connect(g);
    g.connect(audio.radioGain);
    osc.start(t);
    osc.stop(t + stepDur * 2);
    if (audio.step % 4 === 0) playTone(audio, noteFreq(33), stepDur * 2, 'sine', 0.2);
    audio.step += 1;
  }, stepDur * 1000);
}

export function cycleStation(audio) {
  audio.stationIndex = (audio.stationIndex + 1) % RADIO_STATIONS.length;
  audio.step = 0;
  return RADIO_STATIONS[audio.stationIndex];
}

export function currentStation(audio) {
  return RADIO_STATIONS[audio.stationIndex];
}

export function setMuted(audio, muted) {
  audio.muted = muted;
  if (audio.master) audio.master.gain.value = muted ? 0 : 0.5;
}

export function playShot(audio, weapon) {
  if (!audio.ctx) return;
  const dur = weapon === 'shotgun' ? 0.28 : 0.12;
  playTone(audio, weapon === 'shotgun' ? 140 : 220, dur, 'square', 0.22);
  playTone(audio, 60, 0.15, 'sawtooth', 0.18);
}

export function playExplosion(audio) {
  if (!audio.ctx) return;
  playTone(audio, 50, 0.9, 'sawtooth', 0.4);
  playTone(audio, 90, 0.5, 'square', 0.25);
}

export function playSiren(audio) {
  if (!audio.ctx) return;
  playTone(audio, 720, 0.35, 'sine', 0.1);
  playTone(audio, 540, 0.35, 'sine', 0.1, 0.35);
}

export function playPickup(audio) {
  if (!audio.ctx) return;
  playTone(audio, 880, 0.12, 'sine', 0.2);
  playTone(audio, 1320, 0.18, 'sine', 0.2, 0.1);
}

export function playMissionDone(audio) {
  if (!audio.ctx) return;
  [523, 659, 784, 1046].forEach((f, i) => playTone(audio, f, 0.22, 'triangle', 0.2, i * 0.12));
}

export function playPunch(audio) {
  if (!audio.ctx) return;
  playTone(audio, 120, 0.1, 'square', 0.2);
}
