// Port Solana — tuning values, districts, ranks, weapons, radio stations.
// Every number the game balances on lives here, so tuning never hides in logic.
export const WORLD_SIZE = 3200;
export const ROAD_SPACING = 400;
export const ROAD_WIDTH = 96;
export const SEED = 20261123;
export const SAVE_KEY = 'portSolanaSaveV1';

export const PALETTE = {
  ground: '#c9a06a',
  groundAlt: '#bd955f',
  road: '#33313d',
  roadEdge: '#26242e',
  lane: '#e8c96a',
  park: '#3f8f4f',
  parkDark: '#2f7a3e',
  water: '#3a7ca8',
  sand: '#d9c08a',
  building: ['#7b5ea7', '#4a6fa5', '#3f7d6b', '#8a6d4b', '#6b4a7a', '#4a7a8c', '#a05a6e'],
  roof: ['#5d4480', '#38567d', '#2f5f52', '#6d5439', '#523a5e', '#38606e', '#7a4356'],
};

export const DISTRICTS = [
  { name: 'The Strip', x: 0, y: 1200, w: 1200, h: 800 },
  { name: 'Central Park', x: 2200, y: 200, w: 800, h: 800 },
  { name: 'Marina Bay', x: 0, y: 2000, w: 800, h: 1000 },
  { name: 'Southside Market', x: 800, y: 2000, w: 1200, h: 1000 },
  { name: 'Sunset Plaza', x: 1200, y: 800, w: 800, h: 800 },
  { name: 'Airport Road', x: 2200, y: 2200, w: 1000, h: 800 },
  { name: 'Highway Ring', x: 0, y: 0, w: 3200, h: 200 },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  }
  return 'Port Solana';
}

export const RANKS = [
  { name: 'Hustler', min: 0 },
  { name: 'Runner', min: 300 },
  { name: 'Enforcer', min: 600 },
  { name: 'Shot Caller', min: 1000 },
  { name: 'King of Solana', min: 1500 },
];

export function rankFor(respect) {
  let current = RANKS[0];
  for (const r of RANKS) if (respect >= r.min) current = r;
  const idx = RANKS.indexOf(current);
  const next = RANKS[idx + 1] ?? null;
  return { rank: current, next, index: idx };
}

export const WEAPONS = {
  pistol: { name: 'Pistol', mag: 12, reserve: 120, damage: 26, rate: 0.28, spread: 0.05, pellets: 1, range: 520, auto: false },
  smg: { name: 'SMG', mag: 30, reserve: 180, damage: 13, rate: 0.09, spread: 0.11, pellets: 1, range: 430, auto: true },
  shotgun: { name: 'Shotgun', mag: 6, reserve: 40, damage: 9, rate: 0.85, spread: 0.22, pellets: 6, range: 330, auto: false },
};

export const RADIO_STATIONS = [
  { name: 'Sunset FM', freq: '98.5', tempo: 96, scale: [0, 3, 5, 7, 10], wave: 'triangle', mood: 'warm sunset drive' },
  { name: 'Vice Wave', freq: '101.2', tempo: 122, scale: [0, 2, 3, 7, 8], wave: 'sawtooth', mood: 'neon night pulse' },
  { name: 'Marina Nights', freq: '104.7', tempo: 78, scale: [0, 4, 5, 9, 11], wave: 'sine', mood: 'slow coastal groove' },
];

export const GARAGE_PRICES = {
  repair: 120,
  repaint: 80,
  armor: 450,
  engine: 600,
  tires: 350,
};

export const GARAGE_LOCATION = { x: 620, y: 1420, w: 260, h: 190 };
export const AIRPORT_GATE = { x: 2820, y: 2820, r: 90 };
export const SUNSET_PLAZA = { x: 1600, y: 1200, r: 110 };
export const PARK_CENTER = { x: 2600, y: 600 };
export const MARKET_CENTER = { x: 1400, y: 2500 };

export const CREW = {
  rico: { name: 'Rico the Driver', key: 'Z', cooldown: 30, boostSeconds: 8, desc: 'speed boost for getaways' },
  lena: { name: 'Lena the Hacker', key: 'X', cooldown: 45, desc: 'blackout: minus 1 wanted star' },
  marco: { name: 'Big Marco', key: 'V', cooldown: 60, allySeconds: 40, desc: 'muscle who fights beside you' },
};

export const WANTED = {
  decaySeconds: 12,
  maxStars: 5,
  copCarsPerStar: 2,
  footCopsPerStar: 1,
  roadblockMinStars: 4,
  heliMinStars: 5,
  spikeMinStars: 5,
};
