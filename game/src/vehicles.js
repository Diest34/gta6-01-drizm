// Solara Bay — vehicles. One job: car physics, damage/smoke/fire/explosion,
// traffic cars that follow the roads and stop at red lights, and parked cars.
import { CAR, AVENUES, STREETS, ROAD_WIDTH, WORLD } from './constants.js';
import { lightState, hitsBuilding, inWater } from './world.js';
import { makeRng, pick, range } from './random.js';

const TRAFFIC_COLOURS = ['#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#ecf0f1', '#2c3e50', '#e67e22', '#16a085'];

export function spawnTraffic(S, count) {
  const rng = makeRng(777);
  for (let i = 0; i < count; i += 1) {
    const vertical = rng() < 0.5;
    const road = vertical ? pick(rng, AVENUES) : pick(rng, STREETS);
    const along = range(rng, 100, (vertical ? WORLD.height : WORLD.width) - 100);
    S.cars.push(makeCar(
      vertical ? road + (rng() < 0.5 ? -22 : 22) : along,
      vertical ? along : road + (rng() < 0.5 ? -22 : 22),
      vertical ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI),
      pick(rng, TRAFFIC_COLOURS), false, false,
    ));
  }
  for (const pk of S.world.parked) S.cars.push(makeCar(pk.x, pk.y, pk.angle, pk.colour, true, pk.sports));
}
export function makeCar(x, y, angle, colour, parked, sports) {
  return {
    x, y, angle, colour, speed: 0, damage: 0, parked, sports: !!sports,
    driver: null, taxi: false, smoke: 0, fire: 0, exploded: false,
    cruise: 150 + Math.random() * 90, stuck: 0,
  };
}
export function drivePlayerCar(S, dt) {
  const car = S.player.inCar, input = S.input;
  if (!car) return;
  const fwd = (input.keys.has('ArrowUp') || input.keys.has('KeyW')) ? 1 : 0;
  const back = (input.keys.has('ArrowDown') || input.keys.has('KeyS')) ? 1 : 0;
  const left = (input.keys.has('ArrowLeft') || input.keys.has('KeyA')) ? 1 : 0;
  const right = (input.keys.has('ArrowRight') || input.keys.has('KeyD')) ? 1 : 0;
  if (fwd) car.speed += CAR.accel * dt;
  else if (back) car.speed -= (car.speed > 0 ? CAR.brake : CAR.reverseAccel) * dt;
  else car.speed -= car.speed * CAR.drag * dt;
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  if (Math.abs(car.speed) > 4) {
    const dir = car.speed > 0 ? 1 : -1;
    car.angle += (right - left) * CAR.turnRate * dt * dir * Math.min(1, Math.abs(car.speed) / 120);
  }
  moveCarWithCollisions(S, car, dt);
  S.player.x = car.x; S.player.y = car.y; S.player.angle = car.angle;
  S.player.speed = Math.abs(car.speed);
  if (Math.abs(car.speed) > 380) S.audio.engine(Math.abs(car.speed) / CAR.maxSpeed);
}
export function moveCarWithCollisions(S, car, dt) {
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const r = 20;
  const hitWall = hitsBuilding(S.world.buildings, nx, ny, r) || inWater(nx, ny)
    || nx < r || ny < r || nx > WORLD.width - r || ny > WORLD.height - r;
  if (hitWall) {
    if (Math.abs(car.speed) > 180) damageCar(S, car, 12);
    car.speed *= -0.25;
    return;
  }
  car.x = nx; car.y = ny;
  // Bumping other cars slows both and dents them.
  for (const o of S.cars) {
    if (o === car || o.exploded) continue;
    const d = Math.hypot(o.x - car.x, o.y - car.y);
    if (d < 44 && d > 0.01) {
      const push = (44 - d) / 2;
      const ux = (car.x - o.x) / d, uy = (car.y - o.y) / d;
      car.x += ux * push; car.y += uy * push;
      if (Math.abs(car.speed) > 120) { damageCar(S, car, 6); damageCar(S, o, 6); car.speed *= 0.6; }
    }
  }
}
export function damageCar(S, car, amount) {
  car.damage += amount;
  if (car.damage > 55) car.smoke = 1;
  if (car.damage >= CAR.maxDamage && !car.exploded) {
    car.fire = 1; car.exploded = true;
    S.particles.push({ x: car.x, y: car.y, kind: 'explosion', t: 0, life: 0.9 });
    S.audio.explosion();
    if (S.player.inCar === car) {
      S.player.inCar = null;
      S.player.x = car.x + 50; S.player.y = car.y + 50;
    }
    if (car.driver === 'player') raiseWanted(S, 1);
  }
}
export function updateTraffic(S, dt) {
  const clock = S.clockSeconds;
  for (const car of S.cars) {
    if (car.driver === 'player' || car.parked || car.exploded) continue;
    // Drive along its road; stop at red lights and when blocked ahead.
    const vertical = Math.abs(Math.sin(car.angle)) > 0.7;
    const ahead = car.cruise * dt;
    let nx = car.x + Math.cos(car.angle) * ahead;
    let ny = car.y + Math.sin(car.angle) * ahead;
    let stop = false;
    // Red light: stop before the next intersection if the light is against us.
    const roads = vertical ? STREETS : AVENUES;
    for (const r of roads) {
      const along = vertical ? car.y : car.x;
      const dist = vertical ? (r - car.y) * Math.sin(car.angle) : (r - car.x) * Math.cos(car.angle);
      if (dist > 0 && dist < 70) {
        const idx = Math.round(r / 100);
        const green = lightState(idx, clock);
        if ((vertical && green === 'ew') || (!vertical && green === 'ns')) stop = true;
      }
    }
    for (const o of S.cars) {
      if (o === car || o.exploded) continue;
      const dx = o.x - car.x, dy = o.y - car.y;
      const forward = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
      if (forward > 0 && forward < 60 && Math.abs(dx * Math.sin(car.angle) - dy * Math.cos(car.angle)) < 26) stop = true;
    }
    if (hitsBuilding(S.world.buildings, nx, ny, 20) || inWater(nx, ny)) {
      // Reached the edge of the grid: turn around.
      car.angle += Math.PI; car.stuck = 0; continue;
    }
    if (stop) { car.speed = Math.max(0, car.speed - 300 * dt); }
    else { car.speed = Math.min(car.cruise, car.speed + 120 * dt); }
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
  }
}
export function raiseWanted(S, amount) {
  S.wanted = Math.min(5, S.wanted + amount);
  S.wantedTimer = 0;
}
