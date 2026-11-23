// Solara Bay — main. One job: own the game state, the loop, and the screen state
// machine (title, briefing, playing, paused, success, busted, wasted, ending),
// and wire every other module together. Also hosts the deterministic
// screenshot scenes (?shot=) and the headless self-test (?selftest=1).
import { VIEW, WORLD, SAVE_KEY } from './constants.js';
import { SPOTS } from './world.js';
import { buildWorld } from './world.js';
import { createInput, bindInput } from './input.js';
import { createPlayer, movePlayerOnFoot, nearestStealableCar, enterCar, leaveCar, respawnAtHospital } from './player.js';
import { spawnTraffic, drivePlayerCar, updateTraffic, raiseWanted } from './vehicles.js';
import { spawnPedestrians, updatePedestrians, nearestWaitingFare, startFare, updateTaxi, maybeSpawnFare } from './pedestrians.js';
import { updateWanted, clearHeat } from './police.js';
import { punch, shoot, updateBullets, updateGuards, checkPlayerHitByCar } from './combat.js';
import { startMission, currentObjective, currentWaypoint, updateMissions, updateSideActivities } from './missions.js';
import { createAudio } from './audio.js';
import { saveGameState, loadGameState, applySave, hasSave } from './save.js';
import { drawWorld } from './render.js';
import { drawHUD, drawTitle, drawBriefing, drawPause, drawSuccess, drawBusted, drawWasted, drawEnding } from './hud.js';
import { stageShot } from './shots.js';

export function createState(canvas) {
  const world = buildWorld();
  const S = {
    canvas, ctx: canvas.getContext('2d'),
    world, districts: world.buildings ? [] : [],
    player: createPlayer(), input: createInput(), audio: createAudio(),
    cars: [], peds: [], policeCars: [], officers: [], guards: [],
    roadblocks: [], bullets: [], particles: [], vaultBags: [],
    camera: { x: 700, y: 1000 },
    screen: 'title', time: 0, clockSeconds: 0, clockHours: 8,
    wanted: 0, wantedTimer: 0, gunfireTimer: 0, fareTimer: 20,
    missionIndex: 0, missionStage: 0, missionActive: false, nextMission: 0,
    briefing: '', lastPayout: 0, objective: '', waypoint: null,
    taxi: null, night: false, inInterior: false, savedPos: null,
    casinoRoom: { x: 80, y: 80, w: 640, h: 440 },
    log: ['Welcome to Solara Bay'],
    sirenTimer: 0,
    saveGame() { saveGameState(S); },
  };
  S.districts = [
    { name: 'Marina', x: 0, y: 0, w: 1200, h: 1200, tint: '#7d8a99' },
    { name: 'Old Town', x: 0, y: 1200, w: 1400, h: 920, tint: '#a08b62' },
    { name: 'Downtown', x: 1400, y: 0, w: 1800, h: 1400, tint: '#5f6b7d' },
    { name: 'Beachfront', x: 1400, y: 1400, w: 1800, h: 1000, tint: '#c9a86a' },
  ];
  spawnTraffic(S, 14);
  spawnPedestrians(S, 40);
  bindInput(S.input, canvas);
  return S;
}
export function resetState(S) {
  const fresh = createState(S.canvas);
  // Keep the same canvas/input/audio bindings: copy fresh fields over.
  for (const key of Object.keys(fresh)) {
    if (key !== 'canvas' && key !== 'ctx' && key !== 'input') S[key] = fresh[key];
  }
  S.input.keys.clear();
}
function step(S, dt) {
  S.time += dt;
  S.clockSeconds += dt;
  S.clockHours = (8 + S.clockSeconds / 120) % 24; // a full day in 48 minutes
  S.gunfireTimer = Math.max(0, S.gunfireTimer - dt);
  S.audio.updateMusic(dt, S.wanted);
  if (S.wanted > 0) {
    S.sirenTimer -= dt;
    if (S.sirenTimer <= 0) { S.sirenTimer = 0.9; S.audio.siren(S.wanted); }
  }
  if (S.screen !== 'playing') return;
  // Camera follows the player smoothly.
  const p = S.player;
  S.camera.x += (p.x - S.camera.x) * Math.min(1, dt * 4);
  S.camera.y += (p.y - S.camera.y) * Math.min(1, dt * 4);
  S.camera.x = Math.max(VIEW.width / 2 - 200, Math.min(WORLD.width - VIEW.width / 2 + 200, S.camera.x));
  S.camera.y = Math.max(VIEW.height / 2 - 200, Math.min(WORLD.height - VIEW.height / 2 + 200, S.camera.y));

  if (S.inInterior) {
    movePlayerInInterior(S, dt);
  } else if (p.inCar) {
    drivePlayerCar(S, dt);
  } else {
    movePlayerOnFoot(S, dt);
  }
  updateTraffic(S, dt);
  updatePedestrians(S, dt);
  updateWanted(S, dt);
  updateBullets(S, dt);
  updateGuards(S, dt);
  checkPlayerHitByCar(S);
  updateMissions(S, dt);
  updateSideActivities(S, dt);
  updateTaxi(S, dt);
  maybeSpawnFare(S, dt);
  for (const pt of S.particles) pt.t += dt;
  S.particles = S.particles.filter((pt) => pt.t < pt.life);
  // Expired explosions leave the wreck behind.
  for (const car of S.cars) if (car.exploded && car.driver === 'player') car.driver = null;
  S.objective = currentObjective(S);
  S.waypoint = currentWaypoint(S);
}
function movePlayerInInterior(S, dt) {
  const p = S.player, input = S.input;
  const a = input.axis();
  const len = Math.hypot(a.x, a.y) || 1;
  const speed = input.run() ? 350 : 230;
  if (a.x || a.y) {
    p.angle = Math.atan2(a.y, a.x);
    const r = S.casinoRoom;
    p.x = Math.max(r.x + 20, Math.min(r.x + r.w - 20, p.x + (a.x / len) * speed * dt));
    p.y = Math.max(r.y + 20, Math.min(r.y + r.h - 20, p.y + (a.y / len) * speed * dt));
  }
}
function handleKeys(S) {
  const input = S.input;
  if (input.wasPressed('KeyM')) S.audio.muted = !S.audio.muted;
  if (S.screen === 'title') {
    if (input.wasPressed('Enter')) { startMission(S, 0); S.screen = 'briefing'; }
    else if (input.wasPressed('KeyC') && hasSave()) {
      const data = loadGameState();
      if (data) { applySave(S, data); S.screen = 'playing'; S.missionActive = false; S.log.push('Save loaded'); }
    }
    return;
  }
  if (S.screen === 'briefing') {
    if (input.wasPressed('Enter')) S.screen = 'playing';
    return;
  }
  if (S.screen === 'success') {
    if (input.wasPressed('Enter')) {
      if (S.missionIndex < 4) startMission(S, S.nextMission);
      else { S.screen = 'playing'; S.missionActive = false; }
    }
    return;
  }
  if (S.screen === 'busted' || S.screen === 'wasted') {
    if (input.wasPressed('Enter')) {
      respawnAtHospital(S);
      S.screen = 'playing';
      if (S.missionActive) { /* mission stays active: drive back to the waypoint */ }
    }
    return;
  }
  if (S.screen === 'ending') {
    if (input.wasPressed('Enter')) { S.screen = 'playing'; S.missionActive = false; }
    return;
  }
  if (S.screen !== 'playing') return;
  if (input.wasPressed('KeyP') || input.wasPressed('Escape')) { S.screen = 'paused'; return; }
  if (input.wasPressed('KeyE') || input.wasPressed('KeyF')) {
    if (S.player.inCar) leaveCar(S);
    else {
      const fare = nearestWaitingFare(S);
      const car = nearestStealableCar(S, 90);
      if (S.player.inCar === null && fare && car) { /* prefer the car */ }
      if (car) {
        enterCar(S, car);
        if (S.wanted >= 0 && Math.random() < 1) {
          // Stealing in view of the police raises heat.
          const seen = S.policeCars.some((c) => Math.hypot(c.x - S.player.x, c.y - S.player.y) < 400)
            || S.officers.some((o) => Math.hypot(o.x - S.player.x, o.y - S.player.y) < 250);
          if (seen) raiseWanted(S, 1);
        }
      } else if (fare) startFare(S);
    }
    return;
  }
  if (input.wasPressed('Space')) punch(S);
  if (input.wasPressed('KeyJ')) {
    const p = S.player;
    shoot(S, p.x + Math.cos(p.angle) * 300, p.y + Math.sin(p.angle) * 300);
  }
  if (input.clicked) {
    const cam = S.camera;
    const wx = S.input.mouseX + cam.x - VIEW.width / 2;
    const wy = S.input.mouseY + cam.y - VIEW.height / 2;
    shoot(S, wx, wy);
  }
  if (input.wasPressed('KeyM')) S.audio.muted = !S.audio.muted;
}
function handlePauseKeys(S) {
  const input = S.input;
  if (input.wasPressed('KeyP') || input.wasPressed('Escape')) S.screen = 'playing';
  else if (input.wasPressed('KeyR')) { S.screen = 'playing'; startMission(S, S.missionIndex); }
  else if (input.wasPressed('KeyS')) { S.saveGame(); S.log.push('Game saved'); }
  else if (input.wasPressed('KeyQ')) { S.screen = 'title'; clearHeat(S); }
}
function draw(S) {
  const ctx = S.ctx;
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  drawWorld(S, ctx);
  if (S.screen === 'playing' || S.screen === 'paused') drawHUD(S, ctx);
  if (S.screen === 'title') drawTitle(S, ctx);
  else if (S.screen === 'briefing') drawBriefing(S, ctx);
  else if (S.screen === 'paused') drawPause(S, ctx);
  else if (S.screen === 'success') drawSuccess(S, ctx);
  else if (S.screen === 'busted') drawBusted(S, ctx);
  else if (S.screen === 'wasted') drawWasted(S, ctx);
  else if (S.screen === 'ending') drawEnding(S, ctx);
}
function runSelfTest(S) {
  const results = [];
  const dt = 1 / 60;
  const arrive = (x, y) => {
    S.player.x = x; S.player.y = y;
    if (S.player.inCar) { S.player.inCar.x = x; S.player.inCar.y = y; }
    for (let i = 0; i < 5; i += 1) step(S, dt);
  };
  try {
    for (let m = 0; m < 5; m += 1) {
      startMission(S, m);
      S.screen = 'playing';
      if (m === 0) { arrive(SPOTS.marina.x, SPOTS.marina.y); arrive(SPOTS.oldTownPlaza.x, SPOTS.oldTownPlaza.y); }
      else if (m === 1) { arrive(SPOTS.warehouse.x, SPOTS.warehouse.y); arrive(SPOTS.downtownDrop.x, SPOTS.downtownDrop.y); }
      else if (m === 2) { arrive(SPOTS.bridgeWest.x, SPOTS.bridgeWest.y); arrive(SPOTS.bridgeEast.x, SPOTS.bridgeEast.y); arrive(1650, 2050); }
      else if (m === 3) {
        const sports = S.cars.find((c) => c.sports);
        enterCar(S, sports);
        arrive(SPOTS.casinoPark.x, SPOTS.casinoPark.y);
        arrive(SPOTS.docks.x, SPOTS.docks.y);
      } else {
        leaveCar(S);
        arrive(SPOTS.casino.x, SPOTS.casino.y);
        console.log('m5 after casino: stage=' + S.missionStage + ' screen=' + S.screen + ' interior=' + S.inInterior + ' wanted=' + S.wanted + ' officers=' + S.officers.length);
        for (const bag of S.vaultBags) arrive(bag.x, bag.y);
        console.log('m5 after bags: stage=' + S.missionStage + ' screen=' + S.screen + ' interior=' + S.inInterior + ' wanted=' + S.wanted + ' officers=' + S.officers.length + ' health=' + S.player.health);
        arrive(SPOTS.pier.x, SPOTS.pier.y);
        console.log('m5 after pier: stage=' + S.missionStage + ' screen=' + S.screen + ' wanted=' + S.wanted + ' officers=' + S.officers.length);
      }
      const done = m < 4 ? S.screen === 'success' : S.screen === 'ending';
      results.push(`mission${m + 1}:${done ? 'PASS' : 'FAIL(screen=' + S.screen + ')'}`);
      if (m < 4) { S.screen = 'playing'; startMission(S, m + 1); S.screen = 'playing'; }
    }
    const pass = results.filter((r) => r.includes('PASS')).length;
    const summary = `SELFTEST ${pass}/5 ${results.join(' ')} cash=$${S.player.cash}`;
    document.title = summary;
    console.log(summary);
  } catch (err) {
    document.title = 'SELFTEST ERROR ' + err.message;
    console.log('SELFTEST ERROR', err);
  }
}
function boot() {
  const canvas = document.getElementById('game');
  const S = createState(canvas);
  window.__solara = S;
  const params = new URLSearchParams(window.location.search);
  if (params.get('selftest') === '1') {
    runSelfTest(S);
    draw(S);
    return;
  }
  const shot = params.get('shot');
  if (shot) {
    stageShot(shot, S, step);
    draw(S);
    document.title = 'Solara Bay — shot ' + shot;
    return;
  }
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    handleKeys(S);
    if (S.screen === 'paused') handlePauseKeys(S);
    step(S, dt);
    draw(S);
    S.input.clearPressed();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
boot();
