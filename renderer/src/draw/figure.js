/** Pixel-art human figure with poses and accessories. */
import { R, ctx } from '../core/canvas.js';
import { C } from '../core/palette.js';
import { shade } from '../core/util.js';

/**
 * Draw a person with feet at (x, y).
 * pose: { view: 'front'|'back'|'left'|'right', walking?: number, seated?: bool, arms, animate?, t, headDrop?, face?, speed? }
 * 'left'/'right' is the profile: seated (beside a desk, on a sofa or the pouf) or standing (facing someone
 * in a chat, at the drawers); a walking profile falls back to the front view.
 */
export function figure(x, y, look, pose, k = 1) {
  if (pose.view === 'left' || pose.view === 'right') {
    if (pose.seated || pose.walking == null) {
      profile(x, y, look, pose, k);
      return;
    }
    pose = { ...pose, view: 'front' };
  }
  const r = (dx, dy, w, h, c) => R(x + dx * k, y + dy * k, w * k, h * k, c);
  const top = look.suit ? '#2c3352' : look.shirt;
  const sleeve = shade(top, -0.22);
  const back = pose.view === 'back';
  const hd = pose.headDrop || 0;
  const t = pose.t || 0;

  if (!pose.seated) {
    const phase = pose.walking != null ? Math.floor(pose.walking) % 2 : -1;
    const liftA = phase === 0 ? 1 : 0;
    const liftB = phase === 1 ? 1 : 0;
    r(-4, -7, 3, 5 - liftA, look.pants);
    r(1, -7, 3, 5 - liftB, look.pants);
    r(-4, -2 - liftA, 3, 2, C.ink);
    r(1, -2 - liftB, 3, 2, C.ink);
  } else if (pose.view === 'front') {
    r(-4, -7, 8, 3, look.pants);
    r(-4, -4, 3, 3, look.pants);
    r(1, -4, 3, 3, look.pants);
    r(-4, -1, 3, 1, C.ink);
    r(1, -1, 3, 1, C.ink);
  }

  // torso
  r(-5, -15, 10, 8, top);
  r(-5, -8, 10, 1, sleeve);
  if (!back && look.suit) r(-1.5, -15, 3, 6, C.white);
  if (!back && look.tie) r(-0.5, -15, 1.5, 6, look.tie);

  // head
  r(-1, -16 + hd, 2, 1, look.skin);
  if (back) {
    r(-4, -23 + hd, 8, 7, look.hair);
    r(-5, -20 + hd, 1, 2, look.skin);
    r(4, -20 + hd, 1, 2, look.skin);
  } else {
    r(-4, -23 + hd, 8, 7, look.skin);
    r(-4, -24 + hd, 8, 3, look.hair);
    r(-4, -21 + hd, 1, 2, look.hair);
    r(3, -21 + hd, 1, 2, look.hair);
    const blink = (t + (look.skin.charCodeAt(2) % 7)) % 4 < 0.12;
    const face = pose.face ?? 'neutral';
    const eyeH = blink ? 0.3 : face === 'tired' || face === 'flat' ? 0.5 : 1;
    const eyeY = -19 + hd + (eyeH < 1 && !blink ? 0.5 : 0);
    r(-2, eyeY, 1, eyeH, C.ink);
    r(1, eyeY, 1, eyeH, C.ink);
    drawFace(r, face, hd, look, t);
    if (look.glasses) {
      r(-3.2, -20 + hd, 3, 2.4, C.ink);
      r(0.2, -20 + hd, 3, 2.4, C.ink);
      r(-2.7, -19.6 + hd, 2, 1.6, '#cfe8ff');
      r(0.7, -19.6 + hd, 2, 1.6, '#cfe8ff');
      r(-2.2, -19.2 + hd, 1, 1, C.ink);
      r(1.2, -19.2 + hd, 1, 1, C.ink);
    }
  }
  if (look.headphones) {
    r(-4.5, -25 + hd, 9, 1, C.ink);
    r(-5.5, -22 + hd, 1.6, 3.5, C.red);
    r(3.9, -22 + hd, 1.6, 3.5, C.red);
  }
  if (look.cap) {
    r(-4, -25 + hd, 8, 2.5, look.cap);
    if (!back) r(-4, -23 + hd, 10, 1, shade(look.cap, -0.25));
  }

  // arms
  const tap = pose.animate ? Math.floor(t * 10 * (pose.speed ?? 1)) % 2 : 0;
  switch (pose.arms) {
    case 'type':
      if (!back && pose.seated) {
        // seen from the front, behind a desk: forearms forward and down to the keyboard
        r(-7, -15, 2, 5, sleeve);
        r(5, -15, 2, 5, sleeve);
        r(-6, -11, 3, 2, sleeve);
        r(3, -11, 3, 2, sleeve);
        r(-4, -10 - tap * 0.5, 2, 1.5, look.skin);
        r(2, -10 - (pose.animate ? 1 - tap : 0) * 0.5, 2, 1.5, look.skin);
        break;
      }
      r(-7, -20, 2, 6, sleeve);
      r(5, -20, 2, 6, sleeve);
      r(-7, -22 - tap, 2, 2, look.skin);
      r(5, -22 - (pose.animate ? 1 - tap : 0), 2, 2, look.skin);
      break;
    case 'mouse':
      if (!back && pose.seated) {
        // from the front: one hand on the keyboard, the other on the mouse beside it
        r(-7, -15, 2, 5, sleeve);
        r(-6, -11, 3, 2, sleeve);
        r(-4, -10, 2, 1.5, look.skin);
        r(5, -15, 2, 5, sleeve);
        r(5, -11, 2, 2, sleeve);
        r(6 + (Math.floor(t * 2) % 2) * 0.5, -10, 2, 1.5, look.skin);
        break;
      }
      r(-7, -20, 2, 6, sleeve);
      r(-7, -22, 2, 2, look.skin);
      r(5, -19, 3, 5, sleeve);
      r(7, -21 - (Math.floor(t * 2) % 2) * 0.5, 2, 2, look.skin);
      break;
    case 'think':
      r(-7, -15, 2, 7, sleeve);
      r(-7, -8, 2, 2, look.skin);
      r(5, -21, 2, 6, sleeve);
      r(4, -23 + hd, 2, 2, look.skin);
      break;
    case 'raise': {
      const wave = Math.round(Math.sin(t * 8));
      r(-7, -15, 2, 7, sleeve);
      r(-7, -8, 2, 2, look.skin);
      r(5 + wave * 0.5, -31, 2, 16, sleeve);
      r(5 + wave, -34, 2, 3, look.skin);
      break;
    }
    case 'phone':
      r(5, -15, 2, 7, sleeve);
      r(5, -8, 2, 2, look.skin);
      r(-7, -21, 2, 6, sleeve);
      r(-6, -23, 2, 4, C.ink);
      break;
    case 'cheer': {
      const up = Math.floor(t * 4) % 2;
      r(-7, -28 - up, 2, 13 + up, sleeve);
      r(5, -28 - up, 2, 13 + up, sleeve);
      r(-7, -30 - up, 2, 2, look.skin);
      r(5, -30 - up, 2, 2, look.skin);
      break;
    }
    case 'rest':
      r(-7, -17, 14, 2, sleeve);
      break;
    case 'facepalm':
      r(-7, -21, 2, 6, sleeve);
      r(5, -21, 2, 6, sleeve);
      r(-6, -24 + hd, 2, 2, look.skin);
      r(4, -24 + hd, 2, 2, look.skin);
      break;
    case 'draw': {
      const wx = Math.sin(t * 5) * 1.5;
      const wy = Math.cos(t * 3.7);
      r(-7, -15, 2, 7, sleeve);
      r(-7, -8, 2, 2, look.skin);
      r(5, -27, 2, 12, sleeve);
      r(5 + wx, -30 + wy, 2, 2, look.skin);
      r(5.5 + wx, -32 + wy, 1, 2, C.blue);
      break;
    }
    case 'talk': {
      const g = Math.round(Math.sin(t * 7) * 1.5);
      r(-7, -15, 2, 7, sleeve);
      r(-7, -8, 2, 2, look.skin);
      r(5, -15, 2, 4, sleeve);
      r(6, -13 + g, 2, 2, look.skin);
      break;
    }
    case 'mug':
      r(-7, -15, 2, 7, sleeve);
      r(-7, -8, 2, 2, look.skin);
      r(5, -15, 2, 5, sleeve);
      r(3, -11, 2, 2, look.skin);
      r(1, -13, 3, 4, C.white);
      r(4, -12, 1, 2, C.white);
      if (Math.floor(t * 3) % 2) r(2, -15 - (t * 2) % 2, 1, 1, '#ffffff99');
      break;
    case 'laptop':
      r(-7, -15, 2, 5, sleeve);
      r(5, -15, 2, 5, sleeve);
      r(-6, -14, 12, 5, C.metal);
      r(-1, -12, 2, 1, C.white);
      r(-6, -9, 12, 1, C.metalDark);
      r(-6 + tap * 9, -10, 2, 1.5, look.skin);
      break;
    default:
      r(-7, -15, 2, 7, sleeve);
      r(5, -15, 2, 7, sleeve);
      r(-7, -8, 2, 2, look.skin);
      r(5, -8, 2, 2, look.skin);
  }
}


/**
 * Profile, facing right (or mirrored for 'left'), feet point (x, y). Seated: thigh along the seat, shin
 * and shoe forward; standing: both legs straight, the far one a shade darker. Torso and head side-on
 * (hair at the back, one eye, a nose), the near arm per `arms` with the far arm a shade darker behind it.
 * Hands reach forward to the desk for 'type'/'mouse'.
 */
function profile(x, y, look, pose, k) {
  const f = pose.view === 'left' ? -1 : 1;
  const r = (dx, dy, w, h, c) => R(f > 0 ? x + dx * k : x - (dx + w) * k, y + dy * k, w * k, h * k, c);
  const top = look.suit ? '#2c3352' : look.shirt;
  const sleeve = shade(top, -0.22);
  const farSleeve = shade(top, -0.4);
  const farSkin = shade(look.skin, -0.25);
  const t = pose.t || 0;
  const arms = pose.arms ?? 'down';
  const doze = arms === 'rest';
  const hd = (pose.headDrop || 0) + (doze ? 2 : 0);
  const hx = doze ? 1 : 0; // dozing: the head sinks forward onto the arms
  const tap = pose.animate ? Math.floor(t * 10 * (pose.speed ?? 1)) % 2 : 0;

  // far arm first (behind the torso)
  switch (arms) {
    case 'type':
      r(2, -11, 3, 2, farSleeve);
      r(5, -11 - (pose.animate ? 1 - tap : 0), 2, 1, farSkin);
      break;
    case 'mouse':
    case 'rest':
      r(2, -11, 3, 2, farSleeve);
      break;
    case 'cheer': {
      const up = Math.floor(t * 4) % 2;
      r(-2, -27 - up, 2, 12 + up, farSleeve);
      r(-2, -29 - up, 2, 2, farSkin);
      break;
    }
    case 'facepalm':
      r(1, -15, 2, 4, farSleeve);
      break;
    default:
  }

  if (pose.seated) {
    // legs: thigh along the seat, shin down to the floor, shoe pointing forward
    r(-3, -7, 7, 2, look.pants);
    r(2, -5, 2, 4, look.pants);
    r(2, -1, 3, 1, C.ink);
  } else {
    // standing: far leg a step back and darker, near leg straight, shoes pointing forward
    r(-2, -7, 3, 5, shade(look.pants, -0.25));
    r(-2, -2, 4, 2, C.ink);
    r(0, -7, 3, 5, look.pants);
    r(0, -2, 4, 2, C.ink);
  }

  // torso
  r(-3, -15, 6, 8, top);
  r(-3, -8, 6, 1, sleeve);
  if (look.suit) r(2, -15, 1, 5, C.white);
  if (look.tie) r(2, -14, 1, 4, look.tie);

  // head: face forward, hair over the top and the back, ear between
  r(-1, -16 + hd, 2, 1, look.skin);
  r(-3 + hx, -23 + hd, 7, 7, look.skin);
  r(4 + hx, -20 + hd, 1, 2, look.skin); // nose
  r(-3 + hx, -24 + hd, 7, 2, look.hair);
  r(-3 + hx, -22 + hd, 2, 5, look.hair);
  r(3 + hx, -22 + hd, 1, 1, look.hair); // fringe
  r(-1 + hx, -20 + hd, 1, 2, shade(look.skin, -0.18)); // ear
  const blink = (t + (look.skin.charCodeAt(2) % 7)) % 4 < 0.12;
  const face = pose.face ?? 'neutral';
  const eyeH = blink || doze ? 0.3 : face === 'tired' || face === 'flat' ? 0.5 : 1;
  r(2 + hx, -19 + hd + (eyeH < 1 ? 0.5 : 0), 1, eyeH, C.ink);
  const lip = shade(look.skin, -0.35);
  if (face === 'smile') r(2.5 + hx, -17.5 + hd, 1.5, 0.5, lip);
  else if (face === 'sad' || face === 'worried') r(3 + hx, -17 + hd, 1, 0.5, lip);
  else r(3 + hx, -17.3 + hd, 1, 0.5, lip);
  if (face === 'angry' || face === 'worried') r(1.5 + hx, face === 'angry' ? -20.2 + hd : -20.6 + hd, 1.6, 0.5, look.hair);
  if (look.glasses) {
    r(1.4 + hx, -20.2 + hd, 2.6, 2.2, C.ink);
    r(1.9 + hx, -19.7 + hd, 1.6, 1.2, '#cfe8ff');
    r(-0.6 + hx, -19.8 + hd, 2, 0.6, C.ink); // temple
  }
  if (look.headphones) {
    r(-3.5 + hx, -25 + hd, 7, 1, C.ink);
    r(-1.5 + hx, -21.5 + hd, 2, 3.5, C.red);
  }
  if (look.cap) {
    r(-3 + hx, -25 + hd, 7, 2.5, look.cap);
    r(3 + hx, -23 + hd, 3, 1, shade(look.cap, -0.25));
  }

  // near arm
  switch (arms) {
    case 'type':
      r(-1, -14, 2, 4, sleeve);
      r(-1, -11, 6, 2, sleeve);
      r(5, -11 - tap, 2, 2, look.skin);
      break;
    case 'mouse': {
      const nudge = Math.floor(t * 2) % 2 ? 0.5 : 0;
      r(-1, -14, 2, 4, sleeve);
      r(-1, -11, 6, 2, sleeve);
      r(5 + nudge, -11, 2, 2, look.skin);
      break;
    }
    case 'think':
      r(-1, -14, 2, 4, sleeve);
      r(1, -16, 2, 6, sleeve);
      r(2, -18 + hd, 2, 2, look.skin); // hand under the chin
      break;
    case 'raise': {
      const wave = Math.round(Math.sin(t * 8));
      r(0 + wave * 0.5, -31, 2, 16, sleeve);
      r(0 + wave, -34, 2, 3, look.skin);
      break;
    }
    case 'phone':
      r(-1, -14, 2, 3, sleeve);
      r(-2, -19 + hd, 2, 6, sleeve);
      r(-2, -21 + hd, 2, 2, look.skin);
      r(-1, -22 + hd, 2, 4, C.ink); // phone at the ear
      break;
    case 'cheer': {
      const up = Math.floor(t * 4) % 2;
      r(1, -28 - up, 2, 13 + up, sleeve);
      r(1, -30 - up, 2, 2, look.skin);
      break;
    }
    case 'rest':
      // dozing: forearms folded forward on the desk, the head on them
      r(-1, -14, 2, 4, sleeve);
      r(-1, -12, 7, 2, sleeve);
      break;
    case 'facepalm':
      r(-1, -14, 2, 3, sleeve);
      r(1, -18 + hd, 2, 6, sleeve);
      r(2 + hx, -21 + hd, 2, 3, look.skin); // hand over the eyes
      break;
    case 'mug':
      r(-1, -14, 2, 4, sleeve);
      r(-1, -12, 4, 2, sleeve);
      r(3, -13, 2, 2, look.skin);
      r(4, -15, 3, 4, C.white);
      if (Math.floor(t * 3) % 2) r(5, -17 - (t * 2) % 2, 1, 1, '#ffffff99');
      break;
    case 'laptop':
      // laptop on the knees, lid up at the far end
      r(0, -9, 6, 1, C.metal);
      r(5, -14, 1, 5, C.metalDark);
      r(-1, -14, 2, 4, sleeve);
      r(-1, -11, 4, 2, sleeve);
      r(3, -11 + (pose.animate ? tap : 0) * 0.5, 2, 1, look.skin);
      break;
    case 'talk': {
      const g = Math.round(Math.sin(t * 7) * 1.5);
      r(-1, -14, 2, 4, sleeve);
      r(0, -12, 3, 2, sleeve);
      r(3, -13 + g, 2, 2, look.skin);
      break;
    }
    default:
      if (pose.seated) {
        // hands resting on the thigh
        r(-1, -14, 2, 5, sleeve);
        r(0, -10, 3, 2, sleeve);
        r(3, -10, 2, 2, look.skin);
      } else {
        // arm hanging by the side
        r(-1, -14, 2, 6, sleeve);
        r(-1, -8, 2, 2, look.skin);
      }
  }
}


/** Mouth and brows for the front view. r() is the figure-local rect helper. */
function drawFace(r, face, hd, look, t) {
  const lip = shade(look.skin, -0.35);
  switch (face) {
    case 'smile':
      r(-1, -16.8 + hd, 2, 0.5, lip);
      r(-1.6, -17.3 + hd, 0.6, 0.6, lip);
      r(1, -17.3 + hd, 0.6, 0.6, lip);
      break;
    case 'sad':
    case 'worried':
      r(-1, -17.3 + hd, 2, 0.5, lip);
      r(-1.6, -16.8 + hd, 0.6, 0.6, lip);
      r(1, -16.8 + hd, 0.6, 0.6, lip);
      if (face === 'worried') {
        r(-2.6, -20.4 + hd, 1.4, 0.5, look.hair);
        r(1.2, -20.4 + hd, 1.4, 0.5, look.hair);
      }
      break;
    case 'angry':
      r(-1, -17 + hd, 2, 0.5, lip);
      r(-2.6, -20.8 + hd, 0.8, 0.5, look.hair);
      r(-1.9, -20.4 + hd, 0.8, 0.5, look.hair);
      r(1.1, -20.4 + hd, 0.8, 0.5, look.hair);
      r(1.8, -20.8 + hd, 0.8, 0.5, look.hair);
      break;
    case 'tired': {
      const yawn = Math.floor(t / 3) % 3 === 0;
      r(-0.7, -17.3 + hd, 1.4, yawn ? 1.2 : 0.5, yawn ? C.ink : lip);
      r(-2.2, -18.2 + hd, 1.2, 0.4, shade(look.skin, -0.2));
      r(0.9, -18.2 + hd, 1.2, 0.4, shade(look.skin, -0.2));
      break;
    }
    default:
      r(-1, -17 + hd, 2, 0.5, lip);
  }
}


/** Ghost of an employee: a floating sheet with their hair tuft and a band in their shirt colour. */
export function ghostFigure(x, y, look, t) {
  const by = y - 5 + Math.sin(t * 2.5 + x * 0.1) * 1.5;
  const body = '#e8f1ff';
  const edge = '#b8c8e0';
  R(x - 4, y - 1, 8, 1.5, 'rgba(20,22,42,0.22)'); // shadow on the floor
  ctx.save();
  ctx.globalAlpha = 0.72;
  R(x - 3, by - 21, 6, 1.5, body);
  R(x - 5, by - 19.5, 10, 2, body);
  R(x - 6, by - 17.5, 12, 15.5, body);
  for (let i = 0; i < 4; i++) R(x - 6 + i * 3, by - 2, 3, (i + Math.floor(t * 4)) % 2 ? 2 : 1, body);
  R(x - 6, by - 4, 12, 0.8, edge);
  R(x - 2, by - 22, 4, 1.5, look.hair);
  R(x - 6, by - 8.5, 12, 1.5, look.shirt);
  const wave = Math.sin(t * 5) * 1;
  R(x - 8, by - 13 + wave, 2, 3, body);
  R(x + 6, by - 13 - wave, 2, 3, body);
  ctx.globalAlpha = 0.9;
  R(x - 3, by - 15, 1.5, 2, C.ink);
  R(x + 1.5, by - 15, 1.5, 2, C.ink);
  R(x - 0.75, by - 11.5, 1.5, 1.8, C.ink);
  ctx.restore();
}
