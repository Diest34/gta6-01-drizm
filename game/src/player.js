// Solara Bay — the player on foot. One job: Mara Voss's movement, running,
// entering and leaving cars, and respawning after being busted or wasted.
import { PLAYER, WORLD } from './constants.js';
import { SPOTS } from './world.js';
import { blockedAt } from './world.js';

export function createPlayer() {
  return {
    x: 700, y: 1000, angle: 0, speed: 0, health: PLAYER.maxHealth,
    cash: 100, ammo: 0, hasPistol: false, inCar: null, punchTimer: 0,
    regenTimer: 0, lastDamage: 0,
  };
}
export function movePlayerOnFoot(S, dt) {
  const p = S.player, input = S.input;
  const a = input.axis();
  const len = Math.hypot(a.x, a.y) || 1;
  const speed = input.run() ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const vx = (a.x / len) * speed * (a.x || a.y ? 1 : 0);
  const vy = (a.y / len) * speed * (a.x || a.y ? 1 : 0);
  if (a.x || a.y) {
    p.angle = Math.atan2(vy, vx);
    tryMove(S, p.x + vx * dt, p.y + vy * dt);
  }
  p.speed = Math.hypot(vx, vy);
  if (p.punchTimer > 0) p.punchTimer -= dt;
  // Slow health regeneration out of combat.
  S.elapsed -= 0; // (kept for clarity: regen uses wall clock below)
  if (S.time - p.lastDamage > 6 && p.health < PLAYER.maxHealth) {
    p.health = Math.min(PLAYER.maxHealth, p.health + 4 * dt);
  }
}
function tryMove(S, nx, ny) {
  const p = S.player, r = PLAYER.radius;
  if (!blockedAt(S.world.buildings, nx, p.y, r)) p.x = nx;
  if (!blockedAt(S.world.buildings, p.x, ny, r)) p.y = ny;
  p.x = Math.max(r, Math.min(WORLD.width - r, p.x));
  p.y = Math.max(r, Math.min(WORLD.height - r, p.y));
}
export function nearestStealableCar(S, maxDist) {
  const p = S.player;
  let best = null, bestD = maxDist;
  for (const c of S.cars) {
    if (!c.parked && c.driver) continue;
    if (c.parked || !c.driver) {
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < bestD) { bestD = d; best = c; }
    }
  }
  return best;
}
export function enterCar(S, car) {
  const p = S.player;
  car.parked = false; car.driver = 'player'; car.speed = 0;
  p.inCar = car;
  S.audio.carDoor();
  S.log.push('Stole a car');
}
export function leaveCar(S) {
  const p = S.player, car = p.inCar;
  if (!car) return;
  car.driver = null; car.parked = true; car.speed = 0;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 40;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
  p.inCar = null;
  S.audio.carDoor();
}
export function respawnAtHospital(S) {
  const p = S.player;
  if (p.inCar) { p.inCar.driver = null; p.inCar.parked = true; p.inCar = null; }
  p.x = SPOTS.hospital.x; p.y = SPOTS.hospital.y + 60;
  p.health = PLAYER.maxHealth; p.wanted = 0;
  S.wanted = 0; S.policeCars = []; S.officers = []; S.roadblocks = [];
  p.cash = Math.max(0, p.cash - 200);
}
export function hurtPlayer(S, amount) {
  const p = S.player;
  p.health -= amount; p.lastDamage = S.time;
  if (p.health <= 0) { p.health = 0; S.screen = 'wasted'; S.audio.wasted(); }
}
