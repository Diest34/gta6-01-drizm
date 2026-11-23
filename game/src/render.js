// Solara Bay — rendering. One job: draw everything on the 2D canvas: the city,
// the beach and bay, buildings, cars, people, effects, the camera, night
// lighting, headlights, the helicopter shadow, and the casino vault interior.
import { VIEW, WORLD, ROAD_WIDTH, AVENUES, STREETS, BEACH_TOP, BAY, BRIDGE_Y, COLOURS } from './constants.js';
import { SPOTS } from './world.js';
import { lightState } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'playing';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BRIEFING = 'briefing';
export const SCREEN_SUCCESS = 'success';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_ENDING = 'ending';

export function drawWorld(S, ctx) {
  const cam = S.camera;
  ctx.fillStyle = COLOURS.grass;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const x0 = cam.x - VIEW.width / 2, y0 = cam.y - VIEW.height / 2;
  ctx.save();
  ctx.translate(-x0, -y0);
  drawGround(S, ctx);
  drawRoads(S, ctx);
  drawSpots(S, ctx);
  drawBuildings(S, ctx);
  drawCollectibles(S, ctx);
  drawRoadblocks(S, ctx);
  for (const car of S.cars) if (!car.exploded) drawCar(S, ctx, car);
  for (const ped of S.peds) drawPed(S, ctx, ped);
  for (const o of S.officers) drawOfficer(ctx, o);
  for (const g of S.guards) drawGuard(ctx, g);
  drawPlayer(S, ctx);
  drawBullets(S, ctx);
  drawParticles(S, ctx);
  if (S.wanted >= 5) drawHelicopter(S, ctx);
  if (S.inInterior) drawInterior(S, ctx);
  ctx.restore();
  if (S.night) drawNight(S, ctx);
}
function drawGround(S, ctx) {
  // District tints.
  for (const d of S.districts) { ctx.fillStyle = d.tint + '55'; ctx.fillRect(d.x, d.y, d.w, d.h); }
  // The bay.
  ctx.fillStyle = COLOURS.water;
  ctx.fillRect(BAY.x, BAY.y, BAY.width, BAY.height);
  ctx.fillStyle = COLOURS.waterDeep;
  ctx.fillRect(BAY.x + 30, BAY.y + 60, BAY.width - 60, BAY.height - 120);
  // Beach sand at the south edge.
  ctx.fillStyle = COLOURS.beach;
  ctx.fillRect(0, BEACH_TOP, WORLD.width, WORLD.height - BEACH_TOP);
  ctx.fillStyle = '#d9c184';
  for (let x = 60; x < WORLD.width; x += 180) {
    ctx.beginPath(); ctx.arc(x, BEACH_TOP + 40 + (x % 360 === 0 ? 60 : 20), 8, 0, Math.PI * 2); ctx.fill();
  }
  // Palm trees along the beachfront boulevard.
  ctx.fillStyle = '#3f7d3a';
  for (let x = 120; x < WORLD.width; x += 160) {
    ctx.fillRect(x, BEACH_TOP - 46, 5, 46);
    ctx.beginPath(); ctx.arc(x + 2, BEACH_TOP - 52, 16, 0, Math.PI * 2); ctx.fill();
  }
  // Marina boats.
  ctx.fillStyle = '#f5f5f5';
  for (let i = 0; i < 5; i += 1) {
    const bx = 60 + i * 40, by = 700 + i * 190;
    ctx.fillRect(bx, by, 60, 22);
    ctx.fillRect(bx + 22, by - 26, 5, 26);
  }
}
function drawRoads(S, ctx) {
  ctx.fillStyle = COLOURS.sidewalk;
  for (const a of AVENUES) ctx.fillRect(a - ROAD_WIDTH / 2 - 10, 0, ROAD_WIDTH + 20, WORLD.height);
  for (const s of STREETS) ctx.fillRect(0, s - ROAD_WIDTH / 2 - 10, WORLD.width, ROAD_WIDTH + 20);
  ctx.fillStyle = COLOURS.road;
  for (const a of AVENUES) ctx.fillRect(a - ROAD_WIDTH / 2, 0, ROAD_WIDTH, WORLD.height);
  for (const s of STREETS) ctx.fillRect(0, s - ROAD_WIDTH / 2, WORLD.width, ROAD_WIDTH);
  // Centre dashes.
  ctx.fillStyle = COLOURS.roadLine;
  for (const a of AVENUES) for (let y = 20; y < WORLD.height; y += 70) ctx.fillRect(a - 3, y, 6, 34);
  for (const s of STREETS) for (let x = 20; x < WORLD.width; x += 70) ctx.fillRect(x, s - 3, 34, 6);
  // Ring road around the outside.
  ctx.strokeStyle = COLOURS.road; ctx.lineWidth = ROAD_WIDTH;
  ctx.strokeRect(ROAD_WIDTH / 2, ROAD_WIDTH / 2, WORLD.width - ROAD_WIDTH, WORLD.height - ROAD_WIDTH);
  // Bridge over the bay inlet.
  ctx.fillStyle = COLOURS.road;
  ctx.fillRect(BAY.x - 20, BRIDGE_Y - ROAD_WIDTH / 2, BAY.width + 40, ROAD_WIDTH);
  ctx.fillStyle = '#c8c8c8';
  ctx.fillRect(BAY.x - 20, BRIDGE_Y - ROAD_WIDTH / 2 - 6, BAY.width + 40, 6);
  ctx.fillRect(BAY.x - 20, BRIDGE_Y + ROAD_WIDTH / 2, BAY.width + 40, 6);
  // Traffic lights at intersections.
  let idx = 0;
  for (const a of AVENUES) for (const s of STREETS) {
    const green = lightState(idx, S.clockSeconds);
    ctx.fillStyle = '#222';
    ctx.fillRect(a + ROAD_WIDTH / 2 + 2, s - ROAD_WIDTH / 2 - 26, 14, 26);
    ctx.fillStyle = green === 'ns' ? '#2ecc71' : '#e74c3c';
    ctx.beginPath(); ctx.arc(a + ROAD_WIDTH / 2 + 9, s - ROAD_WIDTH / 2 - 18, 5, 0, Math.PI * 2); ctx.fill();
    idx += 1;
  }
}
function drawSpots(S, ctx) {
  const labels = [
    [SPOTS.hospital, 'H', '#e74c3c'], [SPOTS.sprayShop, 'R', '#9b59b6'],
    [SPOTS.casino, '$', '#f1c40f'], [SPOTS.marina, 'M', '#3498db'],
    [SPOTS.warehouse, 'W', '#7f8c8d'], [SPOTS.pier, 'P', '#e67e22'],
    [SPOTS.foodStall, 'F', '#27ae60'], [SPOTS.ammoShop, 'A', '#c0392b'],
  ];
  for (const [spot, letter, colour] of labels) {
    ctx.fillStyle = colour;
    ctx.beginPath(); ctx.arc(spot.x, spot.y, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(letter, spot.x, spot.y + 1);
  }
  // Casino building block.
  ctx.fillStyle = '#b7950b';
  ctx.fillRect(SPOTS.casino.x - 90, SPOTS.casino.y - 60, 180, 120);
  ctx.fillStyle = '#f9e79f';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('CASINO DEL SOL', SPOTS.casino.x, SPOTS.casino.y);
}
function drawBuildings(S, ctx) {
  for (const b of S.world.buildings) {
    ctx.fillStyle = b.colour;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
    if (b.tall) {
      ctx.fillStyle = 'rgba(255,255,180,0.7)';
      for (let wx = b.x + 14; wx < b.x + b.w - 14; wx += 26) {
        for (let wy = b.y + 14; wy < b.y + b.h - 14; wy += 26) ctx.fillRect(wx, wy, 10, 12);
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
  }
}
function drawCollectibles(S, ctx) {
  for (const c of S.world.collectibles) {
    if (c.taken) continue;
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(c.x, c.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7d6608'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', c.x, c.y);
  }
}
function drawRoadblocks(S, ctx) {
  for (const rb of S.roadblocks) {
    ctx.save(); ctx.translate(rb.x, rb.y); ctx.rotate(rb.angle);
    ctx.fillStyle = '#2b6fd6';
    ctx.fillRect(-70, -14, 60, 28); ctx.fillRect(10, -14, 60, 28);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-70, -4, 60, 8); ctx.fillRect(10, -4, 60, 8);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(-80, -20, 160, 6);
    ctx.restore();
  }
}
export function drawCar(S, ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y); ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-28, -14, 56, 28);
  ctx.fillStyle = car.colour;
  ctx.fillRect(-27, -13, 54, 26);
  ctx.fillStyle = '#1c2733';
  ctx.fillRect(-8, -11, 18, 22);
  ctx.fillStyle = car.driver === 'police' ? '#fff' : '#f5f5f5';
  ctx.fillRect(-24, -11, 10, 22);
  if (car.driver === 'police') {
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(-4, -13, 8, 5); ctx.fillStyle = '#3498db'; ctx.fillRect(4, -13, 8, 5);
  }
  if (car.taxi) { ctx.fillStyle = '#f2c200'; ctx.fillRect(-27, -16, 54, 4); }
  if (car.sports) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(20, -13, 7, 26); }
  if (car.smoke) {
    ctx.fillStyle = 'rgba(120,120,120,0.6)';
    ctx.beginPath(); ctx.arc(-20 + Math.random() * 8, -6, 10, 0, Math.PI * 2); ctx.fill();
  }
  if (car.fire) {
    ctx.fillStyle = '#e67e22';
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
  }
  // Headlights at night.
  if (S.night && (car.driver === 'player' || car.driver === 'police')) {
    ctx.fillStyle = 'rgba(255,255,180,0.25)';
    ctx.beginPath(); ctx.moveTo(27, -10); ctx.lineTo(160, -34); ctx.lineTo(160, 34); ctx.lineTo(27, 10); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function drawPed(S, ctx, ped) {
  ctx.fillStyle = ped.waiting ? '#ffd23f' : ped.shirt;
  ctx.beginPath(); ctx.arc(ped.x, ped.y, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f1c79a';
  ctx.beginPath(); ctx.arc(ped.x, ped.y - 2, 5, 0, Math.PI * 2); ctx.fill();
  if (ped.waiting) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('TAXI?', ped.x, ped.y - 20);
  }
}
function drawOfficer(ctx, o) {
  ctx.fillStyle = '#1f3a93';
  ctx.beginPath(); ctx.arc(o.x, o.y, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(o.x - 8, o.y - 3, 16, 4);
}
function drawGuard(ctx, g) {
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(g.x, g.y, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(g.x - 8, g.y - 3, 16, 4);
}
function drawPlayer(S, ctx) {
  const p = S.player;
  if (p.inCar) return;
  ctx.save();
  ctx.translate(p.x, p.y); ctx.rotate(p.angle);
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(6, -6, 12, 12);
  ctx.fillStyle = '#f1c79a';
  ctx.beginPath(); ctx.arc(4, 0, 6, 0, Math.PI * 2); ctx.fill();
  if (p.hasPistol) { ctx.fillStyle = '#222'; ctx.fillRect(10, 3, 14, 4); }
  ctx.restore();
  // Waypoint beacon under the player when a mission is active.
  if (S.missionActive) {
    const wp = S.waypoint;
    if (wp) {
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(wp.x, wp.y, 26 + Math.sin(S.time * 4) * 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.moveTo(wp.x, wp.y - 44); ctx.lineTo(wp.x - 10, wp.y - 62); ctx.lineTo(wp.x + 10, wp.y - 62); ctx.closePath(); ctx.fill();
    }
  }
}
function drawBullets(S, ctx) {
  ctx.fillStyle = '#ffd23f';
  for (const b of S.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); }
}
function drawParticles(S, ctx) {
  for (const pt of S.particles) {
    const a = 1 - pt.t / pt.life;
    if (pt.kind === 'explosion') {
      ctx.fillStyle = `rgba(230,126,34,${a})`;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 20 + pt.t * 60, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(241,196,15,${a})`;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 10 + pt.t * 30, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2); ctx.fill();
    }
  }
}
function drawHelicopter(S, ctx) {
  const a = S.time * 0.4;
  const hx = S.player.x + Math.cos(a) * 220, hy = S.player.y + Math.sin(a) * 220;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(hx, hy, 46, 20, a, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,200,0.18)';
  ctx.beginPath(); ctx.arc(hx, hy, 130, 0, Math.PI * 2); ctx.fill();
}
function drawInterior(S, ctx) {
  // The casino vault room, drawn in its own coordinate space over the world.
  const r = S.casinoRoom;
  ctx.fillStyle = '#3d2c1e';
  ctx.fillRect(r.x - 20, r.y - 20, r.w + 40, r.h + 40);
  ctx.fillStyle = '#6b4f2a';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(r.x + r.w / 2 - 60, r.y + 20, 120, 70);
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('VAULT', r.x + r.w / 2, r.y + 58);
  for (const bag of S.vaultBags) {
    if (bag.taken) continue;
    ctx.fillStyle = '#27ae60';
    ctx.beginPath(); ctx.arc(bag.x, bag.y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText('$', bag.x, bag.y + 4);
  }
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Grab the three vault bags — watch the guards!', r.x + r.w / 2, r.y + r.h - 16);
}
function drawNight(S, ctx) {
  ctx.fillStyle = 'rgba(8,10,40,0.42)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Moon glow around the player.
  const px = S.player.x - (S.camera.x - VIEW.width / 2);
  const py = S.player.y - (S.camera.y - VIEW.height / 2);
  const g = ctx.createRadialGradient(px, py, 60, px, py, 320);
  g.addColorStop(0, 'rgba(255,255,200,0.14)');
  g.addColorStop(1, 'rgba(255,255,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}
