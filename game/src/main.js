// Port Solana — main loop: state, spawning, combat, police, missions, crew,
// garage, saving, and the frame that ties rendering and HUD together.
import { SEED, WORLD_SIZE, GARAGE_LOCATION, AIRPORT_GATE, SUNSET_PLAZA, PARK_CENTER, MARKET_CENTER, WANTED } from './config.js';
import { generateCity, collidesWithBuilding, isOnRoad } from './city.js';
import { mulberry32, range } from './rng.js';
import { makePlayer, moveOnFoot, hurtPlayer, shoot, startReload, finishReload, punch, switchWeapon } from './player.js';
import { makeCar, spawnTraffic, spawnParked, driveCar, updateTrafficCar, damageCar, applyExplosion, nearestCar, explosionRadius } from './cars.js';
import { copCarCount, footCopCount, roadblockActive, helicopterActive, spikeStripActive, decayWanted, starsForCrime } from './police.js';
import { MISSIONS, missionByIndex, checkMissionProgress, defaultMissionProgress } from './missions.js';
import { defaultCrewState, useRico, useLena, useMarco, crewBoostActive, crewBlackoutActive, crewAllyActive } from './crew.js';
import { defaultGarage, buyGarageItem, engineTopSpeed, tiresGrip, armorAbsorb } from './garage.js';
import { defaultSave, saveFromState, writeSave, readSave, saveExists } from './save.js';
import { makeAudio, unlockAudio, cycleStation, setMuted, playShot, playExplosion, playSiren, playPickup, playMissionDone, playPunch } from './audio.js';
import { makeInput, attachInput, inputState, wasPressed, clearPressed } from './input.js';
import { makeCamera, renderWorld } from './render.js';
import { drawHud, drawTitle, drawPause } from './hud.js';
import { sceneFromUrl, applyScene } from './scenes.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const VIEW_W = 1280;
const VIEW_H = 720;

export function newGameState(save) {
  const city = generateCity(SEED);
  const base = save ?? defaultSave();
  const player = makePlayer(base.playerX, base.playerY);
  player.hp = base.health;
  player.armor = base.armor;
  player.ammo = base.weapons;
  player.weapon = base.currentWeapon;
  const rng = mulberry32(SEED);
  const traffic = spawnTraffic(SEED, 16, city.roads);
  const parked = spawnParked(SEED, 10, city.roads);
  const playerCar = makeCar('player-car', base.playerX + 60, base.playerY, 0, { color: base.garage.color, name: 'Sunrise', kind: 'player', driver: true });
  const state = {
    city, time: 0, mode: 'title', scene: null,
    player, playerCar,
    cars: [...traffic, ...parked, playerCar],
    pedestrians: [],
    rivals: [],
    footCops: [],
    bullets: [],
    explosions: [],
    pickups: [],
    roadblocks: [],
    spikes: [],
    heli: null,
    wanted: 0,
    heatTimer: 0,
    hiddenTimer: 0,
    money: base.money,
    respect: base.respect,
    missionIndex: base.missionIndex,
    missions: MISSIONS,
    mission: missionByIndex(base.missionIndex),
    missionProgress: defaultMissionProgress(),
    completedMissions: [...base.completedMissions],
    crew: defaultCrewState(),
    garage: { ...base.garage },
    carHealth: base.carHealth,
    audio: makeAudio(),
    input: makeInput(),
    camera: makeCamera(),
    toast: '',
    toastUntil: 0,
    rng,
    spawnTimer: 0,
    sirenTimer: 0,
    survivedTimer: 0,
    boughtThisMission: 0,
    hasSave: saveExists(window.localStorage),
  };
  for (let i = 0; i < 8; i++) {
    state.pedestrians.push({ x: range(rng, 300, 2900), y: range(rng, 300, 2900), hp: 100, angle: range(rng, 0, Math.PI * 2), speed: 30 });
  }
  return state;
}

function setToast(state, text, seconds = 4) {
  state.toast = text;
  state.toastUntil = state.time + seconds;
}

function spawnMissionActors(state) {
  const mission = state.mission;
  state.rivals = [];
  state.pickups = [];
  if (mission.kind === 'defeat') {
    for (let i = 0; i < 4; i++) {
      state.rivals.push({ x: MARKET_CENTER.x + (i % 2 ? 120 : -120), y: MARKET_CENTER.y + (i < 2 ? -100 : 100), hp: 60, angle: 0 });
    }
  }
  if (mission.kind === 'collect') {
    for (let i = 0; i < 3; i++) {
      state.pickups.push({ x: PARK_CENTER.x + (i - 1) * 220, y: PARK_CENTER.y + (i % 2 ? 160 : -160), taken: false });
    }
  }
}

function completeMission(state) {
  const mission = state.mission;
  state.money += mission.reward;
  state.respect += mission.respect;
  state.completedMissions.push(mission.id);
  playMissionDone(state.audio);
  setToast(state, `MISSION COMPLETE — ${mission.title}! +$${mission.reward}  +${mission.respect} respect`, 6);
  writeSave(window.localStorage, saveFromState(state));
  if (state.missionIndex < MISSIONS.length - 1) {
    state.missionIndex += 1;
    state.mission = missionByIndex(state.missionIndex);
    state.missionProgress = defaultMissionProgress();
    state.boughtThisMission = 0;
    state.survivedTimer = 0;
    spawnMissionActors(state);
  } else {
    state.mode = 'complete';
    setToast(state, 'YOU ARE THE KING OF PORT SOLANA!', 999);
  }
}

function explodeCar(state, car) {
  state.explosions.push({ x: car.x, y: car.y, age: 0, life: 1.2 });
  playExplosion(state.audio);
  const result = applyExplosion({ x: car.x, y: car.y }, state.cars, [...state.rivals, ...state.footCops, state.player]);
  for (const chained of result.hitCars) explodeCar(state, chained);
  if (state.player.hp <= 0) state.mode = 'dead';
}

function updatePolice(state, dt) {
  const wanted = state.wanted;
  const wantCars = copCarCount(wanted);
  const cops = state.cars.filter((c) => c.kind === 'police' && !c.exploded);
  if (cops.length < wantCars && state.spawnTimer <= 0) {
    const angle = Math.atan2(state.player.y - 1600, state.player.x - 1600);
    const sx = state.player.x + Math.cos(angle + Math.PI) * 700;
    const sy = state.player.y + Math.sin(angle + Math.PI) * 700;
    const cop = makeCar('cop-' + Date.now() + '-' + cops.length, sx, sy, angle, { color: '#2456c9', name: 'Interceptor', kind: 'police', driver: true, targetSpeed: 170 });
    state.cars.push(cop);
    state.spawnTimer = 1.2;
    playSiren(state.audio);
  }
  state.spawnTimer -= dt;
  for (const cop of cops) {
    const dx = state.player.x - cop.x;
    const dy = state.player.y - cop.y;
    const dist = Math.hypot(dx, dy);
    cop.angle = Math.atan2(dy, dx);
    cop.speed = Math.min(190, 90 + wanted * 18);
    cop.x += Math.cos(cop.angle) * cop.speed * dt;
    cop.y += Math.sin(cop.angle) * cop.speed * dt;
    if (dist < 46) {
      if (state.player.onFoot) hurtPlayer(state.player, 12 * dt * 4, armorAbsorb(state.garage));
      else if (state.playerCar) damageCar(state.playerCar, 8 * dt);
      if (state.player.hp <= 0) state.mode = 'dead';
    }
  }
  const wantFoot = footCopCount(wanted);
  while (state.footCops.length < wantFoot) {
    state.footCops.push({ x: state.player.x + range(state.rng, -500, 500), y: state.player.y + range(state.rng, -500, 500), hp: 50, angle: 0 });
  }
  for (const cop of state.footCops) {
    const dx = state.player.x - cop.x;
    const dy = state.player.y - cop.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 30) {
      cop.angle = Math.atan2(dy, dx);
      cop.x += Math.cos(cop.angle) * 120 * dt;
      cop.y += Math.sin(cop.angle) * 120 * dt;
    } else if (state.player.onFoot) {
      hurtPlayer(state.player, 10 * dt, armorAbsorb(state.garage));
      if (state.player.hp <= 0) state.mode = 'dead';
    }
  }
  state.footCops = state.footCops.filter((c) => c.hp > 0);
  if (roadblockActive(wanted) && state.roadblocks.length === 0) {
    const ahead = { x: state.player.x + 500, y: state.player.y };
    state.roadblocks.push({ x: ahead.x, y: ahead.y, angle: 0, cars: 3 });
    for (let i = -1; i <= 1; i++) {
      state.cars.push(makeCar('roadblock-' + i, ahead.x, ahead.y + i * 60, Math.PI / 2, { color: '#2456c9', name: 'Interceptor', kind: 'police', driver: false }));
    }
  }
  if (!roadblockActive(wanted)) state.roadblocks = [];
  if (helicopterActive(wanted) && !state.heli) {
    state.heli = { x: state.player.x - 200, y: state.player.y - 200, angle: 0 };
  }
  if (!helicopterActive(wanted)) state.heli = null;
  if (state.heli) {
    const dx = state.player.x - state.heli.x;
    const dy = state.player.y - state.heli.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 160) {
      state.heli.x += (dx / dist) * 150 * dt;
      state.heli.y += (dy / dist) * 150 * dt;
    }
  }
  if (spikeStripActive(wanted) && state.spikes.length === 0) {
    state.spikes.push({ x: state.player.x + 320, y: state.player.y, angle: Math.PI / 2, armed: true });
  }
  if (!spikeStripActive(wanted)) state.spikes = [];
  // Heat decay: hidden means no cop within 300.
  const nearestCop = Math.min(9999, ...state.cars.filter((c) => c.kind === 'police').map((c) => Math.hypot(c.x - state.player.x, c.y - state.player.y)), ...state.footCops.map((c) => Math.hypot(c.x - state.player.x, c.y - state.player.y)));
  if (wanted > 0 && nearestCop > 300 && !state.heli) {
    state.hiddenTimer += dt;
    if (state.hiddenTimer >= WANTED.decaySeconds) {
      state.wanted = Math.max(0, state.wanted - 1);
      state.hiddenTimer = 0;
      setToast(state, 'Heat cooling off… wanted level dropped.');
    }
  } else {
    state.hiddenTimer = 0;
  }
}

function updateMissions(state, dt) {
  const mission = state.mission;
  if (!mission || state.mode !== 'play') return;
  const atTarget = mission.target ? Math.hypot(state.player.x - mission.target.x, state.player.y - mission.target.y) < mission.target.r : false;
  if (mission.kind === 'survive' && state.wanted >= 5) state.survivedTimer += dt;
  const collected = state.pickups.filter((p) => p.taken).length;
  const defeated = state.rivals.filter((r) => r.hp <= 0).length;
  const result = checkMissionProgress(mission, state.missionProgress, {
    stoleCar: state.missionProgress.stoleCar,
    atTarget,
    collected,
    defeated,
    bought: state.boughtThisMission,
    survivedSeconds: state.survivedTimer,
    wanted: state.wanted,
    inCar: !state.player.onFoot,
  });
  state.missionProgress = result.progress;
  if (result.done) completeMission(state);
}

function update(state, dt) {
  state.time += dt;
  const input = state.input;
  const keys = inputState(input);
  const player = state.player;
  // Aim with the mouse (screen space to world space).
  const worldMouseX = state.camera.x + (input.mouseX - VIEW_W / 2) / state.camera.zoom;
  const worldMouseY = state.camera.y + (input.mouseY - VIEW_H / 2) / state.camera.zoom;
  if (player.onFoot) player.angle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);
  // Crew.
  if (wasPressed(input, 'KeyZ') && useRico(state.crew, state.time)) setToast(state, 'RICO: full throttle! Speed boost active.');
  if (wasPressed(input, 'KeyX') && useLena(state.crew, state.time)) {
    state.wanted = Math.max(0, state.wanted - 1);
    setToast(state, 'LENA: blackout! Wanted level dropped a star.');
  }
  if (wasPressed(input, 'KeyV') && useMarco(state.crew, state.time, player.x, player.y)) setToast(state, 'BIG MARCO is with you. He fights beside you.');
  // Radio + mute.
  if (wasPressed(input, 'KeyM')) {
    const station = cycleStation(state.audio);
    setToast(state, `Radio: SOL ${station.freq} — ${station.name}`);
  }
  if (wasPressed(input, 'KeyU')) {
    setMuted(state.audio, !state.audio.muted);
    setToast(state, state.audio.muted ? 'Sound muted.' : 'Sound on.');
  }
  // Weapon wheel.
  if (input.wheelOpen) {
    if (wasPressed(input, 'Digit1')) switchWeapon(player, 'pistol');
    if (wasPressed(input, 'Digit2')) switchWeapon(player, 'smg');
    if (wasPressed(input, 'Digit3')) switchWeapon(player, 'shotgun');
  }
  if (wasPressed(input, 'Digit1')) switchWeapon(player, 'pistol');
  if (wasPressed(input, 'Digit2')) switchWeapon(player, 'smg');
  if (wasPressed(input, 'Digit3')) switchWeapon(player, 'shotgun');
  // Garage.
  const nearGarage = Math.hypot(player.x - (GARAGE_LOCATION.x + 130), player.y - (GARAGE_LOCATION.y + 95)) < 220;
  if (wasPressed(input, 'KeyG') && nearGarage && state.mode === 'play') {
    state.mode = 'garage';
    setToast(state, "Welcome to Rico's Garage.");
  } else if (wasPressed(input, 'KeyG') && state.mode === 'garage') {
    state.mode = 'play';
  }
  if (state.mode === 'garage') {
    const ids = ['repair', 'repaint', 'armor', 'engine', 'tires'];
    ids.forEach((id, i) => {
      if (wasPressed(input, 'Digit' + (i + 1))) {
        const result = buyGarageItem(state.garage, state.money, state.carHealth, id);
        if (result.ok) {
          state.money = result.money;
          state.carHealth = result.carHealth;
          state.garage = result.garage;
          if (id === 'armor' || id === 'engine') state.boughtThisMission += 1;
          setToast(state, result.reason + ' — nice.');
        } else {
          setToast(state, 'Garage: ' + result.reason + '.');
        }
      }
    });
    if (wasPressed(input, 'Escape') || wasPressed(input, 'KeyG')) state.mode = 'play';
    clearPressed(input);
    return;
  }
  // Enter / exit / steal cars.
  if (wasPressed(input, 'KeyE')) {
    if (!player.onFoot) {
      player.onFoot = true;
      player.carId = null;
      player.x = state.playerCar.x + 50;
      player.y = state.playerCar.y + 20;
    } else {
      const car = nearestCar(state.cars, player.x, player.y, 90);
      if (car) {
        const wasOccupied = car.driver && car.kind === 'traffic';
        if (wasOccupied) {
          state.wanted = starsForCrime(state.wanted, 'steal');
          setToast(state, `You jacked the ${car.name}! The driver ran off.`);
          state.missionProgress.stoleCar = true;
        }
        car.driver = true;
        car.kind = car.kind === 'police' ? 'police' : 'player';
        state.playerCar = car;
        player.onFoot = false;
        player.carId = car.id;
      }
    }
  }
  // Movement + driving.
  if (player.onFoot) {
    moveOnFoot(player, keys, dt, (x, y) => collidesWithBuilding(state.city, x, y, 14) || (x < 0 || y < 0 || x > WORLD_SIZE || y > WORLD_SIZE));
    if (player.reloading > 0 && state.time >= player.reloading) finishReload(player);
    if ((input.mouseDown || input.mousePressed) && !input.wheelOpen) {
      const bullets = shoot(player, state.time);
      if (bullets) {
        state.bullets.push(...bullets);
        playShot(state.audio, player.weapon);
        if (state.wanted < 2) state.wanted = starsForCrime(state.wanted, 'shoot');
      }
    }
    if (wasPressed(input, 'KeyR')) startReload(player, state.time);
    if (wasPressed(input, 'KeyF') && punch(player, state.time)) {
      playPunch(state.audio);
      for (const r of state.rivals) {
        if (Math.hypot(r.x - player.x, r.y - player.y) < 50) {
          r.hp -= 25;
          if (r.hp <= 0) setToast(state, 'Rival down!');
        }
      }
      if (state.wanted < 1) state.wanted = starsForCrime(state.wanted, 'assault');
    }
  } else if (state.playerCar) {
    const boost = crewBoostActive(state.crew, state.time) ? 1.45 : 1;
    driveCar(state.playerCar, keys, dt, engineTopSpeed(state.garage) * boost, tiresGrip(state.garage));
    player.x = state.playerCar.x;
    player.y = state.playerCar.y;
    player.angle = state.playerCar.angle;
    state.carHealth = state.playerCar.health;
    // Spike strips shred tires.
    for (const s of state.spikes) {
      if (s.armed && Math.hypot(state.playerCar.x - s.x, state.playerCar.y - s.y) < 50) {
        s.armed = false;
        state.playerCar.speed *= 0.35;
        damageCar(state.playerCar, 25);
        setToast(state, 'SPIKE STRIP! Tires shredded!');
      }
    }
    if (state.playerCar.health <= 0 && !state.playerCar.exploded) {
      explodeCar(state, state.playerCar);
      player.onFoot = true;
      player.carId = null;
      player.x = state.playerCar.x + 50;
      player.y = state.playerCar.y;
    }
  }
  // Traffic.
  for (const car of state.cars) {
    if (car.kind === 'traffic' && !car.exploded) updateTrafficCar(car, dt, state.rng);
  }
  // Pedestrians wander.
  for (const p of state.pedestrians) {
    p.x += Math.cos(p.angle) * p.speed * dt;
    p.y += Math.sin(p.angle) * p.speed * dt;
    if (state.rng() < 0.005) p.angle = range(state.rng, 0, Math.PI * 2);
    if (p.x < 100 || p.x > 3100 || p.y < 100 || p.y > 3100) p.angle += Math.PI;
  }
  // Rivals chase and punch the player.
  for (const r of state.rivals) {
    if (r.hp <= 0) continue;
    const dx = player.x - r.x;
    const dy = player.y - r.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 40) {
      r.angle = Math.atan2(dy, dx);
      r.x += Math.cos(r.angle) * 110 * dt;
      r.y += Math.sin(r.angle) * 110 * dt;
    } else if (player.onFoot) {
      hurtPlayer(player, 9 * dt, armorAbsorb(state.garage));
      if (player.hp <= 0) state.mode = 'dead';
    }
  }
  // Crew ally fights the nearest rival.
  if (crewAllyActive(state.crew, state.time) && state.crew.ally) {
    const ally = state.crew.ally;
    const target = state.rivals.find((r) => r.hp > 0);
    if (target) {
      const dx = target.x - ally.x;
      const dy = target.y - ally.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 46) {
        ally.angle = Math.atan2(dy, dx);
        ally.x += Math.cos(ally.angle) * 150 * dt;
        ally.y += Math.sin(ally.angle) * 150 * dt;
      } else {
        target.hp -= 30 * dt;
      }
    } else {
      ally.x += (player.x - ally.x) * 0.5 * dt;
      ally.y += (player.y - ally.y) * 0.5 * dt;
    }
  }
  // Bullets fly and hit rivals, cops and cars.
  for (const b of state.bullets) {
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.traveled += b.speed * dt;
    for (const r of state.rivals) {
      if (r.hp > 0 && Math.hypot(r.x - b.x, r.y - b.y) < 16) { r.hp -= b.damage; b.traveled = b.range; }
    }
    for (const cop of state.footCops) {
      if (cop.hp > 0 && Math.hypot(cop.x - b.x, cop.y - b.y) < 16) { cop.hp -= b.damage; b.traveled = b.range; if (cop.hp <= 0) state.wanted = starsForCrime(state.wanted, 'murder'); }
    }
    for (const car of state.cars) {
      if (!car.exploded && car.id !== player.carId && Math.hypot(car.x - b.x, car.y - b.y) < 26) {
        b.traveled = b.range;
        if (damageCar(car, b.damage)) explodeCar(state, car);
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.traveled < b.range && b.x > 0 && b.x < WORLD_SIZE && b.y > 0 && b.y < WORLD_SIZE);
  // Pickups.
  for (const p of state.pickups) {
    if (!p.taken && player.onFoot && Math.hypot(p.x - player.x, p.y - player.y) < 34) {
      p.taken = true;
      state.money += 150;
      playPickup(state.audio);
      setToast(state, 'Cash drop collected! +$150');
    }
  }
  // Explosions age out.
  for (const e of state.explosions) e.age += dt;
  state.explosions = state.explosions.filter((e) => e.age < e.life);
  // Blackout: Lena's hack also hides the player from the helicopter.
  if (crewBlackoutActive(state.crew, state.time) && state.heli) state.heli = null;
  updatePolice(state, dt);
  updateMissions(state, dt);
  // Camera follows the player.
  state.camera.x += (player.x - state.camera.x) * Math.min(1, 6 * dt);
  state.camera.y += (player.y - state.camera.y) * Math.min(1, 6 * dt);
  clearPressed(input);
}

function frame(holder, now) {
  const state = holder.state;
  const dt = Math.min(0.05, (now - (state.lastFrame ?? now)) / 1000 || 0.016);
  state.lastFrame = now;
  if (state.mode === 'play' || state.mode === 'garage') update(state, dt);
  else clearPressed(state.input);
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (state.mode === 'title') {
    drawTitle(ctx, state, VIEW_W, VIEW_H, state.hasSave);
  } else if (state.mode === 'dead') {
    renderWorld(ctx, state, state.camera, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(8,6,14,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#ff2e2e';
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WASTED', VIEW_W / 2, VIEW_H / 2 - 10);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.fillText('Press ENTER to respawn at the hospital with half your cash.', VIEW_W / 2, VIEW_H / 2 + 30);
    ctx.textAlign = 'left';
  } else if (state.mode === 'complete') {
    renderWorld(ctx, state, state.camera, VIEW_W, VIEW_H);
    drawHud(ctx, state, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(8,6,14,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KING OF PORT SOLANA', VIEW_W / 2, VIEW_H / 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.fillText('All 8 missions complete. The city is yours.', VIEW_W / 2, VIEW_H / 2 + 36);
    ctx.textAlign = 'left';
  } else {
    renderWorld(ctx, state, state.camera, VIEW_W, VIEW_H);
    drawHud(ctx, state, VIEW_W, VIEW_H);
    if (state.mode === 'pause') drawPause(ctx, VIEW_W, VIEW_H);
  }
  requestAnimationFrame((t) => frame(holder, t));
}

function start() {
  const params = new URLSearchParams(window.location.search);
  const sceneName = sceneFromUrl(params.toString());
  const holder = { state: newGameState(null) };
  let state = holder.state;
  attachInput(state.input, canvas);
  window.addEventListener('keydown', (e) => {
    state = holder.state;
    unlockAudio(state.audio);
    if (state.mode === 'title' && e.code === 'Enter') {
      state.mode = 'play';
      spawnMissionActors(state);
    }
    if (state.mode === 'title' && e.code === 'KeyC' && state.hasSave) {
      const saved = readSave(window.localStorage);
      if (saved) {
        holder.state = newGameState(saved);
        attachInput(holder.state.input, canvas);
        holder.state.mode = 'play';
        spawnMissionActors(holder.state);
      }
    }
    if (state.mode === 'play' && e.code === 'KeyP') state.mode = 'pause';
    else if (state.mode === 'pause' && e.code === 'KeyP') state.mode = 'play';
    if (state.mode === 'dead' && e.code === 'Enter') {
      const cash = Math.floor(state.money / 2);
      holder.state = newGameState(null);
      attachInput(holder.state.input, canvas);
      holder.state.money = cash;
      holder.state.mode = 'play';
      spawnMissionActors(holder.state);
    }
  });
  canvas.addEventListener('mousedown', () => unlockAudio(holder.state.audio));
  if (sceneName) {
    applyScene(holder.state, sceneName);
    spawnMissionActors(holder.state);
    // Scenes re-assert their own actors after the generic spawn.
    applyScene(holder.state, sceneName);
    holder.state.camera.x = holder.state.player.x;
    holder.state.camera.y = holder.state.player.y;
  }
  requestAnimationFrame((t) => frame(holder, t));
}

start();
