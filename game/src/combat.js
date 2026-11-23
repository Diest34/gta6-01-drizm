// Solara Bay — combat. One job: punching, shooting, enemy health and behaviour,
// and the casino guards of the final mission.
import { PLAYER } from './constants.js';
import { hurtPlayer } from './player.js';
import { raiseWanted } from './vehicles.js';

export function punch(S) {
  const p = S.player;
  if (p.punchTimer > 0 || p.inCar) return;
  p.punchTimer = PLAYER.punchCooldown;
  S.audio.punch();
  const targets = [...S.officers, ...S.guards];
  for (const e of targets) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < PLAYER.punchRange) {
      e.health -= PLAYER.punchDamage;
      e.x += Math.cos(p.angle) * 26; e.y += Math.sin(p.angle) * 26;
      S.particles.push({ x: e.x, y: e.y, kind: 'hit', t: 0, life: 0.3 });
    }
  }
  S.officers = S.officers.filter((o) => o.health > 0);
  S.guards = S.guards.filter((g) => g.health > 0);
}
export function shoot(S, tx, ty) {
  const p = S.player;
  if (p.inCar || !p.hasPistol || p.ammo <= 0) return;
  p.ammo -= 1;
  S.gunfireTimer = 1.2;
  raiseWanted(S, 1);
  S.audio.gunshot();
  const a = Math.atan2(ty - p.y, tx - p.x);
  p.angle = a;
  S.bullets.push({ x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22, angle: a, speed: 900, life: 0.6 });
}
export function updateBullets(S, dt) {
  for (const b of S.bullets) {
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.life -= dt;
    for (const e of [...S.officers, ...S.guards]) {
      if (Math.hypot(e.x - b.x, e.y - b.y) < 22) {
        e.health -= 34; b.life = 0;
        S.particles.push({ x: e.x, y: e.y, kind: 'hit', t: 0, life: 0.3 });
      }
    }
  }
  S.bullets = S.bullets.filter((b) => b.life > 0);
  S.officers = S.officers.filter((o) => o.health > 0);
  S.guards = S.guards.filter((g) => g.health > 0);
}
export function spawnGuards(S, count) {
  for (let i = 0; i < count; i += 1) {
    S.guards.push({
      x: S.casinoRoom.x + 120 + Math.random() * (S.casinoRoom.w - 240),
      y: S.casinoRoom.y + 120 + Math.random() * (S.casinoRoom.h - 240),
      health: 60, speed: 130, hitTimer: 0,
    });
  }
}
export function updateGuards(S, dt) {
  const p = S.player;
  for (const g of S.guards) {
    if (g.hitTimer > 0) g.hitTimer -= dt;
    const d = Math.hypot(p.x - g.x, p.y - g.y);
    if (d > 16) {
      const a = Math.atan2(p.y - g.y, p.x - g.x);
      g.x += Math.cos(a) * g.speed * dt;
      g.y += Math.sin(a) * g.speed * dt;
    }
    if (d < 34 && g.hitTimer <= 0) {
      g.hitTimer = 0.9;
      hurtPlayer(S, 10);
      S.audio.punch();
    }
  }
}
export function checkPlayerHitByCar(S) {
  // Speeding traffic that clips the player on foot hurts them and raises heat.
  const p = S.player;
  if (p.inCar) return;
  for (const car of S.cars) {
    if (car.driver === 'player' || car.parked || car.exploded) continue;
    if (Math.abs(car.speed) > 120 && Math.hypot(car.x - p.x, car.y - p.y) < 34) {
      hurtPlayer(S, 18);
      raiseWanted(S, 1);
      car.speed *= 0.4;
    }
  }
}
