// Cars — traffic, parked cars, driving physics, damage, smoke and explosions.
// Entities are plain objects; every update is a function of state + seconds.
import { WORLD_SIZE } from './config.js';
import { mulberry32, pickFrom, range } from './rng.js';

const CAR_COLORS = ['#c94f3d', '#3d7ac9', '#e8b13c', '#4fae5a', '#e8e8e8', '#8a5ac9', '#d97a2b', '#5a6b7a'];
const TRAFFIC_NAMES = ['Comet', 'Sunrise', 'Bayliner', 'Palm GT', 'Coastline', 'Marina', 'Solano', 'Viceroy'];

export function makeCar(id, x, y, angle, opts = {}) {
  return {
    id,
    x, y, angle,
    speed: 0,
    color: opts.color ?? '#c94f3d',
    name: opts.name ?? 'Comet',
    kind: opts.kind ?? 'traffic', // traffic | parked | player | police
    driver: opts.driver ?? true,
    health: opts.health ?? 100,
    smoking: false,
    exploded: false,
    targetSpeed: opts.targetSpeed ?? 0,
    routeAngle: angle,
    stuck: 0,
  };
}

export function spawnTraffic(seed, count, roads) {
  const rng = mulberry32(seed + 77);
  const cars = [];
  for (let i = 0; i < count; i++) {
    const vertical = rng() < 0.5;
    const road = pickFrom(rng, roads);
    const along = range(rng, 100, WORLD_SIZE - 100);
    const x = vertical ? road + (rng() < 0.5 ? -22 : 22) : along;
    const y = vertical ? along : road + (rng() < 0.5 ? -22 : 22);
    const angle = vertical ? (y > along ? 0 : Math.PI) : (x > along ? 0 : Math.PI);
    const dirAngle = vertical ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI);
    cars.push(makeCar('traffic-' + i, x, y, dirAngle, {
      color: pickFrom(rng, CAR_COLORS),
      name: pickFrom(rng, TRAFFIC_NAMES),
      targetSpeed: range(rng, 60, 110),
    }));
    cars[i].angle = dirAngle;
    void angle;
  }
  return cars;
}

export function spawnParked(seed, count, roads) {
  const rng = mulberry32(seed + 913);
  const cars = [];
  for (let i = 0; i < count; i++) {
    const vertical = rng() < 0.5;
    const road = pickFrom(rng, roads);
    const along = range(rng, 150, WORLD_SIZE - 150);
    const x = vertical ? road + (rng() < 0.5 ? -34 : 34) : along;
    const y = vertical ? along : road + (rng() < 0.5 ? -34 : 34);
    const angle = vertical ? Math.PI / 2 : 0;
    cars.push(makeCar('parked-' + i, x, y, angle, {
      color: pickFrom(rng, CAR_COLORS),
      name: pickFrom(rng, TRAFFIC_NAMES),
      kind: 'parked',
      driver: false,
    }));
  }
  return cars;
}

// Player driving: arcade physics — accelerate, brake/reverse, steer by speed,
// handbrake slides, upgrades raise top speed and grip.
export function driveCar(car, input, dt, topSpeed, grip) {
  const accel = 150;
  const brake = 240;
  if (input.up) car.speed += accel * dt * (1 + (topSpeed - 210) / 600);
  if (input.down) car.speed -= car.speed > 5 ? brake * dt : accel * 0.55 * dt;
  if (input.handbrake) car.speed *= Math.max(0, 1 - 2.2 * dt);
  car.speed -= car.speed * 0.35 * dt;
  if (!input.up && !input.down) car.speed -= car.speed * 0.6 * dt;
  car.speed = Math.max(-60, Math.min(topSpeed, car.speed));
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const steerRate = 2.4 * grip * Math.min(1, Math.abs(car.speed) / 60);
  car.angle += steer * steerRate * dt * Math.sign(car.speed || 1);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = Math.max(30, Math.min(WORLD_SIZE - 30, car.x));
  car.y = Math.max(30, Math.min(WORLD_SIZE - 30, car.y));
  return car;
}

export function updateTrafficCar(car, dt, rng) {
  car.speed += (car.targetSpeed - car.speed) * 0.5 * dt;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (car.x < 60 || car.x > WORLD_SIZE - 60 || car.y < 60 || car.y > WORLD_SIZE - 60) {
    car.angle += Math.PI;
    car.x = Math.max(70, Math.min(WORLD_SIZE - 70, car.x));
    car.y = Math.max(70, Math.min(WORLD_SIZE - 70, car.y));
  }
  if (rng && rng() < 0.002) car.targetSpeed = range(rng, 50, 115);
  return car;
}

export function damageCar(car, amount) {
  car.health -= amount;
  if (car.health <= 40) car.smoking = true;
  if (car.health <= 0 && !car.exploded) {
    car.exploded = true;
    car.health = 0;
    return true;
  }
  return false;
}

export function explosionRadius() {
  return 150;
}

// Chain: an explosion damages every car and person inside the radius.
export function applyExplosion(blast, cars, people) {
  const hitCars = [];
  const hitPeople = [];
  for (const car of cars) {
    if (car.exploded) continue;
    const d = Math.hypot(car.x - blast.x, car.y - blast.y);
    if (d < explosionRadius()) {
      if (damageCar(car, 120)) hitCars.push(car);
    }
  }
  for (const person of people) {
    const d = Math.hypot(person.x - blast.x, person.y - blast.y);
    if (d < explosionRadius()) {
      person.hp -= 80;
      hitPeople.push(person);
    }
  }
  return { hitCars, hitPeople };
}

export function nearestCar(cars, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    if (car.exploded) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}
