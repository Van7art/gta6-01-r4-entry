// Deterministic city generation for Port Solana.
// Roads on a fixed grid, blocks filled with seeded buildings, plus the park,
// the marina waterfront, the highway ring, the garage and the airport gate.
import { WORLD_SIZE, ROAD_SPACING, ROAD_WIDTH, SEED, PALETTE, GARAGE_LOCATION, AIRPORT_GATE, SUNSET_PLAZA, PARK_CENTER, MARKET_CENTER } from './config.js';
import { mulberry32, pickFrom, range, intRange } from './rng.js';

export function roadCenters() {
  const centers = [];
  for (let c = ROAD_SPACING / 2; c < WORLD_SIZE; c += ROAD_SPACING) centers.push(c);
  return centers;
}

export function isOnRoad(x, y) {
  const half = ROAD_WIDTH / 2;
  for (const c of roadCenters()) {
    if (Math.abs(x - c) < half || Math.abs(y - c) < half) return true;
  }
  return false;
}

export function isInPark(x, y) {
  return x >= 2200 && x < 3000 && y >= 200 && y < 1000;
}

export function isInWater(x, y) {
  return x < 150 && y >= 2000 && y < 3000;
}

export function isInHighwayRing(x, y) {
  return x < 130 || y < 130 || x > WORLD_SIZE - 130 || y > WORLD_SIZE - 130;
}

export function generateCity(seed = SEED) {
  const rng = mulberry32(seed);
  const buildings = [];
  const trees = [];
  const roads = roadCenters();
  for (let bx = 0; bx < 8; bx++) {
    for (let by = 0; by < 8; by++) {
      const blockX = bx * ROAD_SPACING + ROAD_WIDTH / 2 + 24;
      const blockY = by * ROAD_SPACING + ROAD_WIDTH / 2 + 24;
      const blockW = ROAD_SPACING - ROAD_WIDTH - 48;
      const blockH = ROAD_SPACING - ROAD_WIDTH - 48;
      const cx = blockX + blockW / 2;
      const cy = blockY + blockH / 2;
      if (isInPark(cx, cy)) {
        for (let t = 0; t < 26; t++) {
          trees.push({ x: range(rng, 2240, 2960), y: range(rng, 240, 960), r: range(rng, 12, 24) });
        }
        continue;
      }
      if (isInWater(cx, cy)) continue;
      if (cx > 500 && cx < 900 && cy > 1300 && cy < 1650) continue; // garage block stays open
      const count = intRange(rng, 1, 3);
      for (let i = 0; i < count; i++) {
        const w = range(rng, 90, Math.min(190, blockW));
        const h = range(rng, 90, Math.min(190, blockH));
        const x = range(rng, blockX, blockX + blockW - w);
        const y = range(rng, blockY, blockY + blockH - h);
        const color = pickFrom(rng, PALETTE.building);
        const roof = pickFrom(rng, PALETTE.roof);
        buildings.push({ x, y, w, h, color, roof, windows: intRange(rng, 2, 6) });
      }
    }
  }
  // Marina docks along the west water edge.
  const docks = [];
  for (let i = 0; i < 5; i++) docks.push({ x: 150, y: 2100 + i * 170, w: 120, h: 26 });
  return {
    seed,
    roads,
    buildings,
    trees,
    docks,
    pond: { x: PARK_CENTER.x, y: PARK_CENTER.y, rx: 130, ry: 80 },
    garage: { ...GARAGE_LOCATION },
    airportGate: { ...AIRPORT_GATE },
    sunsetPlaza: { ...SUNSET_PLAZA },
    marketCenter: { ...MARKET_CENTER },
    spawn: { x: 1600, y: 1600 },
  };
}

export function buildingAt(city, x, y) {
  for (const b of city.buildings) {
    if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b;
  }
  return null;
}

export function collidesWithBuilding(city, x, y, radius) {
  for (const b of city.buildings) {
    if (x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h) return true;
  }
  return false;
}
