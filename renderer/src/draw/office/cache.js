/**
 * Cached static layers of the floors and the per-frame composition over them.
 *
 * A layer is built once per (floor, light bucket, canvas size): `base` = floors, back wall and its static
 * items; `full` = base plus every static drawable (furniture, walls, facades, courtyard) in depth order.
 * Each static drawable keeps the logical box it painted. A frame blits `full`, then only inside the boxes
 * of the dynamic drawables (people, live screens, TVs…) blits `base` again and redraws the static
 * drawables touching those boxes together with the dynamic ones in depth order – the result equals
 * drawing everything every frame, translucent glass and shadows included. A resize drops all layers; only
 * the two last used layers are kept (both floors in the current light).
 */
import { H, OX, OY, S, W, canvas, ctx, trackBounds, withContext } from '../../core/canvas.js';
import { drawBase, drawItem, lightBucket, officeEnv, staticDrawables } from './index.js';

/** Layers kept (LRU), each two canvases of the scene's size. */
const MAX_LAYERS = 2;

const layers = new Map();
let layerSize = '';

const FULL = { x: 0, y: 0, w: W, h: H };

function offscreen() {
  const c = document.createElement('canvas');
  c.width = canvas.width;
  c.height = canvas.height;
  return c;
}

/** Clips the current context to the logical scene (the letterbox around it stays empty). */
function clipScene(c2d) {
  c2d.save();
  c2d.beginPath();
  c2d.rect(OX, OY, W * S, H * S);
  c2d.clip();
}

const intersect = (a, b) => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x;
  const h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w > 0 && h > 0 ? { x, y, w, h } : null;
};

/** Do two logical boxes overlap (with a pixel of slack for the snapping to device pixels)? */
const overlaps = (a, b) => a.x < b.x + b.w + 1 && b.x < a.x + a.w + 1 && a.y < b.y + b.h + 1 && b.y < a.y + a.h + 1;

function buildLayer(m, hour) {
  const env = officeEnv(m, hour);
  const base = offscreen();
  const full = offscreen();
  const bctx = base.getContext('2d');
  withContext(bctx, () => {
    clipScene(bctx);
    drawBase(m, env);
    bctx.restore();
  });
  const items = staticDrawables(m, env);
  const fctx = full.getContext('2d');
  fctx.drawImage(base, 0, 0);
  withContext(fctx, () => {
    clipScene(fctx);
    items.forEach((it, i) => {
      it.order = i;
      const box = trackBounds(() => drawItem(it));
      it.box = box && it.clip ? intersect(box, it.clip) : box;
    });
    fctx.restore();
  });
  return { base, full, items: items.filter((it) => it.box), lights: env.lights };
}

/**
 * The static layer of floor `m` at `hour` (built on first use). `lights` = the night lights of the static
 * part (LED sign, TVs, windows, entrance lamp, panel LEDs) for the darkness.
 */
export function staticLayer(m, hour) {
  const size = `${canvas.width}x${canvas.height}`;
  if (size !== layerSize) {
    layers.clear();
    layerSize = size;
  }
  const key = `${m.floor}|${lightBucket(hour)}`;
  let layer = layers.get(key);
  if (layer) {
    layers.delete(key); // most recently used last
  } else {
    layer = buildLayer(m, hour);
    // two full-size canvases each: keep the two last used (both floors in the current light)
    while (layers.size >= MAX_LAYERS) layers.delete(layers.keys().next().value);
  }
  layers.set(key, layer);
  return layer;
}

/**
 * Draws a floor: its static layer, then the dynamic drawables ({ y, box, draw, clip? }) in depth order
 * together with the static drawables they overlap, clipped to their boxes.
 */
export function drawScene(layer, dynamic) {
  ctx.drawImage(layer.full, 0, 0);
  if (!dynamic.length) return;
  const boxes = dynamic.map((d) => d.box ?? FULL);
  ctx.save();
  ctx.beginPath();
  for (const b of boxes) {
    const x0 = Math.floor(OX + b.x * S);
    const y0 = Math.floor(OY + b.y * S);
    ctx.rect(x0, y0, Math.ceil(OX + (b.x + b.w) * S) - x0, Math.ceil(OY + (b.y + b.h) * S) - y0);
  }
  ctx.clip();
  ctx.drawImage(layer.base, 0, 0);
  const all = layer.items.filter((it) => boxes.some((b) => overlaps(it.box, b)));
  dynamic.forEach((d, i) => {
    d.order = 1e6 + i;
    all.push(d);
  });
  all.sort((a, b) => a.y - b.y || a.order - b.order);
  for (const it of all) drawItem(it);
  ctx.restore();
}
