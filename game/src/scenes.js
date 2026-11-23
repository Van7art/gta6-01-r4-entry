// Staged scenes — deterministic setups chosen by ?scene= in the page address.
// Each scene is a plain override applied to a fresh state, so screenshots are
// repeatable: same scene name, same frame.
import { MISSIONS } from './missions.js';

export const SCENES = {
  cover: { mission: 7, wanted: 5, money: 4850, respect: 720, label: 'Five Star Sunset chase' },
  chase: { mission: 5, wanted: 4, money: 2100, respect: 340, label: 'Highway Heat chase' },
  garage: { mission: 6, wanted: 0, money: 3200, respect: 480, label: "Rico's Garage" },
  foot: { mission: 4, wanted: 3, money: 1500, respect: 260, label: 'Muscle Memory on foot' },
};

export function sceneNames() {
  return Object.keys(SCENES);
}

export function sceneFromUrl(search) {
  const params = new URLSearchParams(search || '');
  const name = params.get('scene');
  return name && SCENES[name] ? name : null;
}

export function sceneMissionIndex(name) {
  const scene = SCENES[name];
  return scene ? scene.mission - 1 : 0;
}

export function applyScene(state, name) {
  const scene = SCENES[name];
  if (!scene) return state;
  state.scene = name;
  state.missionIndex = scene.mission - 1;
  state.wanted = scene.wanted;
  state.money = scene.money;
  state.respect = scene.respect;
  state.mode = 'play';
  state.mission = MISSIONS[state.missionIndex];
  if (name === 'cover') {
    state.player.x = 1600;
    state.player.y = 1600;
    state.player.onFoot = false;
    state.playerCar = state.cars.find((c) => c.kind === 'player') ?? state.cars[0];
    if (state.playerCar) {
      state.playerCar.x = 1600;
      state.playerCar.y = 1600;
      state.playerCar.angle = Math.PI / 2;
      state.playerCar.speed = 18;
      state.player.carId = state.playerCar.id;
    }
    state.heli = { x: 1400, y: 1400, angle: 0 };
    state.roadblocks = [{ x: 1900, y: 1600, angle: 0, cars: 3 }];
    if (!state.cars.find((c) => c.id === 'roadblock-cover-0')) {
      for (let i = -1; i <= 1; i++) {
        state.cars.push({ id: 'roadblock-cover-' + (i + 1), x: 1900, y: 1600 + i * 60, angle: Math.PI / 2, speed: 0, color: '#2456c9', name: 'Interceptor', kind: 'police', driver: false, health: 100, smoking: false, exploded: false, targetSpeed: 0, routeAngle: Math.PI / 2, stuck: 0 });
      }
    }
    state.spikes = [{ x: 1750, y: 1600, angle: Math.PI / 2, armed: true }];
    state.explosions = [{ x: 1470, y: 1720, age: 0.3, life: 1.2 }];
    state.crew.rico.readyAt = 20;
    state.toast = 'SPIKE STRIP! Tires shredded!';
    state.toastUntil = 999;
  }
  if (name === 'chase') {
    state.player.x = 1600;
    state.player.y = 2000;
    state.player.onFoot = false;
    state.playerCar = state.cars.find((c) => c.kind === 'player') ?? state.cars[0];
    if (state.playerCar) {
      state.playerCar.x = 1600;
      state.playerCar.y = 2000;
      state.playerCar.angle = Math.PI / 2;
      state.playerCar.speed = 74;
      state.player.carId = state.playerCar.id;
    }
    state.toast = 'MISSION 5 — HIGHWAY HEAT: outrun the 4-star chase!';
    state.toastUntil = 999;
  }
  if (name === 'garage') {
    state.player.x = 750;
    state.player.y = 1510;
    state.player.onFoot = true;
    state.mode = 'garage';
    state.carHealth = 100;
    state.garage = { armorLevel: 1, engineLevel: 1, tiresLevel: 0, color: '#e8b13c' };
    state.toast = 'MISSION 6 — GOLDEN GARAGE: tune the car!';
    state.toastUntil = 999;
  }
  if (name === 'foot') {
    state.player.x = 1300;
    state.player.y = 2350;
    state.player.onFoot = true;
    state.player.weapon = 'shotgun';
    state.crew.marco.readyAt = 40;
    state.crew.ally = { x: 1360, y: 2420, hp: 100, angle: 0 };
    state.crew.allyUntil = 999;
    state.rivals = [
      { x: 1500, y: 2300, hp: 60, angle: 0 },
      { x: 1560, y: 2380, hp: 60, angle: 0 },
      { x: 1440, y: 2440, hp: 60, angle: 0 },
      { x: 1620, y: 2450, hp: 60, angle: 0 },
    ];
    state.toast = 'MISSION 4 — MUSCLE MEMORY: take back Southside Market!';
    state.toastUntil = 999;
  }
  return state;
}
