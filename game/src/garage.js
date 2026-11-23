// Rico's Garage — repair, repaint, armor, engine, sport tires.
// Pure purchase logic over a plain wallet + car record; the UI lives in hud.js.
import { GARAGE_PRICES } from './config.js';

export function defaultGarage() {
  return { armorLevel: 0, engineLevel: 0, tiresLevel: 0, color: '#e8b13c' };
}

export function garageMenuItems(garage, carHealth) {
  return [
    { id: 'repair', label: 'Repair car', price: GARAGE_PRICES.repair, available: carHealth < 100 },
    { id: 'repaint', label: 'Repaint car', price: GARAGE_PRICES.repaint, available: true },
    { id: 'armor', label: 'Buy armor', price: GARAGE_PRICES.armor, available: garage.armorLevel < 3 },
    { id: 'engine', label: 'Engine upgrade', price: GARAGE_PRICES.engine, available: garage.engineLevel < 3 },
    { id: 'tires', label: 'Sport tires', price: GARAGE_PRICES.tires, available: garage.tiresLevel < 2 },
  ];
}

const PAINT_COLORS = ['#e8b13c', '#c94f3d', '#3d7ac9', '#4fae5a', '#8a5ac9', '#e8e8e8'];

export function buyGarageItem(garage, money, carHealth, itemId) {
  const item = garageMenuItems(garage, carHealth).find((i) => i.id === itemId);
  if (!item) return { ok: false, reason: 'unknown item', money, carHealth };
  if (!item.available) return { ok: false, reason: 'already maxed', money, carHealth };
  if (money < item.price) return { ok: false, reason: 'not enough money', money, carHealth };
  const nextGarage = { ...garage };
  let nextHealth = carHealth;
  if (itemId === 'repair') nextHealth = 100;
  if (itemId === 'repaint') {
    const idx = PAINT_COLORS.indexOf(garage.color);
    nextGarage.color = PAINT_COLORS[(idx + 1) % PAINT_COLORS.length];
  }
  if (itemId === 'armor') nextGarage.armorLevel += 1;
  if (itemId === 'engine') nextGarage.engineLevel += 1;
  if (itemId === 'tires') nextGarage.tiresLevel += 1;
  return { ok: true, reason: 'bought ' + item.label, money: money - item.price, carHealth: nextHealth, garage: nextGarage };
}

export function engineTopSpeed(garage) {
  return 210 + garage.engineLevel * 45;
}

export function tiresGrip(garage) {
  return 1 + garage.tiresLevel * 0.18;
}

export function armorAbsorb(garage) {
  return garage.armorLevel * 12;
}
