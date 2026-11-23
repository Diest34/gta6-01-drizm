// Solara Bay — seeded random numbers. One job: deterministic randomness so the
// city, traffic and pedestrians are identical on every load for a given seed.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function pick(rng, list) { return list[Math.floor(rng() * list.length)]; }
export function range(rng, min, max) { return min + rng() * (max - min); }
export function intRange(rng, min, max) { return Math.floor(range(rng, min, max + 1)); }
export function chance(rng, p) { return rng() < p; }
