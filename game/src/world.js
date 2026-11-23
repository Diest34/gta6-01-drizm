// Solara Bay — the world builder. One job: generate the city from the fixed seed:
// districts, road grid, buildings, the bay and bridge, the beach, and every fixed
// location (hospital, spray shop, casino, marina, warehouse, pier, food and ammo
// shops, taxi stands, collectibles, parked cars).
import { SEED, WORLD, AVENUES, STREETS, ROAD_WIDTH, BEACH_TOP, BAY, BRIDGE_Y, DISTRICTS } from './constants.js';
import { makeRng, range, intRange, pick } from './random.js';

export const SPOTS = {
  hospital: { x: 2200, y: 420, label: 'Solara General Hospital' },
  sprayShop: { x: 620, y: 1830, label: 'Respray Garage' },
  casino: { x: 2050, y: 640, label: 'Casino del Sol' },
  casinoPark: { x: 2050, y: 820, label: 'Casino car park' },
  marina: { x: 420, y: 900, label: 'Marina docks' },
  warehouse: { x: 520, y: 560, label: 'Rook warehouse' },
  pier: { x: 1650, y: 2240, label: 'Beachfront pier' },
  oldTownPlaza: { x: 900, y: 1300, label: 'Old Town plaza' },
  downtownDrop: { x: 2300, y: 1250, label: 'Downtown drop' },
  bridgeEast: { x: 1900, y: 1100, label: 'Bridge east end' },
  bridgeWest: { x: 420, y: 1100, label: 'Bridge west end' },
  foodStall: { x: 1050, y: 1650, label: 'Food stall' },
  ammoShop: { x: 1750, y: 1650, label: 'Ammo shop' },
  docks: { x: 380, y: 1300, label: 'The docks' },
};

const BUILDING_COLOURS = ['#8a7f74', '#7d7468', '#9a8a70', '#6f7d8a', '#a08b62', '#7a6a58', '#5f6b7d'];

export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  return DISTRICTS[0];
}
export function onRoad(x, y) {
  for (const a of AVENUES) if (Math.abs(x - a) < ROAD_WIDTH / 2) return true;
  for (const s of STREETS) if (Math.abs(y - s) < ROAD_WIDTH / 2) return true;
  return false;
}
export function inWater(x, y) {
  return x >= BAY.x && x < BAY.x + BAY.width && y >= BAY.y && y < BAY.y + BAY.height
    && Math.abs(y - BRIDGE_Y) > ROAD_WIDTH / 2;
}
export function inBeach(x, y) { return y >= BEACH_TOP; }
export function nearestRoadPoint(x, y) {
  let bx = AVENUES[0], bd = Infinity;
  for (const a of AVENUES) if (Math.abs(x - a) < bd) { bd = Math.abs(x - a); bx = a; }
  let by = STREETS[0]; bd = Infinity;
  for (const s of STREETS) if (Math.abs(y - s) < bd) { bd = Math.abs(y - s); by = s; }
  return Math.abs(x - bx) < Math.abs(y - by) ? { x: bx, y } : { x, y: by };
}

export function buildWorld() {
  const rng = makeRng(SEED);
  const buildings = [];
  // One or two buildings per city block, never on roads, water or the beach.
  for (let ai = 0; ai <= AVENUES.length; ai += 1) {
    const x0 = ai === 0 ? 40 : AVENUES[ai - 1] + ROAD_WIDTH / 2 + 14;
    const x1 = ai === AVENUES.length ? WORLD.width - 40 : AVENUES[ai] - ROAD_WIDTH / 2 - 14;
    for (let si = 0; si <= STREETS.length; si += 1) {
      const y0 = si === 0 ? 40 : STREETS[si - 1] + ROAD_WIDTH / 2 + 14;
      const y1 = si === STREETS.length ? BEACH_TOP - 20 : STREETS[si] - ROAD_WIDTH / 2 - 14;
      if (x1 - x0 < 90 || y1 - y0 < 70) continue;
      const count = intRange(rng, 1, 2);
      for (let b = 0; b < count; b += 1) {
        const w = range(rng, 70, Math.min(170, x1 - x0 - 10));
        const h = range(rng, 60, Math.min(150, y1 - y0 - 10));
        const x = range(rng, x0, x1 - w);
        const y = range(rng, y0, y1 - h);
        const cx = x + w / 2, cy = y + h / 2;
        if (inWater(cx, cy)) continue;
        if (Object.values(SPOTS).some((s) => Math.hypot(s.x - cx, s.y - cy) < 190)) continue;
        const d = districtAt(cx, cy);
        buildings.push({
          x, y, w, h, colour: pick(rng, BUILDING_COLOURS), tint: d.tint,
          tall: d.name === 'Downtown' && chance0(rng),
          district: d.name, roof: pick(rng, ['#b8543f', '#4a6b8a', '#6b7a4a', '#8a8a8a']),
        });
      }
    }
  }
  function chance0(r) { return r() < 0.45; }

  const collectibles = [];
  const spots = [
    [560, 420], [1350, 480], [2550, 950], [950, 1750], [2150, 1750],
    [2900, 1350], [700, 2050], [2700, 2050],
  ];
  for (const [x, y] of spots) collectibles.push({ x, y, taken: false });

  const parked = [];
  const carColours = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#ecf0f1', '#2c3e50', '#e67e22'];
  for (let i = 0; i < 26; i += 1) {
    const vertical = rng() < 0.5;
    const road = vertical ? pick(rng, AVENUES) : pick(rng, STREETS);
    const along = range(rng, 120, vertical ? WORLD.height - 120 : WORLD.width - 120);
    const x = vertical ? road + (rng() < 0.5 ? -34 : 34) : along;
    const y = vertical ? along : road + (rng() < 0.5 ? -34 : 34);
    if (inWater(x, y) || inBeach(x, y)) continue;
    parked.push({
      x, y, angle: vertical ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
      colour: pick(rng, carColours), parked: true, taxi: false, sports: false,
    });
  }
  // The casino sports car, the star of mission 4, always waits in the car park.
  parked.push({ x: SPOTS.casinoPark.x + 40, y: SPOTS.casinoPark.y, angle: 0, colour: '#c0392b', parked: true, taxi: false, sports: true });

  return { buildings, collectibles, parked, rngSeed: SEED };
}

// Traffic lights: each intersection cycles green north-south / east-west.
export function lightState(intersectionIndex, clockSeconds) {
  const cycle = 16;
  const phase = (clockSeconds + intersectionIndex * 5) % cycle;
  return phase < cycle / 2 ? 'ns' : 'ew';
}
export function hitsBuilding(buildings, x, y, r) {
  for (const b of buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}
export function blockedAt(buildings, x, y, r) {
  if (x < r || y < r || x > WORLD.width - r || y > WORLD.height - r) return true;
  if (inWater(x, y)) return true;
  return hitsBuilding(buildings, x, y, r) !== null;
}
