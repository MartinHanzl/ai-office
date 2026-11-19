/** Bitmaps of the BlueGhost office: the ghost (logo) and a pixel font for the "BlueGhost" wordmark. */
import { R } from '../../core/canvas.js';

/**
 * The BlueGhost ghost, 24×28, as painted on the office wall (mirrored logo: eyes left, tail bottom right).
 * `#` body, `o` eye holes (show the background), `.` transparent.
 */
export const GHOST = [
  '.........####...........',
  '........######..........',
  '.......########.........',
  '.......#o#o####.........',
  '.......#o#o####.....#...',
  '......#########...###...',
  '......###############...',
  '#.....##############....',
  '###################.....',
  '##################......',
  '.################.......',
  '.################.......',
  '.##.#############.......',
  '...##############.......',
  '...##.###########.......',
  '.....#############......',
  '.....#############......',
  '.....##############.....',
  '.....###############....',
  '.....################...',
  '.....###################',
  '.....##################.',
  '......################..',
  '......##############....',
  '......##########.##.....',
  '.......####.####........',
  '.......####..##.........',
  '........##..............',
];

/** Glyphs 7 px tall (2 ascender rows + 5 x-height rows), enough for "BlueGhost". */
const GLYPHS = {
  B: ['###.', '#..#', '#..#', '###.', '#..#', '#..#', '###.'],
  l: ['#', '#', '#', '#', '#', '#', '#'],
  u: ['....', '....', '#..#', '#..#', '#..#', '#..#', '.###'],
  e: ['....', '....', '.##.', '#..#', '####', '#...', '.###'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  h: ['#...', '#...', '###.', '#..#', '#..#', '#..#', '#..#'],
  o: ['....', '....', '.##.', '#..#', '#..#', '#..#', '.##.'],
  s: ['....', '....', '.###', '#...', '.##.', '...#', '###.'],
  t: ['.#.', '.#.', '###', '.#.', '.#.', '.#.', '..#'],
};

/**
 * Draws a bitmap: every char of `colors` paints, anything else is transparent. Runs of one colour
 * become one rect. k = logical px per bitmap px (0.5 still lands on whole device pixels at 4×).
 */
export function bitmap(x, y, rows, colors, k = 1, mirror = false) {
  const w = Math.max(...rows.map((r) => r.length));
  rows.forEach((row, r) => {
    const cells = mirror ? [...row.padEnd(w, '.')].reverse() : [...row];
    for (let c = 0; c < cells.length; c++) {
      const color = colors[cells[c]];
      if (!color) continue;
      let n = 1;
      while (cells[c + n] === cells[c]) n++;
      R(x + c * k, y + r * k, n * k, k, color);
      c += n - 1;
    }
  });
}

/** Width of a text in the pixel font (1 px gap between glyphs). */
export function textWidth(str, k = 1) {
  return ([...str].reduce((w, ch) => w + (GLYPHS[ch]?.[0].length ?? 3) + 1, 0) - 1) * k;
}

/** Pixel-font text, top-left at (x, y); returns its width. */
export function pixelText(str, x, y, color, k = 1) {
  let cx = x;
  for (const ch of str) {
    const g = GLYPHS[ch];
    if (g) bitmap(cx, y, g, { '#': color }, k);
    cx += ((g?.[0].length ?? 3) + 1) * k;
  }
  return cx - x - k;
}

/** The ghost in one colour; eyes take `eye` (or stay see-through). */
export function ghost(x, y, color, k = 1, { mirror = false, eye = null } = {}) {
  bitmap(x, y, GHOST, { '#': color, o: eye }, k, mirror);
}

export const GHOST_W = 24;

export const GHOST_H = 28;
