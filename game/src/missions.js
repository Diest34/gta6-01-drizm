// Solara Bay — missions and story. One job: the five story jobs from Anselm Rook,
// their briefings, stages, waypoints, payouts, and the side activities
// (collectible packages, food stalls, the ammo shop, the respray garage).
import { MISSION_PAYOUTS, TAXI_FARE, SPRAY_COST } from './constants.js';
import { SPOTS } from './world.js';
import { raiseWanted } from './vehicles.js';
import { spawnGuards } from './combat.js';

export const MISSION_NAMES = [
  '1. First Fare', '2. The Pickup', '3. Midnight Run', '4. The Vault', '5. King of the Bay',
];
export const MISSION_INTROS = [
  "Rook: 'Mara. You're back, and you owe me. First job's easy — pick up my associate at the Marina and drive him to Old Town. Don't make a scene.'",
  "Rook: 'A package is waiting in my Marina warehouse. Grab it, take it Downtown. Keep it quiet — and here's a pistol, just in case.'",
  "Rook: 'Tonight we move the real goods. Cross the bridge after dark, dodge the roadblocks, and bring it to the Beachfront. Headlights on, mouth shut.'",
  "Rook: 'The Casino del Sol parks a cherry sports car out back. Take it. Bring it to the docks. The whole city will be on you — drive like you mean it.'",
  "Rook: 'Last one, Mara. The casino vault, on foot, then run for the pier. Do this and your debt is gone. King of the Bay — or nothing.'",
];
const STAGE_TEXT = [
  ['Pick up Rook\'s associate at the Marina', 'Drive him to Old Town plaza'],
  ['Collect the package from the warehouse', 'Deliver the package Downtown'],
  ['Reach the bridge at night', 'Cross to the east end — avoid the roadblocks', 'Deliver the goods to the Beachfront'],
  ['Steal the sports car from the casino car park', 'Deliver it to the docks — lose the police'],
  ['Enter the Casino del Sol on foot', 'Grab the three vault bags', 'Escape to the Beachfront pier'],
];

export function startMission(S, index) {
  S.missionIndex = index;
  S.missionStage = 0;
  S.missionActive = true;
  S.screen = 'briefing';
  S.briefing = MISSION_INTROS[index];
  S.night = index === 2;
  S.audio.stinger();
}
export function currentObjective(S) {
  if (!S.missionActive) return 'Free roam — press M for the next job, or explore Solara Bay';
  return `${MISSION_NAMES[S.missionIndex]} — ${STAGE_TEXT[S.missionIndex][S.missionStage]}`;
}
export function currentWaypoint(S) {
  if (!S.missionActive) return null;
  const i = S.missionIndex, s = S.missionStage;
  if (i === 0) return s === 0 ? SPOTS.marina : SPOTS.oldTownPlaza;
  if (i === 1) return s === 0 ? SPOTS.warehouse : SPOTS.downtownDrop;
  if (i === 2) return s === 0 ? SPOTS.bridgeWest : s === 1 ? SPOTS.bridgeEast : { x: 1650, y: 2050 };
  if (i === 3) return s === 0 ? SPOTS.casinoPark : SPOTS.docks;
  return s === 0 ? SPOTS.casino : s === 1 ? SPOTS.casino : SPOTS.pier;
}
function advanceStage(S) {
  S.missionStage += 1;
  S.audio.stinger();
  if (S.missionStage >= STAGE_TEXT[S.missionIndex].length) completeMission(S);
  else onStageEnter(S);
}
function onStageEnter(S) {
  const i = S.missionIndex, s = S.missionStage;
  if (i === 1 && s === 1) { S.player.hasPistol = true; S.player.ammo += 24; raiseWanted(S, 1); S.log.push('Police spotted the package — 1 star'); }
  if (i === 2 && s === 1) { S.night = true; spawnRoadblockPair(S); }
  if (i === 3 && s === 1) { S.wanted = 3; S.log.push('Three-star chase!'); }
  if (i === 4 && s === 1) { S.inInterior = true; S.savedPos = { x: S.player.x, y: S.player.y }; S.player.x = 400; S.player.y = 300; spawnGuards(S, 3); placeVaultBags(S); }
  if (i === 4 && s === 2) { S.inInterior = false; S.player.x = SPOTS.casino.x; S.player.y = SPOTS.casino.y + 80; S.wanted = 5; S.log.push('Five stars — run for the pier!'); }
}
function spawnRoadblockPair(S) {
  S.roadblocks.push(
    { x: 1500, y: 1100, angle: Math.PI / 2, t: 0 },
    { x: 1900, y: 1100, angle: Math.PI / 2, t: 0 },
  );
}
function placeVaultBags(S) {
  S.vaultBags = [
    { x: 220, y: 180, taken: false }, { x: 580, y: 180, taken: false }, { x: 400, y: 420, taken: false },
  ];
}
export function completeMission(S) {
  const pay = MISSION_PAYOUTS[S.missionIndex];
  S.player.cash += pay;
  S.missionActive = false;
  S.night = false;
  S.screen = 'success';
  S.lastPayout = pay;
  S.audio.missionComplete();
  S.log.push(`Mission complete — paid $${pay}`);
  // Save progress automatically.
  S.saveGame();
  if (S.missionIndex < 4) S.nextMission = S.missionIndex + 1;
  else { S.screen = 'ending'; S.audio.ending(); }
}
export function updateMissions(S, dt) {
  const p = S.player;
  if (!S.missionActive) return;
  const i = S.missionIndex, s = S.missionStage;
  const wp = currentWaypoint(S);
  if (!wp) return;
  const d = Math.hypot(p.x - wp.x, p.y - wp.y);
  if (i === 3 && s === 0) {
    // Must be sitting in the sports car in the car park.
    if (p.inCar && p.inCar.sports && d < 120) { S.wanted = 3; advanceStage(S); }
    return;
  }
  if (i === 4 && s === 0) {
    if (!p.inCar && d < 90) { advanceStage(S); }
    return;
  }
  if (i === 4 && s === 1) {
    // Inside the vault room: collect all three bags.
    for (const bag of S.vaultBags) {
      if (!bag.taken && Math.hypot(p.x - bag.x, p.y - bag.y) < 44) {
        bag.taken = true; S.audio.coin(); S.log.push('Vault bag grabbed');
      }
    }
    if (S.vaultBags.every((b) => b.taken)) advanceStage(S);
    return;
  }
  if (d < 90) advanceStage(S);
}
export function updateSideActivities(S, dt) {
  const p = S.player;
  // Collectible packages.
  for (const c of S.world.collectibles) {
    if (!c.taken && Math.hypot(p.x - c.x, p.y - c.y) < 40) {
      c.taken = true; p.cash += 50; S.audio.coin();
      S.log.push('Found a hidden package: +$50');
    }
  }
  // Food stall heals.
  if (Math.hypot(p.x - SPOTS.foodStall.x, p.y - SPOTS.foodStall.y) < 70 && p.cash >= 10) {
    if (p.health < 100) { p.cash -= 10; p.health = Math.min(100, p.health + 40); S.audio.coin(); }
  }
  // Ammo shop: refill while standing there (cash permitting).
  if (Math.hypot(p.x - SPOTS.ammoShop.x, p.y - SPOTS.ammoShop.y) < 70 && p.hasPistol && p.cash >= 30 && p.ammo < 48) {
    p.cash -= 30; p.ammo = Math.min(48, p.ammo + 24); S.audio.coin();
    S.log.push('Bought ammo');
  }
  // Respray garage: repaint the car and clear the heat.
  if (p.inCar && Math.hypot(p.x - SPOTS.sprayShop.x, p.y - SPOTS.sprayShop.y) < 90 && S.wanted > 0 && p.cash >= SPRAY_COST) {
    p.cash -= SPRAY_COST;
    p.inCar.colour = '#2ecc71';
    S.wanted = 0;
    for (const c of S.policeCars) { const k = S.cars.indexOf(c); if (k >= 0) S.cars.splice(k, 1); }
    S.policeCars = []; S.officers = []; S.roadblocks = [];
    S.audio.coin();
    S.log.push('Resprayed — heat cleared');
  }
}
export { TAXI_FARE };
