// Rendering — the whole golden-hour city drawn on one canvas:
// streets, blocks, buildings, park, marina, cars, people, police, helicopter,
// explosions, markers and the sunset light that ties it together.
import { WORLD_SIZE, ROAD_WIDTH, PALETTE, districtAt } from './config.js';
import { isInPark, isInWater } from './city.js';

export function makeCamera() {
  return { x: 1600, y: 1600, zoom: 1 };
}

function drawCarShape(ctx, car, isPlayer) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-24, -12, 48, 26);
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-23, -13, 46, 26, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.85)';
  ctx.fillRect(2, -10, 10, 20);
  ctx.fillStyle = '#22222c';
  ctx.fillRect(-20, -13, 5, 5);
  ctx.fillRect(-20, 8, 5, 5);
  ctx.fillRect(18, -13, 5, 5);
  ctx.fillRect(18, 8, 5, 5);
  if (car.kind === 'police') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-8, -13, 16, 26);
    ctx.fillStyle = '#2456c9';
    ctx.fillRect(-4, -13, 8, 26);
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(-14, -6, 6, 5);
    ctx.fillStyle = '#2244ff';
    ctx.fillRect(-14, 1, 6, 5);
  }
  if (isPlayer) {
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-26, -16, 52, 32, 8);
    ctx.stroke();
  }
  ctx.restore();
  if (car.smoking && !car.exploded) {
    ctx.fillStyle = 'rgba(120,120,120,0.5)';
    ctx.beginPath();
    ctx.arc(car.x - 18, car.y - 10, 10, 0, Math.PI * 2);
    ctx.arc(car.x - 26, car.y - 16, 14, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPerson(ctx, p, color, label) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 6, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1d1d24';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(p.angle) * 16, Math.sin(p.angle) * 16);
  ctx.stroke();
  ctx.restore();
  if (label) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, p.x, p.y - 18);
  }
}

export function renderWorld(ctx, state, camera, viewW, viewH) {
  const { city } = state;
  ctx.save();
  ctx.translate(viewW / 2, viewH / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  // Ground.
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(camera.x - viewW, camera.y - viewH, viewW * 2, viewH * 2);
  // Park.
  ctx.fillStyle = PALETTE.park;
  ctx.fillRect(2200, 200, 800, 800);
  ctx.fillStyle = '#3a6fb0';
  ctx.beginPath();
  ctx.ellipse(city.pond.x, city.pond.y, city.pond.rx, city.pond.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // Marina water.
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(0, 2000, 150, 1000);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(150, 2000, 24, 1000);
  // Highway ring glow.
  ctx.strokeStyle = '#e8c96a';
  ctx.lineWidth = 6;
  ctx.strokeRect(90, 90, WORLD_SIZE - 180, WORLD_SIZE - 180);
  // Roads.
  ctx.fillStyle = PALETTE.road;
  for (const c of city.roads) {
    ctx.fillRect(0, c - ROAD_WIDTH / 2, WORLD_SIZE, ROAD_WIDTH);
    ctx.fillRect(c - ROAD_WIDTH / 2, 0, ROAD_WIDTH, WORLD_SIZE);
  }
  // Lane dashes.
  ctx.strokeStyle = PALETTE.lane;
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 30]);
  for (const c of city.roads) {
    ctx.beginPath(); ctx.moveTo(0, c); ctx.lineTo(WORLD_SIZE, c); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c, 0); ctx.lineTo(c, WORLD_SIZE); ctx.stroke();
  }
  ctx.setLineDash([]);
  // District labels on the ground.
  ctx.fillStyle = 'rgba(40,30,20,0.55)';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('The Strip', 600, 1560);
  ctx.fillText('Central Park', 2600, 1040);
  ctx.fillText('Southside Market', 1400, 2960);
  ctx.fillText('Sunset Plaza', 1600, 860);
  ctx.fillText('Marina Bay', 420, 2500);
  ctx.fillText('Airport Road', 2700, 2500);
  // Docks.
  ctx.fillStyle = '#8a6d4b';
  for (const d of city.docks) ctx.fillRect(d.x, d.y, d.w, d.h);
  // Buildings with shadows and lit windows.
  for (const b of city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
    ctx.fillStyle = '#ffe9a8';
    for (let w = 0; w < b.windows; w++) {
      const wx = b.x + 14 + (w % 3) * 22;
      const wy = b.y + 14 + Math.floor(w / 3) * 22;
      if (wx < b.x + b.w - 14 && wy < b.y + b.h - 14) ctx.fillRect(wx, wy, 10, 12);
    }
  }
  // Garage building.
  ctx.fillStyle = '#2c3a55';
  ctx.fillRect(city.garage.x, city.garage.y, city.garage.w, city.garage.h);
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("RICO'S GARAGE", city.garage.x + city.garage.w / 2, city.garage.y + 44);
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(city.garage.x + 40, city.garage.y + 70, 80, 70);
  ctx.fillRect(city.garage.x + 140, city.garage.y + 70, 80, 70);
  // Trees.
  for (const t of city.trees) {
    ctx.fillStyle = PALETTE.parkDark;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#57a864';
    ctx.beginPath(); ctx.arc(t.x - 4, t.y - 4, t.r * 0.7, 0, Math.PI * 2); ctx.fill();
  }
  // Airport gate.
  ctx.strokeStyle = '#ffd94a';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(city.airportGate.x, city.airportGate.y, city.airportGate.r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('AIRPORT GATE', city.airportGate.x, city.airportGate.y - city.airportGate.r - 10);
  // Mission target marker.
  const mission = state.missions[state.missionIndex] ?? state.missions[state.missions.length - 1];
  if (mission && mission.target && state.mode === 'play') {
    const pulse = 1 + Math.sin(state.time * 4) * 0.15;
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(mission.target.x, mission.target.y, mission.target.r * 0.35 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,217,74,0.25)';
    ctx.beginPath(); ctx.arc(mission.target.x, mission.target.y, mission.target.r * 0.35 * pulse, 0, Math.PI * 2); ctx.fill();
  }
  // Cash pickups.
  for (const p of state.pickups) {
    if (p.taken) continue;
    ctx.fillStyle = '#37d67a';
    ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('$', p.x, p.y + 5);
  }
  // Spike strips.
  for (const s of state.spikes) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.fillStyle = '#1d1d24';
    ctx.fillRect(-40, -8, 80, 16);
    ctx.fillStyle = '#c9c9c9';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(i * 11, -8); ctx.lineTo(i * 11 + 5, 0); ctx.lineTo(i * 11, 8); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // Roadblocks.
  for (const rb of state.roadblocks) {
    ctx.fillStyle = 'rgba(255,120,40,0.9)';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ROADBLOCK', rb.x, rb.y - 40);
  }
  // Cars.
  for (const car of state.cars) {
    if (car.exploded) continue;
    drawCarShape(ctx, car, state.player.carId === car.id);
  }
  // Rivals and pedestrians.
  for (const r of state.rivals) {
    if (r.hp <= 0) continue;
    drawPerson(ctx, r, '#c94f3d', 'RIVAL');
  }
  for (const p of state.pedestrians) {
    drawPerson(ctx, p, '#e8e8e8', null);
  }
  // Foot cops.
  for (const cop of state.footCops) {
    drawPerson(ctx, cop, '#2456c9', 'POLICE');
  }
  // Crew ally.
  if (state.crew.ally) drawPerson(ctx, state.crew.ally, '#4fae5a', 'MARCO');
  // Player.
  const player = state.player;
  if (player.onFoot) {
    drawPerson(ctx, player, '#ffd94a', 'YOU');
    ctx.strokeStyle = 'rgba(255,217,74,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(player.angle) * 34, player.y + Math.sin(player.angle) * 34);
    ctx.stroke();
  }
  // Bullets.
  ctx.fillStyle = '#ffe9a8';
  for (const b of state.bullets) {
    ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Explosions.
  for (const e of state.explosions) {
    const t = e.age / e.life;
    const r = 30 + t * 120;
    ctx.fillStyle = `rgba(255,${Math.floor(160 - t * 120)},40,${1 - t})`;
    ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,240,180,${1 - t})`;
    ctx.beginPath(); ctx.arc(e.x, e.y, r * 0.45, 0, Math.PI * 2); ctx.fill();
  }
  // Helicopter + searchlight cone.
  if (state.heli) {
    const h = state.heli;
    const lightAngle = Math.atan2(player.y - h.y, player.x - h.x);
    const grad = ctx.createRadialGradient(h.x, h.y, 10, h.x, h.y, 420);
    grad.addColorStop(0, 'rgba(255,250,200,0.35)');
    grad.addColorStop(1, 'rgba(255,250,200,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    ctx.arc(h.x, h.y, 420, lightAngle - 0.28, lightAngle + 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(4, 8, 30, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#22222c';
    ctx.beginPath(); ctx.ellipse(0, 0, 26, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9fd8ff';
    ctx.beginPath(); ctx.arc(12, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111118';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.stroke();
    ctx.fillStyle = '#ff2222';
    ctx.beginPath(); ctx.arc(-18, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE HELICOPTER', h.x, h.y - 34);
  }
  // Golden-hour vignette + sun glow.
  const glow = ctx.createRadialGradient(camera.x + 500, camera.y - 380, 60, camera.x + 500, camera.y - 380, 900);
  glow.addColorStop(0, 'rgba(255,190,90,0.20)');
  glow.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(camera.x - viewW, camera.y - viewH, viewW * 2, viewH * 2);
  ctx.restore();
  // District name at the bottom edge.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(12, viewH - 34, 190, 24);
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(districtAt(player.x, player.y), 20, viewH - 17);
  void isInPark;
  void isInWater;
}
