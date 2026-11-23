// Solara Bay — constants: world size, tuning numbers, colours and the fixed seed.
// One job: every magic number the rest of the game shares lives here.
export const SEED = 20261124;
export const WORLD = { width: 3200, height: 2400 };
export const VIEW = { width: 1280, height: 720 };
export const ROAD_WIDTH = 96;
export const AVENUES = [400, 800, 1200, 1600, 2000, 2400, 2800];
export const STREETS = [300, 700, 1100, 1500, 1900];
export const BEACH_TOP = 2120;
export const BAY = { x: 0, y: 620, width: 260, height: 1160 };
export const BRIDGE_Y = 1100;

export const PLAYER = {
  walkSpeed: 230, runSpeed: 350, radius: 14, maxHealth: 100,
  punchDamage: 25, punchRange: 46, punchCooldown: 0.35,
};
export const CAR = {
  accel: 420, brake: 700, reverseAccel: 220, maxSpeed: 520, maxReverse: 160,
  turnRate: 2.6, drag: 0.6, length: 54, width: 26, maxDamage: 100,
};
export const WANTED_MAX = 5;
export const MISSION_PAYOUTS = [250, 600, 1200, 2500, 6000];
export const TAXI_FARE = 80;
export const SPRAY_COST = 150;
export const BUST_FINE = 200;
export const SAVE_KEY = 'solara-bay-save-v1';

export const COLOURS = {
  grass: '#5d9b4a', road: '#3a3f46', roadLine: '#e8d44d', sidewalk: '#9a9a92',
  beach: '#e8d29a', water: '#2f7fb8', waterDeep: '#256b9e', building: '#8a7f74',
  marina: '#7d8a99', downtown: '#5f6b7d', oldtown: '#a08b62', beachfront: '#c9a86a',
  player: '#e74c3c', police: '#2b6fd6', taxi: '#f2c200', sports: '#c0392b',
  hudBg: 'rgba(8,12,20,0.72)', hudText: '#ffffff', accent: '#ffd23f',
};
export const DISTRICTS = [
  { name: 'Marina', x: 0, y: 0, w: 1200, h: 1200, tint: '#7d8a99' },
  { name: 'Old Town', x: 0, y: 1200, w: 1400, h: 920, tint: '#a08b62' },
  { name: 'Downtown', x: 1400, y: 0, w: 1800, h: 1400, tint: '#5f6b7d' },
  { name: 'Beachfront', x: 1400, y: 1400, w: 1800, h: 1000, tint: '#c9a86a' },
];
