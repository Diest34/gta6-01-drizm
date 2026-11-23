// Solara Bay — saving. One job: automatic saves at mission completion and
// on-demand saves from the pause menu, in the browser's local storage.
import { SAVE_KEY } from './constants.js';

export function saveGameState(S) {
  try {
    const data = {
      cash: S.player.cash, health: S.player.health, ammo: S.player.ammo,
      hasPistol: S.player.hasPistol, missionIndex: S.missionIndex,
      missionDone: S.missionIndex, x: S.player.x, y: S.player.y,
      collectibles: S.world.collectibles.map((c) => c.taken),
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}
export function loadGameState() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
export function hasSave() { return loadGameState() !== null; }
export function applySave(S, data) {
  S.player.cash = data.cash; S.player.health = data.health;
  S.player.ammo = data.ammo; S.player.hasPistol = data.hasPistol;
  S.player.x = data.x; S.player.y = data.y;
  S.missionIndex = Math.min(4, data.missionIndex + 1);
  S.nextMission = S.missionIndex;
  if (Array.isArray(data.collectibles)) {
    data.collectibles.forEach((taken, i) => { if (S.world.collectibles[i]) S.world.collectibles[i].taken = taken; });
  }
}
