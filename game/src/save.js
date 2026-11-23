// Save and continue — pure serialize / parse, storage wrapper kept separate
// so the logic stays testable in plain Node.
import { SAVE_KEY } from './config.js';

export function defaultSave() {
  return {
    version: 1,
    money: 1500,
    respect: 0,
    missionIndex: 0,
    health: 100,
    armor: 0,
    playerX: 1600,
    playerY: 1600,
    garage: { armorLevel: 0, engineLevel: 0, tiresLevel: 0, color: '#e8b13c' },
    weapons: { pistol: { mag: 12, reserve: 120 }, smg: { mag: 30, reserve: 180 }, shotgun: { mag: 6, reserve: 40 } },
    currentWeapon: 'pistol',
    completedMissions: [],
    carHealth: 100,
  };
}

export function serializeSave(save) {
  return JSON.stringify(save);
}

export function parseSave(text) {
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || data.version !== 1) return null;
    const base = defaultSave();
    const merged = { ...base, ...data };
    merged.garage = { ...base.garage, ...(data.garage || {}) };
    merged.weapons = { ...base.weapons, ...(data.weapons || {}) };
    if (typeof merged.money !== 'number' || merged.money < 0) return null;
    if (typeof merged.missionIndex !== 'number' || merged.missionIndex < 0 || merged.missionIndex > 8) return null;
    return merged;
  } catch {
    return null;
  }
}

export function saveExists(storage) {
  try {
    return storage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export function writeSave(storage, save) {
  try {
    storage.setItem(SAVE_KEY, serializeSave(save));
    return true;
  } catch {
    return false;
  }
}

export function readSave(storage) {
  try {
    const text = storage.getItem(SAVE_KEY);
    if (text === null) return null;
    return parseSave(text);
  } catch {
    return null;
  }
}

export function saveFromState(state) {
  return {
    version: 1,
    money: state.money,
    respect: state.respect,
    missionIndex: state.missionIndex,
    health: Math.max(0, Math.round(state.player.hp)),
    armor: Math.max(0, Math.round(state.player.armor)),
    playerX: Math.round(state.player.x),
    playerY: Math.round(state.player.y),
    garage: { ...state.garage },
    weapons: JSON.parse(JSON.stringify(state.player.ammo)),
    currentWeapon: state.player.weapon,
    completedMissions: [...state.completedMissions],
    carHealth: state.carHealth,
  };
}
