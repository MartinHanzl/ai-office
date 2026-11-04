#!/usr/bin/env node
'use strict';
/** Generates build/icon.png (1024×1024 pixel-art app icon) with a tiny dependency-free PNG encoder. */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// 16×16 icon: a monitor full of code, the back of an employee sitting at a desk.
const MAP = [
  '................',
  '..kkkkkkkkkkkk..',
  '..kssssssssssk..',
  '..kscccccssssk..',
  '..ksyyyyyyyssk..',
  '..kspppssssssk..',
  '..ksccccccclsk..',
  '..kkkkkkkkkkkk..',
  'dddddokkoddddddd',
  'ddddddhhhhdddddd',
  'ffffffhhhhffffff',
  '......hhhh......',
  '....tttttttt....',
  '....tttttttt....',
  '....tttttttt....',
  '................',
].map((row) => row.padEnd(16, '.'));

const COLORS = {
  '.': [59, 68, 102], k: [38, 43, 68], s: [30, 34, 51], c: [115, 239, 247], y: [244, 211, 94],
  p: [181, 80, 136], l: [167, 240, 112], d: [217, 160, 102], f: [176, 122, 74], h: [26, 28, 44],
  t: [65, 166, 246], o: [245, 207, 168],
};

const SIZE = 1024;
const MARGIN = 96; // macOS icon grid: 832px body centred on a 1024 canvas
const CELL = (SIZE - MARGIN * 2) / 16;
const RADIUS = 3; // rounded corners, in cells

/** Rounded-rect test in continuous cell coordinates (0..16). */
function insideBody(x, y) {
  const dx = Math.max(RADIUS - x, 0, x - (16 - RADIUS));
  const dy = Math.max(RADIUS - y, 0, y - (16 - RADIUS));
  return Math.hypot(dx, dy) <= RADIUS;
}

const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0; // filter: none
  for (let x = 0; x < SIZE; x++) {
    const o = y * (SIZE * 4 + 1) + 1 + x * 4;
    const bx = (x - MARGIN) / CELL;
    const by = (y - MARGIN) / CELL;
    if (bx < 0 || by < 0 || bx >= 16 || by >= 16) continue; // transparent margin
    const cx = Math.floor(bx);
    const cy = Math.floor(by);
    if (!insideBody(bx, by)) continue;
    const [r, g, b] = COLORS[MAP[cy][cx]] ?? COLORS['.'];
    raw[o] = r;
    raw[o + 1] = g;
    raw[o + 2] = b;
    raw[o + 3] = 255;
  }
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.join(__dirname, '..', 'build', 'icon.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log(`Ikona: ${out}`);
