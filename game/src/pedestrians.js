// Solara Bay — pedestrians. One job: sidewalk walkers, fleeing behaviour, and
// taxi fares (pick up a waving pedestrian, drive them to the marker in time).
import { WORLD, TAXI_FARE, AVENUES, STREETS } from './constants.js';
import { makeRng, pick, range } from './random.js';
import { nearestRoadPoint } from './world.js';

const SHIRTS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#fd79a8'];
export function spawnPedestrians(S, count) {
  const rng = makeRng(4242);
  for (let i = 0; i < count; i += 1) {
    const x = range(rng, 150, WORLD.width - 150);
    const y = range(rng, 150, WORLD.height - 150);
    S.peds.push({
      x, y, angle: rng() * Math.PI * 2, speed: range(rng, 40, 70),
      shirt: pick(rng, SHIRTS), fleeing: 0, taxi: false, waiting: false,
      target: null, pause: 0,
    });
  }
}
export function updatePedestrians(S, dt) {
  const p = S.player;
  for (const ped of S.peds) {
    if (ped.taxi) continue; // taxi passenger rides with the player
    const danger = Math.hypot(ped.x - p.x, ped.y - p.y) < 160
      && (S.wanted > 0 || (p.inCar && Math.abs(p.speed) > 300) || S.gunfireTimer > 0);
    if (danger) ped.fleeing = 1.5;
    if (ped.fleeing > 0) {
      ped.fleeing -= dt;
      const a = Math.atan2(ped.y - p.y, ped.x - p.x);
      ped.x += Math.cos(a) * 150 * dt;
      ped.y += Math.sin(a) * 150 * dt;
      continue;
    }
    if (ped.pause > 0) { ped.pause -= dt; continue; }
    if (!ped.target || Math.hypot(ped.target.x - ped.x, ped.target.y - ped.y) < 24) {
      // Pick a new stroll target on a nearby sidewalk.
      const nx = ped.x + (Math.random() - 0.5) * 700;
      const ny = ped.y + (Math.random() - 0.5) * 700;
      ped.target = nearestRoadPoint(Math.max(80, Math.min(WORLD.width - 80, nx)), Math.max(80, Math.min(WORLD.height - 80, ny)));
      ped.pause = Math.random() < 0.25 ? 2 : 0;
    }
    if (ped.target) {
      const a = Math.atan2(ped.target.y - ped.y, ped.target.x - ped.x);
      ped.angle = a;
      ped.x += Math.cos(a) * ped.speed * dt;
      ped.y += Math.sin(a) * ped.speed * dt;
    }
  }
}
export function nearestWaitingFare(S) {
  const p = S.player;
  let best = null, bestD = 130;
  for (const ped of S.peds) {
    if (!ped.waiting) continue;
    const d = Math.hypot(ped.x - p.x, ped.y - p.y);
    if (d < bestD) { bestD = d; best = ped; }
  }
  return best;
}
export function startFare(S) {
  const ped = nearestWaitingFare(S);
  if (!ped || !S.player.inCar) return false;
  ped.waiting = false; ped.taxi = true;
  const dest = pickFareDestination(S);
  S.taxi = { ped, dest, timer: 75 };
  S.log.push('Taxi fare started');
  return true;
}
function pickFareDestination(S) {
  const spots = [
    { x: 2050, y: 640 }, { x: 900, y: 1300 }, { x: 1650, y: 2240 },
    { x: 2200, y: 420 }, { x: 420, y: 900 }, { x: 2600, y: 1600 },
  ];
  return spots[Math.floor(Math.random() * spots.length)];
}
export function updateTaxi(S, dt) {
  if (!S.taxi) return;
  S.taxi.timer -= dt;
  const dest = S.taxi.dest, p = S.player;
  if (Math.hypot(p.x - dest.x, p.y - dest.y) < 90 && p.inCar) {
    p.cash += TAXI_FARE;
    S.log.push(`Taxi fare paid $${TAXI_FARE}`);
    S.audio.coin();
    S.taxi.ped.taxi = false;
    S.taxi.ped.x = dest.x + 40; S.taxi.ped.y = dest.y + 40;
    S.taxi = null;
    return;
  }
  if (S.taxi.timer <= 0) {
    S.log.push('Taxi fare expired');
    S.taxi.ped.taxi = false; S.taxi.ped.waiting = false;
    S.taxi = null;
  }
}
// Every so often a pedestrian starts waving for a taxi.
export function maybeSpawnFare(S, dt) {
  S.fareTimer -= dt;
  if (S.fareTimer > 0 || S.taxi) return;
  S.fareTimer = 25 + Math.random() * 20;
  const near = S.peds.filter((q) => Math.hypot(q.x - S.player.x, q.y - S.player.y) < 500 && !q.taxi);
  if (near.length) near[Math.floor(Math.random() * near.length)].waiting = true;
}
