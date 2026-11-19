/** Canvas, logical 320×180 coordinate system and pixel drawing primitives. */

export const W = 320;

export const H = 180;

export const COMPACT = new URLSearchParams(location.search).get('mode') === 'compact';

/** Static render of a new office floor for screenshots (scripts/preview.js): no simulation, no panels. */
export const PREVIEW = new URLSearchParams(location.search).get('mode') === 'preview';

export const canvas = document.getElementById('scene');

/** The 2D context everything draws to: the scene canvas, or an offscreen layer while one is rendered (withContext). */
export let ctx = canvas.getContext('2d');

export let S = 1;

export let OX = 0;

export let OY = 0;

export let DPR = 1;


export function resize() {
  DPR = window.devicePixelRatio || 1;
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(r.width * DPR));
  canvas.height = Math.max(1, Math.round(r.height * DPR));
  S = Math.min(canvas.width / W, canvas.height / H);
  OX = Math.round((canvas.width - W * S) / 2);
  OY = Math.round((canvas.height - H * S) / 2);
}

// the canvas also changes size without the window (conversation panel opening next to it)
new ResizeObserver(resize).observe(canvas);

resize();


/**
 * Runs `fn` with `ctx` pointing at another 2D context of the same size as the scene canvas (offscreen
 * layers of the static office), so R(), text() and friends draw there.
 */
export function withContext(target, fn) {
  const prev = ctx;
  ctx = target;
  try {
    return fn();
  } finally {
    ctx = prev;
  }
}

/** Logical bounding box of what R() and text() paint while tracking (trackBounds). */
let tracked = null;

/** Runs `fn` and returns the logical box { x, y, w, h } it painted (R and text calls), or null. */
export function trackBounds(fn) {
  const outer = tracked;
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  tracked = box;
  try {
    fn();
  } finally {
    tracked = outer;
    if (outer && box.x1 > box.x0) {
      outer.x0 = Math.min(outer.x0, box.x0);
      outer.y0 = Math.min(outer.y0, box.y0);
      outer.x1 = Math.max(outer.x1, box.x1);
      outer.y1 = Math.max(outer.y1, box.y1);
    }
  }
  return box.x1 > box.x0 ? { x: box.x0, y: box.y0, w: box.x1 - box.x0, h: box.y1 - box.y0 } : null;
}

function track(x, y, w, h) {
  tracked.x0 = Math.min(tracked.x0, x);
  tracked.y0 = Math.min(tracked.y0, y);
  tracked.x1 = Math.max(tracked.x1, x + w);
  tracked.y1 = Math.max(tracked.y1, y + h);
}

/** Restricts drawing to a logical rect (device pixels snapped like R) until the matching ctx.restore(). */
export function clipLogical(x, y, w, h) {
  const x0 = Math.floor(OX + x * S);
  const y0 = Math.floor(OY + y * S);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, Math.ceil(OX + (x + w) * S) - x0, Math.ceil(OY + (y + h) * S) - y0);
  ctx.clip();
}


/** Filled rect in logical pixels, snapped to device pixels (no seams at any scale). */
export function R(x, y, w, h, color) {
  const x0 = Math.round(OX + x * S);
  const y0 = Math.round(OY + y * S);
  const x1 = Math.round(OX + (x + w) * S);
  const y1 = Math.round(OY + (y + h) * S);
  if (x1 <= x0 || y1 <= y0) return;
  if (tracked) track(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}


export const font = (size) => `${Math.max(1, Math.round(size * S))}px Menlo, Monaco, monospace`;


export function text(str, x, y, size, color, align = 'center') {
  if (tracked) {
    const w = str.length * size * 0.7;
    track(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x, y - size, w, size * 1.3);
  }
  ctx.font = font(size);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(str, OX + x * S, OY + y * S);
}


export function measure(str, size) {
  ctx.font = font(size);
  return ctx.measureText(str).width / S;
}


export function truncate(str, max) {
  const chars = [...String(str)];
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : chars.join('');
}


export function toLogical(e) {
  const rect = canvas.getBoundingClientRect();
  return [((e.clientX - rect.left) * DPR - OX) / S, ((e.clientY - rect.top) * DPR - OY) / S];
}
