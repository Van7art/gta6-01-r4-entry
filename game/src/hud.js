// Heads-up display — stars, bars, money, respect, crew, mission panel,
// minimap, speed, weapon, radio, plus the start, pause, garage and wheel menus.
// Everything is drawn on the canvas so screenshots capture the full HUD.
import { RADIO_STATIONS, WEAPONS, GARAGE_PRICES } from './config.js';
import { rankFor } from './config.js';
import { crewStatusLines } from './crew.js';
import { garageMenuItems } from './garage.js';
import { currentStation } from './audio.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(12,10,18,0.72)';
  ctx.fillRect(x, y, w, h);
}

function bar(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, Math.min(w, w * frac)), h);
}

export function drawHud(ctx, state, viewW, viewH) {
  const player = state.player;
  const { rank, next } = rankFor(state.respect);
  // Top-left: wanted stars, health, armor, crew.
  panel(ctx, 10, 10, 240, 96);
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < state.wanted ? '#ff2e2e' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', 18 + i * 30, 40);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('HEALTH', 16, 62);
  bar(ctx, 82, 52, 140, 12, player.hp / 100, '#37d67a');
  ctx.fillText('ARMOR', 16, 84);
  bar(ctx, 82, 74, 140, 12, player.armor / 100, '#4aa8ff');
  panel(ctx, 10, 112, 240, 84);
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('CREW — Z Rico  X Lena  V Marco', 16, 130);
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px sans-serif';
  crewStatusLines(state.crew, state.time).forEach((line, i) => {
    ctx.fillText(line, 16, 150 + i * 15);
  });
  // Top-right: money, rank, respect bar.
  panel(ctx, viewW - 250, 10, 240, 76);
  ctx.fillStyle = '#37d67a';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('$' + state.money.toLocaleString('en-US'), viewW - 238, 38);
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(rank.name.toUpperCase(), viewW - 238, 60);
  bar(ctx, viewW - 238, 66, 216, 8, next ? (state.respect - rank.min) / (next.min - rank.min) : 1, '#ffd94a');
  ctx.fillStyle = '#ffffff';
  ctx.font = '11px sans-serif';
  ctx.fillText(next ? `RESPECT ${state.respect} / ${next.min}` : `RESPECT ${state.respect} — MAX RANK`, viewW - 238, 84 - 4 + 4);
  // Mission banner, top center.
  const mission = state.missions[state.missionIndex] ?? state.missions[state.missions.length - 1];
  if (mission && state.mode === 'play') {
    const text = `MISSION ${mission.id} — ${mission.title.toUpperCase()}: ${mission.objective}`;
    ctx.font = 'bold 15px sans-serif';
    const w = Math.min(viewW - 520, ctx.measureText(text).width + 24);
    panel(ctx, (viewW - w) / 2, 12, w, 30);
    ctx.fillStyle = '#ffd94a';
    ctx.textAlign = 'center';
    ctx.fillText(text, viewW / 2, 32);
    ctx.textAlign = 'left';
  }
  // Bottom-left: mission panel.
  if (mission && state.mode === 'play') {
    panel(ctx, 10, viewH - 108, 460, 96);
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`MISSION ${mission.id} — ${mission.title}`, 20, viewH - 84);
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px sans-serif';
    wrapText(ctx, mission.objective, 20, viewH - 64, 440, 17);
    ctx.fillStyle = '#37d67a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`Reward: $${mission.reward}  +${mission.respect} respect`, 20, viewH - 22);
  }
  // Bottom-right: speed, radio, weapon.
  panel(ctx, viewW - 250, viewH - 108, 240, 96);
  const speed = player.onFoot ? Math.round(player.speed * 0.36) : Math.round(Math.abs(state.playerCar?.speed ?? 0) * 1.6);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(speed + ' km/h', viewW - 238, viewH - 76);
  const station = currentStation(state.audio);
  ctx.fillStyle = '#ffb347';
  ctx.font = '13px sans-serif';
  ctx.fillText(`♪ SOL ${station.freq} — ${station.name}`, viewW - 238, viewH - 52);
  const w = WEAPONS[player.weapon];
  const slot = player.ammo[player.weapon];
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`WEAPON: ${w.name}  ${slot.mag}/${slot.reserve}`, viewW - 238, viewH - 30);
  if (player.reloading > 0) {
    ctx.fillStyle = '#ffd94a';
    ctx.fillText('RELOADING…', viewW - 238, viewH - 12);
  }
  // Toast.
  if (state.toast && state.time < state.toastUntil) {
    ctx.font = 'bold 18px sans-serif';
    const tw = ctx.measureText(state.toast).width + 28;
    panel(ctx, (viewW - tw) / 2, 60, tw, 34);
    ctx.fillStyle = '#ffd94a';
    ctx.textAlign = 'center';
    ctx.fillText(state.toast, viewW / 2, 83);
    ctx.textAlign = 'left';
  }
  drawMinimap(ctx, state, viewW, viewH);
  if (state.mode === 'garage') drawGarageMenu(ctx, state, viewW, viewH);
  if (state.input.wheelOpen && state.mode === 'play') drawWeaponWheel(ctx, state, viewW, viewH);
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}

export function drawMinimap(ctx, state, viewW, viewH) {
  const size = 190;
  const x0 = viewW - size - 12;
  const y0 = viewH - size - 122;
  const scale = size / 3200;
  panel(ctx, x0 - 4, y0 - 4, size + 8, size + 8);
  ctx.fillStyle = '#c9a06a';
  ctx.fillRect(x0, y0, size, size);
  ctx.fillStyle = '#3f8f4f';
  ctx.fillRect(x0 + 2200 * scale, y0 + 200 * scale, 800 * scale, 800 * scale);
  ctx.fillStyle = '#3a7ca8';
  ctx.fillRect(x0, y0 + 2000 * scale, 150 * scale, 1000 * scale);
  ctx.strokeStyle = '#33313d';
  ctx.lineWidth = 2;
  for (const c of state.city.roads) {
    ctx.beginPath(); ctx.moveTo(x0, y0 + c * scale); ctx.lineTo(x0 + size, y0 + c * scale); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0 + c * scale, y0); ctx.lineTo(x0 + c * scale, y0 + size); ctx.stroke();
  }
  const mission = state.missions[state.missionIndex] ?? state.missions[state.missions.length - 1];
  if (mission && mission.target) {
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath(); ctx.arc(x0 + mission.target.x * scale, y0 + mission.target.y * scale, 6, 0, Math.PI * 2); ctx.fill();
  }
  for (const car of state.cars) {
    if (car.exploded) continue;
    ctx.fillStyle = car.kind === 'police' ? '#2456c9' : '#ffffff';
    ctx.fillRect(x0 + car.x * scale - 2, y0 + car.y * scale - 2, 4, 4);
  }
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath();
  ctx.arc(x0 + state.player.x * scale, y0 + state.player.y * scale, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x0 + state.player.x * scale + Math.cos(state.player.angle) * 9, y0 + state.player.y * scale + Math.sin(state.player.angle) * 9);
  ctx.lineTo(x0 + state.player.x * scale + Math.cos(state.player.angle + 2.5) * 6, y0 + state.player.y * scale + Math.sin(state.player.angle + 2.5) * 6);
  ctx.lineTo(x0 + state.player.x * scale + Math.cos(state.player.angle - 2.5) * 6, y0 + state.player.y * scale + Math.sin(state.player.angle - 2.5) * 6);
  ctx.closePath();
  ctx.fill();
}

export function drawGarageMenu(ctx, state, viewW, viewH) {
  ctx.fillStyle = 'rgba(8,6,14,0.78)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("RICO'S GARAGE", viewW / 2, 148);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Your money: $${state.money.toLocaleString('en-US')}`, viewW / 2, 184);
  ctx.font = '17px sans-serif';
  ctx.fillText(`Car health: ${Math.round(state.carHealth)}%   Armor Lv ${state.garage.armorLevel}   Engine Lv ${state.garage.engineLevel}   Tires Lv ${state.garage.tiresLevel}`, viewW / 2, 214);
  const items = garageMenuItems(state.garage, state.carHealth);
  items.forEach((item, i) => {
    const y = 240 + i * 56;
    ctx.fillStyle = item.available ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(viewW / 2 - 260, y, 520, 44);
    ctx.fillStyle = item.available ? '#ffffff' : '#888888';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`[${i + 1}] ${item.label}`, viewW / 2 - 244, y + 28);
    ctx.fillStyle = '#37d67a';
    ctx.textAlign = 'right';
    ctx.fillText('$' + item.price, viewW / 2 + 244, y + 28);
    ctx.textAlign = 'left';
  });
  ctx.fillStyle = '#ffd94a';
  ctx.font = '15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Press G or ESC to leave the garage.', viewW / 2, 560);
  ctx.textAlign = 'left';
}

export function drawWeaponWheel(ctx, state, viewW, viewH) {
  const cx = viewW / 2;
  const cy = viewH / 2;
  ctx.fillStyle = 'rgba(8,6,14,0.6)';
  ctx.beginPath(); ctx.arc(cx, cy, 130, 0, Math.PI * 2); ctx.fill();
  const names = ['pistol', 'smg', 'shotgun'];
  names.forEach((name, i) => {
    const angle = -Math.PI / 2 + i * (Math.PI * 2 / 3);
    const x = cx + Math.cos(angle) * 78;
    const y = cy + Math.sin(angle) * 78;
    const active = state.player.weapon === name;
    ctx.fillStyle = active ? '#ffd94a' : 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.arc(x, y, 42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = active ? '#111111' : '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(WEAPONS[name].name, x, y + 4);
    ctx.fillText(String(i + 1), x, y + 22);
  });
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WEAPON WHEEL — hold Q, press 1 / 2 / 3', cx, cy + 170);
  ctx.textAlign = 'left';
}

export function drawTitle(ctx, state, viewW, viewH, hasSave) {
  ctx.fillStyle = '#1a1226';
  ctx.fillRect(0, 0, viewW, viewH);
  const grad = ctx.createLinearGradient(0, 0, 0, viewH);
  grad.addColorStop(0, '#ff9e4a');
  grad.addColorStop(0.55, '#c96a5a');
  grad.addColorStop(1, '#3a2a55');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PORT SOLANA', viewW / 2, 150);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('A Golden Hour Open-World Crime Story', viewW / 2, 195);
  ctx.font = '17px sans-serif';
  const lines = [
    'Explore Port Solana on foot and by car. Steal cars, outrun the police,',
    'call your crew, and climb from Hustler to King of Solana across 8 story missions.',
    '',
    'WASD / Arrows — move & drive    E — enter / steal car    Mouse — aim, Click — shoot',
    'R — reload    Q — weapon wheel    M — radio    Z / X / V — Rico / Lena / Marco',
    'G — garage    P — pause    U — mute    F — punch',
    '',
    'Press ENTER for a New Game' + (hasSave ? '    —    Press C to Continue your save' : ''),
  ];
  lines.forEach((line, i) => ctx.fillText(line, viewW / 2, 250 + i * 26));
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('8 missions  •  5-star wanted ladder  •  helicopter & roadblocks  •  3 radio stations  •  crew of 3', viewW / 2, viewH - 60);
  ctx.textAlign = 'left';
}

export function drawPause(ctx, viewW, viewH) {
  ctx.fillStyle = 'rgba(8,6,14,0.72)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', viewW / 2, viewH / 2 - 20);
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px sans-serif';
  ctx.fillText('Press P to resume — progress auto-saves at every mission.', viewW / 2, viewH / 2 + 24);
  ctx.textAlign = 'left';
}

export { GARAGE_PRICES };
