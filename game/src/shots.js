// Solara Bay — screenshot scenes. One job: stage the four deterministic
// screenshot scenes (?shot=title|drive|chase|mission&seed=1) by playing the
// real rules forward from a fresh world with a simple autopilot, so every
// frame is what a short game really looks like and the same seed always
// gives the same frame.
import { SPOTS } from './world.js';
import { startMission } from './missions.js';
import { enterCar } from './player.js';

const STEP = 1 / 30;
function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
function press(S, ...codes) {
  for (const c of codes) S.input.keys.add(c);
}
function releaseAll(S) { S.input.keys.clear(); }
// Steer the player's car (or feet) toward a target for one step.
function autopilot(S, target) {
  const p = S.player;
  releaseAll(S);
  const desired = Math.atan2(target.y - p.y, target.x - p.x);
  const diff = wrapAngle(desired - p.angle);
  if (p.inCar) {
    if (Math.abs(diff) < 0.9) press(S, 'KeyW');
    else press(S, 'KeyW');
    if (diff > 0.12) press(S, 'KeyD');
    else if (diff < -0.12) press(S, 'KeyA');
  } else {
    const dx = target.x - p.x, dy = target.y - p.y;
    if (dx > 20) press(S, 'KeyD');
    else if (dx < -20) press(S, 'KeyA');
    if (dy > 20) press(S, 'KeyS');
    else if (dy < -20) press(S, 'KeyW');
  }
}
function simulate(S, stepFn, seconds, target) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (target) autopilot(S, target);
    stepFn(S, STEP);
    if (S.screen !== 'playing') break;
  }
  releaseAll(S);
}
function nearestCarTo(S, x, y) {
  let best = null, bestD = Infinity;
  for (const c of S.cars) {
    if (c.driver || c.exploded) continue;
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}
export function stageShot(name, S, stepFn) {
  if (name === 'drive') {
    startMission(S, 1);
    S.screen = 'playing';
    // Put Mara in a car on the 1100 street, driving east through Downtown.
    const car = nearestCarTo(S, 900, 1100) || S.cars[0];
    S.player.x = car.x; S.player.y = car.y;
    enterCar(S, car);
    S.player.inCar.angle = 0;
    S.camera.x = S.player.x; S.camera.y = S.player.y;
    simulate(S, stepFn, 5, SPOTS.downtownDrop);
    return;
  }
  if (name === 'chase') {
    startMission(S, 3);
    S.screen = 'playing';
    S.night = true; // startMission resets night; the chase is a night scene.
    S.missionStage = 1;
    S.wanted = 3;
    const car = nearestCarTo(S, 1600, 1100) || S.cars[0];
    S.player.x = car.x; S.player.y = car.y;
    enterCar(S, car);
    S.player.inCar.angle = 0;
    S.roadblocks.push({ x: 2400, y: 1100, angle: Math.PI / 2, t: 0 });
    S.camera.x = S.player.x; S.camera.y = S.player.y;
    simulate(S, stepFn, 2.5, { x: 2600, y: 1100 });
    return;
  }
  if (name === 'mission') {
    startMission(S, 0);
    S.screen = 'playing';
    // On foot near the Marina, her car parked nearby, waypoint in view.
    S.player.x = 640; S.player.y = 1020;
    S.player.angle = Math.atan2(SPOTS.marina.y - 1020, SPOTS.marina.x - 640);
    const car = nearestCarTo(S, 640, 1020);
    if (car) { car.x = 560; car.y = 1080; car.angle = Math.PI / 2; }
    S.camera.x = S.player.x; S.camera.y = S.player.y;
    simulate(S, stepFn, 0.5, SPOTS.marina);
    return;
  }
  // Default: title screen over a living city.
  S.screen = 'title';
  simulate(S, stepFn, 0, null);
  for (let i = 0; i < 120; i += 1) {
    // Ambient traffic and pedestrians move behind the title.
    const keep = S.screen;
    S.screen = 'playing';
    stepFn(S, STEP);
    S.screen = keep;
  }
  S.camera.x = 1600; S.camera.y = 1200;
  S.screen = 'title';
}
