/** Small helpers: time, randomness, hashing, colours. */

export const now = () => performance.now();

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));


export function hash(str) {
  let h = 2166136261;
  for (const ch of String(str)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}


export function noise(n) {
  let x = Math.imul((n | 0) ^ ((n | 0) >>> 15), 2246822507);
  x = Math.imul(x ^ (x >>> 13), 3266489909);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}


export const pick = (arr, h) => arr[h % arr.length];


export const shadeCache = new Map();

export function shade(hex, amt) {
  const key = hex + amt;
  if (shadeCache.has(key)) return shadeCache.get(key);
  const n = parseInt(hex.slice(1, 7), 16);
  const target = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  const mix = (c) => Math.round(c + (target - c) * p);
  const out = `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
  shadeCache.set(key, out);
  return out;
}


export const rand = (a, b) => a + Math.random() * (b - a);

export const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];


export const pad2 = (n) => String(n).padStart(2, '0');
