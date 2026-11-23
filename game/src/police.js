// Solara Bay — police. One job: the wanted level, pursuit cars, officers on
// foot, roadblocks and the five-star helicopter, plus busted/wasted handling.
import { WANTED_MAX, CAR } from './constants.js';
import { makeCar, damageCar } from './vehicles.js';
import { hurtPlayer } from './player.js';

export function updateWanted(S, dt) {
  // Heat cools slowly when the player stays out of sight of the police.
  if (S.wanted > 0) {
    S.wantedTimer += dt;
    const seen = S.policeCars.some((c) => Math.hypot(c.x - S.player.x, c.y - S.player.y) < 320)
      || S.officers.some((o) => Math.hypot(o.x - S.player.x, o.y - S.player.y) < 220);
    if (!seen && S.wantedTimer > 14) { S.wanted -= 1; S.wantedTimer = 0; S.log.push('Wanted level fell'); }
  }
  const want = S.wanted === 0 ? 0 : S.wanted === 1 ? 1 : S.wanted === 2 ? 2 : S.wanted + 1;
  // Keep the right number of pursuit cars on the road.
  while (S.policeCars.length < want) {
    const a = Math.random() * Math.PI * 2;
    const car = makeCar(S.player.x + Math.cos(a) * 420, S.player.y + Math.sin(a) * 420, a, '#2b6fd6', false, false);
    car.driver = 'police';
    car.cruise = 300 + S.wanted * 45;
    S.policeCars.push(car);
    S.cars.push(car);
  }
  while (S.policeCars.length > want) {
    const car = S.policeCars.pop();
    car.exploded = true; // despawn: mark so it stops being drawn as a pursuer
    const i = S.cars.indexOf(car);
    if (i >= 0) S.cars.splice(i, 1);
  }
  // Officers on foot from wanted 2.
  if (S.wanted >= 2 && S.officers.length < (S.wanted - 1) * 2) {
    const a = Math.random() * Math.PI * 2;
    S.officers.push({ x: S.player.x + Math.cos(a) * 260, y: S.player.y + Math.sin(a) * 260, health: 50, speed: 150 + S.wanted * 12, hitTimer: 0 });
  }
  // Roadblocks from wanted 3: a line of police cars across the road ahead.
  if (S.wanted >= 3 && S.roadblocks.length < S.wanted - 2) {
    const p = S.player;
    const a = p.inCar ? p.angle : 0;
    S.roadblocks.push({
      x: p.x + Math.cos(a) * 520, y: p.y + Math.sin(a) * 520, angle: a + Math.PI / 2, t: 0,
    });
  }
  updatePursuit(S, dt);
  updateOfficers(S, dt);
}
function updatePursuit(S, dt) {
  const p = S.player;
  for (const car of S.policeCars) {
    if (car.exploded) continue;
    const targetAngle = Math.atan2(p.y - car.y, p.x - car.x);
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff * 2.2));
    const wantSpeed = Math.min(CAR.maxSpeed + S.wanted * 20, 300 + S.wanted * 55);
    car.speed = Math.min(wantSpeed, car.speed + 260 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Ramming the player hurts them (or their car).
    const d = Math.hypot(car.x - p.x, car.y - p.y);
    if (d < 46) {
      if (p.inCar) damageCar(S, p.inCar, 10 * dt);
      else hurtPlayer(S, 12 * dt);
      car.speed *= 0.5;
    }
  }
}
function updateOfficers(S, dt) {
  const p = S.player;
  for (const o of S.officers) {
    if (o.hitTimer > 0) o.hitTimer -= dt;
    const d = Math.hypot(p.x - o.x, p.y - o.y);
    if (d > 12) {
      const a = Math.atan2(p.y - o.y, p.x - o.x);
      o.x += Math.cos(a) * o.speed * dt;
      o.y += Math.sin(a) * o.speed * dt;
    }
    if (d < 30 && !p.inCar && S.wanted > 0 && o.hitTimer <= 0 && !S.inInterior) {
      // Caught on foot: busted. (Not inside the vault room — guards own that.)
      o.hitTimer = 1;
      S.screen = 'busted';
      S.audio.busted();
      return;
    }
    if (d < 40 && p.inCar && o.hitTimer <= 0) {
      o.hitTimer = 1;
      damageCar(S, p.inCar, 10);
    }
  }
  // Officers too far away give up.
  S.officers = S.officers.filter((o) => Math.hypot(o.x - p.x, o.y - p.y) < 900);
}
export function clearHeat(S) {
  S.wanted = 0; S.wantedTimer = 0;
  for (const c of S.policeCars) { const i = S.cars.indexOf(c); if (i >= 0) S.cars.splice(i, 1); }
  S.policeCars = []; S.officers = []; S.roadblocks = [];
}
export function helicopterAngle(S) {
  // At five stars a helicopter circles overhead; the render draws its shadow.
  return S.time * 0.5;
}
