// Player on foot — walk, run, punch, aim, shoot, reload, enter and exit cars.
// Movement is plain math over a player object; the loop owns collisions.
import { WEAPONS } from './config.js';

export function makePlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2,
    hp: 100, armor: 0,
    onFoot: true,
    carId: null,
    weapon: 'pistol',
    ammo: {
      pistol: { mag: 12, reserve: 120 },
      smg: { mag: 30, reserve: 180 },
      shotgun: { mag: 6, reserve: 40 },
    },
    reloading: 0,
    lastShot: 0,
    punchCooldown: 0,
    speed: 0,
  };
}

export function moveOnFoot(player, input, dt, blocked) {
  const run = input.run ? 1.7 : 1;
  const speed = 165 * run;
  let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(dx, dy);
  if (len > 0) {
    dx /= len;
    dy /= len;
    const nx = player.x + dx * speed * dt;
    const ny = player.y + dy * speed * dt;
    if (!blocked(nx, player.y)) player.x = nx;
    if (!blocked(player.x, ny)) player.y = ny;
    player.angle = Math.atan2(dy, dx);
    player.speed = speed;
  } else {
    player.speed = 0;
  }
  return player;
}

export function hurtPlayer(player, amount, armorAbsorb) {
  let rest = amount;
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, rest * 0.6 + armorAbsorb);
    player.armor -= absorbed;
    rest -= absorbed;
  }
  player.hp -= rest;
  if (player.hp < 0) player.hp = 0;
  return player.hp <= 0;
}

export function canShoot(player, now) {
  const w = WEAPONS[player.weapon];
  return player.onFoot && player.reloading <= 0 && player.ammo[player.weapon].mag > 0 && now - player.lastShot >= w.rate;
}

export function shoot(player, now) {
  if (!canShoot(player, now)) return null;
  const w = WEAPONS[player.weapon];
  player.ammo[player.weapon].mag -= 1;
  player.lastShot = now;
  const bullets = [];
  for (let p = 0; p < w.pellets; p++) {
    const spread = (Math.random() - 0.5) * 2 * w.spread;
    bullets.push({
      x: player.x + Math.cos(player.angle) * 26,
      y: player.y + Math.sin(player.angle) * 26,
      angle: player.angle + spread,
      speed: 900,
      damage: w.damage,
      range: w.range,
      traveled: 0,
      fromPlayer: true,
    });
  }
  return bullets;
}

export function startReload(player, now) {
  const slot = player.ammo[player.weapon];
  if (slot.mag >= WEAPONS[player.weapon].mag || slot.reserve <= 0) return false;
  player.reloading = now + 1.1;
  return true;
}

export function finishReload(player) {
  const w = WEAPONS[player.weapon];
  const slot = player.ammo[player.weapon];
  const need = w.mag - slot.mag;
  const take = Math.min(need, slot.reserve);
  slot.mag += take;
  slot.reserve -= take;
  player.reloading = 0;
}

export function punch(player, now) {
  if (player.punchCooldown > now) return false;
  player.punchCooldown = now + 0.45;
  return true;
}

export function switchWeapon(player, name) {
  if (WEAPONS[name]) player.weapon = name;
}
