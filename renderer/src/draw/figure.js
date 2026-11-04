/** Pixel-art human figure with poses and accessories. */
import { R } from '../core/canvas.js';
import { C } from '../core/palette.js';
import { shade } from '../core/util.js';

/**
 * Draw a person with feet at (x, y).
 * pose: { view: 'front'|'back', walking?: number, seated?: bool, arms, animate?, t, headDrop? }
 */
export function figure(x, y, look, pose, k = 1) {
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
    r(-2, -19 + hd, 1, blink ? 0.3 : 1, C.ink);
    r(1, -19 + hd, 1, blink ? 0.3 : 1, C.ink);
    r(-1, -17 + hd, 2, 0.5, shade(look.skin, -0.35));
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
  const tap = pose.animate ? Math.floor(t * 10) % 2 : 0;
  switch (pose.arms) {
    case 'type':
      r(-7, -20, 2, 6, sleeve);
      r(5, -20, 2, 6, sleeve);
      r(-7, -22 - tap, 2, 2, look.skin);
      r(5, -22 - (pose.animate ? 1 - tap : 0), 2, 2, look.skin);
      break;
    case 'mouse':
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


export function chairBack(x, y, occupied) {
  const dy = occupied ? 0 : -3;
  R(x - 7, y - 10 + dy, 14, 7, C.chair);
  R(x - 7, y - 10 + dy, 14, 1, shade(C.chair, 0.2));
  R(x - 1, y - 3 + dy, 2, 3, C.chairDark);
  R(x - 5, y + dy, 10, 1, C.chairDark);
}
