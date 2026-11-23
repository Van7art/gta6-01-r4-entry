// Wanted level and police response — the 0 to 5 star ladder.
// Pure helpers: how many cops, when roadblocks, helicopter and spikes appear,
// and how heat decays when the player stays out of sight.
import { WANTED } from './config.js';

export function starsForCrime(wanted, crime) {
  const add = { murder: 2, shoot: 1, steal: 1, assault: 1, speeding: 0 }[crime] ?? 1;
  return Math.min(WANTED.maxStars, wanted + add);
}

export function copCarCount(wanted) {
  return wanted <= 0 ? 0 : Math.min(8, wanted * WANTED.copCarsPerStar);
}

export function footCopCount(wanted) {
  return wanted <= 0 ? 0 : Math.min(6, wanted * WANTED.footCopsPerStar);
}

export function roadblockActive(wanted) {
  return wanted >= WANTED.roadblockMinStars;
}

export function helicopterActive(wanted) {
  return wanted >= WANTED.heliMinStars;
}

export function spikeStripActive(wanted) {
  return wanted >= WANTED.spikeMinStars;
}

export function decayWanted(wanted, hiddenSeconds) {
  const lost = Math.floor(hiddenSeconds / WANTED.decaySeconds);
  return Math.max(0, wanted - lost);
}

export function wantedLabel(wanted) {
  return wanted === 0 ? 'Clean' : wanted <= 2 ? 'Hot' : wanted <= 4 ? 'Very hot' : 'MAX HEAT';
}

export function makeRoadblock(x, y, angle) {
  return { x, y, angle, cars: 3 };
}

export function makeSpikeStrip(x, y, angle) {
  return { x, y, angle, armed: true };
}

export function heliSearchlight(helicopter, player) {
  const dx = player.x - helicopter.x;
  const dy = player.y - helicopter.y;
  const dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  return { x: helicopter.x, y: helicopter.y, angle, dist, onPlayer: dist < 260 };
}
