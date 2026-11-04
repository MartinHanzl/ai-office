/** Drawing employees and interns according to their state. */
import { now } from '../core/util.js';
import { chairBack, figure } from './figure.js';
import { WORKING } from '../entities/activity.js';

export const SEATED_ARMS = {
  typing: 'type', terminal: 'type', planning: 'type', reading: 'mouse', web: 'mouse',
  thinking: 'think', waiting: 'raise', phone: 'phone', sleeping: 'rest', idle: 'down', surfing: 'mouse',
};


export function drawWorker(w, t) {
  const look = w.look;
  if (w.walking) {
    figure(w.x, w.y, look, { view: w.facing === 'up' ? 'back' : 'front', walking: w.step, arms: 'down', t });
    return;
  }
  const oops = w.errorUntil > now();
  if (w.place === 'board') {
    figure(w.x, w.y, look, { view: 'back', arms: w.waiting ? 'raise' : oops ? 'facepalm' : 'draw', t });
    return;
  }
  if (w.place === 'desk' && w.seat.desk) {
    const animate = ['typing', 'terminal', 'planning'].includes(w.activity);
    figure(w.x, w.y, look, {
      view: 'back', seated: true, arms: oops && !w.waiting ? 'facepalm' : SEATED_ARMS[w.activity] ?? 'down', animate, t,
      headDrop: w.activity === 'sleeping' ? 2 : 0,
    });
    chairBack(w.x, w.y, true);
    return;
  }
  if (w.place === 'desk' && w.seat.sofa) {
    // overflow seat: works on a laptop on the sofa (seen from behind, sofa back drawn over)
    figure(w.x, w.y, look, { view: 'back', seated: true, arms: WORKING.has(w.activity) ? 'type' : 'down', animate: WORKING.has(w.activity), t });
    return;
  }
  if (w.place === 'desk' && w.seat.standing) {
    figure(w.x, w.y, look, { view: 'front', arms: 'laptop', animate: WORKING.has(w.activity), t });
    return;
  }
  if (w.place === 'spot' && w.idle) {
    switch (w.idle.kind) {
      case 'coffee':
        figure(w.x, w.y, look, { view: 'front', arms: 'mug', t });
        return;
      case 'sofa': {
        const laugh = w.bubble && Math.floor(t * 6) % 2 ? -0.5 : 0;
        figure(w.x, w.y + laugh, look, { view: 'back', seated: true, arms: 'down', t });
        return;
      }
      case 'chat':
        figure(w.x, w.y, look, { view: 'front', arms: w.talkingUntil > now() ? 'talk' : 'down', t });
        return;
      default:
        break;
    }
  }
  figure(w.x, w.y, look, { view: 'front', arms: 'down', t });
}


export function drawIntern(i, t) {
  if (i.walking) {
    figure(i.x, i.y, i.look, { view: i.facing === 'up' ? 'back' : 'front', walking: i.step, arms: 'down', t }, 0.8);
    return;
  }
  figure(i.x, i.y, i.look, { view: 'front', arms: 'laptop', animate: true, t: t + i.slot }, 0.8);
}
