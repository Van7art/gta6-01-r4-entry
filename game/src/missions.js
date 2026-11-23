// Story missions — eight jobs across Port Solana, in order.
// Each mission names its goal in plain words; checkMissionProgress reads a
// small context object the main loop fills in each frame, so missions stay
// testable without a running game.
import { GARAGE_LOCATION, AIRPORT_GATE, SUNSET_PLAZA, PARK_CENTER, MARKET_CENTER } from './config.js';

export const MISSIONS = [
  {
    id: 1, title: 'First Wheels', short: 'Steal a car',
    objective: 'Carjack a car on The Strip — walk up to a traffic car and take it.',
    reward: 400, respect: 100, kind: 'steal',
    hint: 'Press E next to a car with a driver inside.',
  },
  {
    id: 2, title: 'Sunset Delivery', short: 'Drive to Sunset Plaza',
    objective: 'Drive the package to Sunset Plaza before the sun drops.',
    reward: 500, respect: 120, kind: 'reach',
    target: { ...SUNSET_PLAZA }, hint: 'Follow the gold marker on the minimap.',
  },
  {
    id: 3, title: 'Park Pickup', short: 'Collect 3 cash drops',
    objective: 'Collect 3 cash drops hidden in Central Park, on foot.',
    reward: 600, respect: 150, kind: 'collect', need: 3,
    target: { ...PARK_CENTER, r: 260 }, hint: 'Cash glows green in the park grass.',
  },
  {
    id: 4, title: 'Muscle Memory', short: 'Clear Southside Market',
    objective: 'Clear the Southside Market of rival muscle, fists or firearms.',
    reward: 800, respect: 200, kind: 'defeat', need: 4,
    target: { ...MARKET_CENTER, r: 300 }, hint: 'Big Marco (V) loves this one.',
  },
  {
    id: 5, title: 'Highway Heat', short: 'Outrun a 4-star chase',
    objective: 'Outrun the 4-star chase on the highway ring to the Airport Gate.',
    reward: 1000, respect: 250, kind: 'escape',
    target: { ...AIRPORT_GATE }, hint: 'Rico (Z) gives you the speed to break away.',
  },
  {
    id: 6, title: 'Golden Garage', short: 'Buy armor + engine',
    objective: 'Buy armor and an engine upgrade at the garage, then test them.',
    reward: 700, respect: 180, kind: 'shop', need: 2,
    target: { x: GARAGE_LOCATION.x, y: GARAGE_LOCATION.y, r: 200 },
    hint: 'Drive into Rico\'s Garage and press G.',
  },
  {
    id: 7, title: 'Five Star Sunset', short: 'Survive 5 stars',
    objective: 'Survive a 5-star wanted level: helicopter, roadblocks, spikes.',
    reward: 1500, respect: 300, kind: 'survive', need: 45,
    hint: 'Lena (X) drops a star. Alleys break the helicopter line of sight.',
  },
  {
    id: 8, title: 'King of Port Solana', short: 'Reach Marina Bay free',
    objective: 'Lose the heat and reach Marina Bay — the crew is waiting.',
    reward: 2000, respect: 400, kind: 'reach',
    target: { x: 400, y: 2500, r: 140 }, hint: 'Finish clean: wanted level 0 at the docks.',
  },
];

export function missionByIndex(index) {
  return MISSIONS[Math.min(index, MISSIONS.length - 1)];
}

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) ?? MISSIONS[0];
}

export function defaultMissionProgress() {
  return { collected: 0, defeated: 0, bought: 0, survived: 0, stoleCar: false, reached: false };
}

// ctx: { stoleCar, atTarget, collected, defeated, bought, survivedSeconds, wanted, inCar }
export function checkMissionProgress(mission, progress, ctx) {
  const next = { ...progress };
  let done = false;
  if (mission.kind === 'steal') {
    if (ctx.stoleCar) { next.stoleCar = true; done = true; }
  } else if (mission.kind === 'reach') {
    if (ctx.atTarget) { next.reached = true; done = true; }
    if (mission.id === 8 && ctx.atTarget && ctx.wanted === 0) done = true;
    else if (mission.id === 8 && ctx.atTarget) done = false;
  } else if (mission.kind === 'collect') {
    next.collected = ctx.collected;
    if (ctx.collected >= mission.need) done = true;
  } else if (mission.kind === 'defeat') {
    next.defeated = ctx.defeated;
    if (ctx.defeated >= mission.need) done = true;
  } else if (mission.kind === 'escape') {
    if (ctx.atTarget && ctx.wanted >= 4) done = true;
  } else if (mission.kind === 'shop') {
    next.bought = ctx.bought;
    if (ctx.bought >= mission.need) done = true;
  } else if (mission.kind === 'survive') {
    next.survived = ctx.survivedSeconds;
    if (ctx.survivedSeconds >= mission.need) done = true;
  }
  return { progress: next, done };
}

export function missionRewardText(mission) {
  return `+$${mission.reward}  +${mission.respect} respect`;
}
