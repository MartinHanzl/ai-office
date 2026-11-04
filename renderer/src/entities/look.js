/** Character appearance derived from a stable key and career level. */
import { C, HAIRS, PANTS, SHIRTS, SKINS } from '../core/palette.js';
import { hash, pick } from '../core/util.js';

/** Look derived from a stable key; career level adds accessories (glasses → tie → headphones → suit). */
export function lookFor(id, level = 0) {
  const h = hash(id);
  return {
    shirt: pick(SHIRTS, h),
    hair: pick(HAIRS, h >>> 4),
    skin: pick(SKINS, h >>> 8),
    pants: pick(PANTS, h >>> 12),
    tie: level >= 4 ? C.yellow : level >= 2 ? pick([C.red, C.ink, C.blue], h >>> 18) : null,
    glasses: level >= 1,
    headphones: level >= 3,
    suit: level >= 4,
    cap: null,
  };
}
