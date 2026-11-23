// Solara Bay — HUD and minimap. One job: draw the cash, health bar, wanted
// stars, speed, ammo, objective line, clock, mute state and the circular
// minimap, plus the title, briefing, pause, success, busted, wasted and
// ending screens.
import { VIEW, COLOURS, WORLD, AVENUES, STREETS } from './constants.js';
import { MISSION_NAMES } from './missions.js';
import { hasSave } from './save.js';

export function drawHUD(S, ctx) {
  const p = S.player;
  ctx.fillStyle = COLOURS.hudBg;
  ctx.fillRect(12, 12, 300, 118);
  ctx.fillStyle = COLOURS.hudText;
  ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(`$${p.cash}`, 24, 20);
  // Health bar.
  ctx.fillStyle = '#222'; ctx.fillRect(24, 52, 160, 14);
  ctx.fillStyle = p.health > 40 ? '#2ecc71' : '#e74c3c';
  ctx.fillRect(24, 52, 160 * (p.health / 100), 14);
  ctx.fillStyle = COLOURS.hudText; ctx.font = '13px sans-serif';
  ctx.fillText('HEALTH', 190, 52);
  // Wanted stars.
  ctx.font = '22px sans-serif';
  let stars = '';
  for (let i = 0; i < 5; i += 1) stars += i < S.wanted ? '★' : '☆';
  ctx.fillStyle = S.wanted > 0 ? '#ffd23f' : '#888';
  ctx.fillText(stars, 24, 72);
  // Speed / ammo / clock.
  ctx.font = 'bold 16px sans-serif';
  if (p.inCar) ctx.fillText(`${Math.round(Math.abs(p.inCar.speed) * 0.36)} km/h`, 200, 76);
  if (p.hasPistol) ctx.fillText(`AMMO ${p.ammo}`, 200, 20);
  const hour = Math.floor(S.clockHours) % 24;
  const min = Math.floor((S.clockHours % 1) * 60);
  ctx.fillText(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`, 250, 52);
  ctx.fillStyle = S.audio.muted ? '#e74c3c' : '#bbb';
  ctx.font = '13px sans-serif';
  ctx.fillText(S.audio.muted ? 'MUTED (M)' : 'SOUND ON (M)', 24, 108);
  // Objective line.
  ctx.fillStyle = COLOURS.hudBg;
  ctx.fillRect(12, VIEW.height - 44, 760, 32);
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 16px sans-serif';
  ctx.fillText(S.objective, 24, VIEW.height - 36);
  if (S.taxi) {
    ctx.fillStyle = COLOURS.hudBg;
    ctx.fillRect(12, VIEW.height - 84, 320, 32);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`TAXI — deliver in ${Math.ceil(S.taxi.timer)}s for $80`, 24, VIEW.height - 76);
  }
  drawMinimap(S, ctx);
  // Toast log lines.
  ctx.font = '14px sans-serif'; ctx.textAlign = 'left';
  S.log.slice(-3).forEach((line, i) => {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(12, 120 + i * 22, ctx.measureText(line).width + 16, 20);
    ctx.fillStyle = '#fff';
    ctx.fillText(line, 20, 124 + i * 22);
  });
}
function drawMinimap(S, ctx) {
  const cx = VIEW.width - 96, cy = 96, r = 76;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = 'rgba(10,20,16,0.85)';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  const sx = (r * 2) / WORLD.width, sy = (r * 2) / WORLD.height;
  ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
  for (const a of AVENUES) { ctx.beginPath(); ctx.moveTo(cx - r + a * sx, cy - r); ctx.lineTo(cx - r + a * sx, cy + r); ctx.stroke(); }
  for (const s of STREETS) { ctx.beginPath(); ctx.moveTo(cx - r, cy - r + s * sy); ctx.lineTo(cx + r, cy - r + s * sy); ctx.stroke(); }
  ctx.fillStyle = '#2f7fb8';
  ctx.fillRect(cx - r, cy - r + 620 * sy, 260 * sx, 1160 * sy);
  const dot = (x, y, colour, size) => {
    ctx.fillStyle = colour;
    ctx.beginPath(); ctx.arc(cx - r + x * sx, cy - r + y * sy, size, 0, Math.PI * 2); ctx.fill();
  };
  for (const c of S.policeCars) dot(c.x, c.y, '#5dade2', 3);
  if (S.waypoint) dot(S.waypoint.x, S.waypoint.y, '#ffd23f', 5);
  if (S.taxi) dot(S.taxi.dest.x, S.taxi.dest.y, '#f2c200', 4);
  // Player arrow.
  ctx.save();
  ctx.translate(cx - r + S.player.x * sx, cy - r + S.player.y * sy);
  ctx.rotate(S.player.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -5); ctx.lineTo(-6, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
}
export function drawTitle(S, ctx) {
  ctx.fillStyle = 'rgba(6,10,24,0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('SOLARA BAY', VIEW.width / 2, 190);
  ctx.fillStyle = '#fff';
  ctx.font = '28px sans-serif';
  ctx.fillText('An open-world crime story — Mara Voss comes home to pay a debt.', VIEW.width / 2, 240);
  ctx.font = '20px sans-serif';
  ctx.fillText('WASD / arrows — move & drive   •   Shift — run   •   E — steal / leave car', VIEW.width / 2, 300);
  ctx.fillText('Space — punch   •   Click / J — shoot   •   P — pause   •   M — sound', VIEW.width / 2, 330);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(hasSave() ? 'Press ENTER — New Game      Press C — Continue' : 'Press ENTER — New Game', VIEW.width / 2, 410);
  ctx.fillStyle = '#ccc';
  ctx.font = '16px sans-serif';
  ctx.fillText('Five missions for Anselm Rook. Steal cars, dodge the police, own the Bay.', VIEW.width / 2, 460);
  ctx.fillText('A fictional city. No real places, people or brands.', VIEW.width / 2, 490);
}
export function drawBriefing(S, ctx) {
  ctx.fillStyle = 'rgba(6,10,24,0.8)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 40px sans-serif';
  ctx.fillText(MISSION_NAMES[S.missionIndex], VIEW.width / 2, 220);
  ctx.fillStyle = '#fff'; ctx.font = '22px sans-serif';
  wrapText(ctx, S.briefing, VIEW.width / 2, 280, 900, 32);
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Press ENTER to start the job', VIEW.width / 2, 460);
}
export function drawPause(S, ctx) {
  ctx.fillStyle = 'rgba(6,10,24,0.7)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff'; ctx.font = 'bold 44px sans-serif';
  ctx.fillText('PAUSED', VIEW.width / 2, 220);
  ctx.font = '20px sans-serif';
  ctx.fillText('P / Esc — resume      R — restart mission      S — save game', VIEW.width / 2, 290);
  ctx.fillText('M — sound on/off      Q — quit to title', VIEW.width / 2, 325);
  ctx.fillText('WASD drive & walk • Shift run • E steal car • Space punch • Click shoot', VIEW.width / 2, 380);
}
export function drawSuccess(S, ctx) {
  ctx.fillStyle = 'rgba(6,20,10,0.8)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2ecc71'; ctx.font = 'bold 48px sans-serif';
  ctx.fillText('JOB DONE', VIEW.width / 2, 260);
  ctx.fillStyle = '#fff'; ctx.font = '26px sans-serif';
  ctx.fillText(`${MISSION_NAMES[S.missionIndex]} — paid $${S.lastPayout}`, VIEW.width / 2, 320);
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 22px sans-serif';
  ctx.fillText(S.missionIndex < 4 ? 'Press ENTER for the next job' : 'Press ENTER', VIEW.width / 2, 400);
}
export function drawBusted(S, ctx) {
  ctx.fillStyle = 'rgba(10,10,40,0.85)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#5dade2'; ctx.font = 'bold 56px sans-serif';
  ctx.fillText('BUSTED', VIEW.width / 2, 280);
  ctx.fillStyle = '#fff'; ctx.font = '22px sans-serif';
  ctx.fillText('The Solara Bay police took you in. $200 fine — back to the hospital.', VIEW.width / 2, 340);
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Press ENTER to continue', VIEW.width / 2, 420);
}
export function drawWasted(S, ctx) {
  ctx.fillStyle = 'rgba(30,5,5,0.85)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 56px sans-serif';
  ctx.fillText('WASTED', VIEW.width / 2, 280);
  ctx.fillStyle = '#fff'; ctx.font = '22px sans-serif';
  ctx.fillText('Mara went down. $200 hospital bill — patched up and back on the street.', VIEW.width / 2, 340);
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Press ENTER to continue', VIEW.width / 2, 420);
}
export function drawEnding(S, ctx) {
  ctx.fillStyle = 'rgba(6,16,30,0.88)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 52px sans-serif';
  ctx.fillText('KING OF THE BAY', VIEW.width / 2, 240);
  ctx.fillStyle = '#fff'; ctx.font = '24px sans-serif';
  ctx.fillText('Mara walks out of the casino with the vault and her freedom.', VIEW.width / 2, 300);
  ctx.fillText('The debt is paid. Solara Bay is hers now.', VIEW.width / 2, 340);
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`Final cash: $${S.player.cash} — press ENTER to keep exploring`, VIEW.width / 2, 420);
}
function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '', yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line, cx, yy); line = w; yy += lineHeight; }
    else line = test;
  }
  ctx.fillText(line, cx, yy);
}
