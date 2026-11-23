// Crew abilities — Rico the Driver, Lena the Hacker, Big Marco the muscle.
// Pure cooldown logic: a crew member is ready when the clock passes their readyAt.
import { CREW } from './config.js';

export function defaultCrewState() {
  return {
    rico: { readyAt: 0 },
    lena: { readyAt: 0 },
    marco: { readyAt: 0 },
    boostUntil: 0,
    blackoutUntil: 0,
    allyUntil: 0,
    ally: null,
  };
}

export function crewReady(crew, key, now) {
  return now >= (crew[key]?.readyAt ?? 0);
}

export function crewCooldownLeft(crew, key, now) {
  return Math.max(0, Math.ceil((crew[key]?.readyAt ?? 0) - now));
}

export function useRico(crew, now) {
  if (!crewReady(crew, 'rico', now)) return false;
  crew.rico.readyAt = now + CREW.rico.cooldown;
  crew.boostUntil = now + CREW.rico.boostSeconds;
  return true;
}

export function useLena(crew, now) {
  if (!crewReady(crew, 'lena', now)) return false;
  crew.lena.readyAt = now + CREW.lena.cooldown;
  crew.blackoutUntil = now + 10;
  return true;
}

export function useMarco(crew, now, x, y) {
  if (!crewReady(crew, 'marco', now)) return false;
  crew.marco.readyAt = now + CREW.marco.cooldown;
  crew.allyUntil = now + CREW.marco.allySeconds;
  crew.ally = { x: x + 40, y: y + 40, hp: 100, angle: 0 };
  return true;
}

export function crewBoostActive(crew, now) {
  return now < crew.boostUntil;
}

export function crewBlackoutActive(crew, now) {
  return now < crew.blackoutUntil;
}

export function crewAllyActive(crew, now) {
  return crew.ally !== null && now < crew.allyUntil && crew.ally.hp > 0;
}

export function crewStatusLines(crew, now) {
  return [
    `Rico the Driver: ${crewReady(crew, 'rico', now) ? 'ready' : 'cooling ' + crewCooldownLeft(crew, 'rico', now) + 's'}`,
    `Lena the Hacker: ${crewReady(crew, 'lena', now) ? 'ready' : 'cooling ' + crewCooldownLeft(crew, 'lena', now) + 's'}`,
    `Big Marco: ${crewReady(crew, 'marco', now) ? 'ready' : 'cooling ' + crewCooldownLeft(crew, 'marco', now) + 's'}`,
  ];
}
