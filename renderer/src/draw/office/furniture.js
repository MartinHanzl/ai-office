/**
 * Furniture of the BlueGhost office, drawn from map instances: white desks with beige acoustic
 * screens, black monitors and chairs, cream sofas and armchairs, tables, bar, reception, printer…
 * Each piece pushes depth-sorted drawables ({ y, draw }) into `items`.
 */
import { R } from '../../core/canvas.js';
import { BG } from '../../core/palette.js';
import { noise } from '../../core/util.js';
import { CELL } from '../../world/map.js';
import { bitmap } from './sprites.js';

/** Projected height of a desk top above the floor. */
export const DESK_H = 5;


// ---- desks, monitors, chairs

/**
 * How a desk is used: profile (seats left/right) or front/back rows, whether people face each other
 * across it (then a beige screen runs along the middle line).
 */
function deskLayout(item) {
  const by = (f) => item.seats.filter((s) => s.facing === f);
  const profile = by('left').length + by('right').length > 0;
  if (profile) {
    const both = by('left').length > 0 && by('right').length > 0;
    return { profile, both, mid: item.x + item.w / 2 };
  }
  const both = by('front').length > 0 && by('back').length > 0;
  return { profile, both, mid: item.y + item.h / 2 };
}

/** Monitor foot line for a seat: in the sitter's half of a shared desk, mid-desk on a one-sided one. */
function monitorLine(item, s, L) {
  const depth = L.profile ? item.w : item.h;
  const reach = Math.max(2, Math.min(7, Math.round(L.both ? (depth / 2) * 0.6 : depth * 0.5)));
  switch (s.facing) {
    case 'left': return item.x + item.w - reach; // sitter east of the desk
    case 'right': return item.x + reach;
    case 'front': return item.y + reach; // sitter north of the desk
    default: return item.y + item.h - reach;
  }
}

/**
 * Where the monitor of a desk seat (map seat with `item`) stands. `kind`: 'side' (profile desks, a
 * narrow side-on screen facing the sitter), 'front' (screen towards the viewer, sitter in front of it)
 * or 'rear' (the sitter is behind the desk, the viewer sees the monitor's back). `screen` = the visible
 * screen rect (null for 'rear'), `frame` = the whole monitor, `keyboard` = where the hands go.
 */
export function monitorOf(s) {
  const item = s.item;
  const L = deskLayout(item);
  const line = monitorLine(item, s, L);
  if (L.profile) {
    const left = s.facing === 'left';
    const mx = left ? line - 2 : line - 1;
    const mt = s.y - DESK_H - 10;
    return {
      kind: 'side', frame: { x: mx, y: mt, w: 3, h: 10 }, screen: { x: left ? mx + 1 : mx, y: mt + 1, w: 2, h: 5 },
      keyboard: { x: left ? item.x + item.w - 3 : item.x + 1, y: s.y - DESK_H - 1, w: 2, h: 3 },
    };
  }
  if (s.facing === 'front') {
    const mt = line - DESK_H - 7;
    return {
      kind: 'rear', frame: { x: s.x - 4, y: mt, w: 8, h: 7 }, screen: null,
      keyboard: { x: s.x - 3, y: item.y + 1 - DESK_H, w: 6, h: 1 },
    };
  }
  const mt = line - DESK_H - 10;
  return {
    kind: 'front', frame: { x: s.x - 5, y: mt, w: 10, h: 10 }, screen: { x: s.x - 4, y: mt + 1, w: 8, h: 6 },
    keyboard: { x: s.x - 3, y: item.y + item.h - 2 - DESK_H, w: 6, h: 1 },
  };
}

/** Depth of the screen of a desk seat: right over its monitor, under whoever sits in front of it. */
export function screenDepth(s) {
  return s.item && deskLayout(s.item).profile ? s.y - 1.9 : s.item.y + s.item.h + 0.01;
}

/** Tiny screen content: code lines when someone works, a dark standby otherwise. */
function screen(x, y, w, h, on, seed) {
  if (!on) {
    R(x, y, w, h, BG.monitorOff);
    R(x, y, 1, Math.min(h, 2), '#2a3640');
    return;
  }
  R(x, y, w, h, '#1e2a33');
  const colors = [BG.brandLight, '#a7f070', '#f4d35e', '#ef7d57', BG.brandPale];
  for (let i = 0; i < h; i += 2) {
    const len = 1 + Math.floor(noise(seed * 13 + i) * (w - 1));
    R(x + (w > 3 ? 1 : 0), y + i, Math.min(len, w), 1, colors[(seed + i) % colors.length]);
  }
}

/**
 * Static drawables of a desk: the desk (profile desks in one slice per map row, so a sitter beside it
 * has the rows behind them drawn first and the rows in front after: hands over the desk top, legs
 * under it) and the chairs whose look does not depend on someone sitting (all but the back row).
 * Screens are drawn in standby here; live screen content is dynamic (draw/screens.js).
 */
export function deskDrawables(item, env, items) {
  const { y, h } = item;
  const L = deskLayout(item);
  if (L.profile) {
    for (let r = item.box.r; r < item.box.r + item.box.h; r++) {
      const first = r === item.box.r;
      const last = r === item.box.r + item.box.h - 1;
      const y0 = first ? 0 : r * CELL - DESK_H;
      const y1 = last ? 180 : (r + 1) * CELL - DESK_H;
      const clip = { x: item.x - 2, y: y0, w: item.w + 4, h: y1 - y0 };
      items.push({ y: (r + 1) * CELL, clip, draw: () => drawDesk(item, L) });
    }
  } else {
    items.push({ y: y + h, draw: () => drawDesk(item, L) });
  }
  // one chair per seat, on the seat cell, turned to the desk; the back row's chairs go over their sitter (dynamic)
  for (const s of item.seats) {
    if (s.facing === 'back') continue;
    items.push({ y: s.y - 0.5, draw: () => officeChair(s.x, s.y, s.facing) });
  }
}

/**
 * Chair of a back-row desk seat (sitter seen from behind): behind whoever stands there when empty, over its
 * sitter when taken – the backrest then hides the lower back, shoulders and head show above it.
 */
export function backChairDrawable(s, occupied) {
  return {
    y: s.y + (occupied ? 0.25 : -0.5),
    box: { x: s.x - 5, y: s.y - 11, w: 10, h: 12 },
    draw: () => officeChair(s.x, s.y, 'back'),
  };
}

function drawDesk(item, L) {
  const { x, y, w, h } = item;
  const top = y - DESK_H;
  // shadow and white frame legs under the top
  R(x + 1, y + h - DESK_H + 1, w - 2, DESK_H - 1, 'rgba(0,0,0,0.16)');
  const legsX = [x + 1, x + w - 2];
  if (w > 32) legsX.push(x + Math.floor(w / 2));
  for (const lx of legsX) R(lx, y + h - DESK_H + 1, 1, DESK_H - 1, BG.deskLeg);
  R(x, top, w, h, BG.desk);
  R(x, top, w, 1, BG.deskLight);
  R(x, top + h - 1, w, 1, BG.deskShade);
  R(x, top + h, w, 1, BG.deskFront);

  // joints between workstations along the long side
  const along = L.profile ? item.seats.map((s) => s.y).sort((a, b) => a - b) : item.seats.map((s) => s.x).sort((a, b) => a - b);
  const uniq = [...new Set(along)];
  for (let i = 0; i + 1 < uniq.length; i++) {
    const j = Math.round((uniq[i] + uniq[i + 1]) / 2);
    if (L.profile) R(x, j - DESK_H, w, 1, BG.deskShade);
    else R(j, top, 1, h, BG.deskShade);
  }

  const seed = (s) => s.c * 31 + s.r * 7;

  if (!L.profile) {
    // rows facing the viewer or away: monitor backs (north rows), the beige quilted screen on the
    // middle line when rows face each other, then monitor fronts (south rows); each monitor stands
    // in the half of the desk nearest its sitter
    for (const s of item.seats.filter((q) => q.facing === 'front')) {
      const { frame: f, keyboard: k } = monitorOf(s);
      R(k.x, k.y, k.w, k.h, '#c7cbd1'); // keyboard at the sitter's edge, behind the monitor
      R(f.x, f.y, 8, 6, BG.monitorBack);
      R(f.x, f.y, 8, 1, '#3a3b3f');
      R(s.x - 1, f.y + 6, 2, 1, BG.monitorBack);
    }
    if (L.both) {
      const sy = L.mid - DESK_H - 9;
      R(x + 1, sy, w - 2, 9, BG.screen);
      R(x + 1, sy, w - 2, 1, BG.screenLight);
      for (let sx = x + 3; sx < x + w - 2; sx += 3) R(sx, sy + 2, 1, 6, BG.screenStitch);
      R(x + 1, sy + 8, w - 2, 1, BG.screenStitch);
    }
    for (const s of item.seats.filter((q) => q.facing === 'back')) {
      const { frame: f, screen: sc, keyboard: k } = monitorOf(s);
      R(f.x, f.y, 10, 8, BG.monitor);
      screen(sc.x, sc.y, sc.w, sc.h, false, seed(s));
      R(s.x - 1, f.y + 8, 2, 2, BG.monitor);
      R(k.x, k.y, k.w, k.h, '#c7cbd1'); // keyboard at the sitter's edge
    }
    return;
  }

  // profile rows: quilted screen along the middle line, then side-on monitors facing their seats
  if (L.both) {
    const sx = Math.round(L.mid) - 1;
    R(sx, top - 8, 2, h, BG.screen);
    for (let yy = top - 7; yy < top + h - 8; yy += 3) R(sx, yy, 2, 1, BG.screenStitch);
    R(sx, top + h - 8, 2, 8, BG.screenStitch);
    R(sx, top + h - 8, 2, 1, BG.screenLight);
  }
  for (const s of item.seats) {
    const { frame: f, screen: sc, keyboard: k } = monitorOf(s);
    R(f.x, f.y, 3, 7, BG.monitor);
    screen(sc.x, sc.y, sc.w, sc.h, false, seed(s));
    R(f.x + 1, f.y + 7, 1, 2, BG.monitor);
    R(f.x, f.y + 9, 3, 1, BG.monitor);
    R(k.x, k.y, k.w, k.h, '#c7cbd1'); // keyboard at the seat edge
  }
}

/** Office chair sprites: `#` frame, `m` mesh, `s` seat edge; feet at the last row. */
const CHAIR = {
  back: ['.######.', '#mmmmmm#', '#mmmmmm#', '#mmmmmm#', '#mmmmmm#', '.######.', '...##...', '...##...', '.######.', '#......#'],
  front: ['.######.', '#mmmmmm#', '#mmmmmm#', '#mmmmmm#', '.######.', 'ssssssss', '.######.', '...##...', '.######.', '#......#'],
  side: ['.....##', '.....#m', '.....#m', '.....#m', '.....#m', '.....##', 'sssssss', '.######', '...#...', '.#####.', '#.....#'],
};
const CHAIR_COLORS = { '#': BG.chair, m: '#303236', s: BG.chairLight };

/** Black mesh office chair turned to `facing` (the way its sitter looks); (x, y) = the seat spot. */
export function officeChair(x, y, facing) {
  if (facing === 'left' || facing === 'right') {
    bitmap(facing === 'left' ? x - 3 : x - 4, y - 11, CHAIR.side, CHAIR_COLORS, 1, facing === 'right');
  } else if (facing === 'front') {
    bitmap(x - 4, y - CHAIR.front.length + 1, CHAIR.front, CHAIR_COLORS);
  } else {
    bitmap(x - 4, y - CHAIR.back.length + 1, CHAIR.back, CHAIR_COLORS);
  }
}


// ---- seats and seated poses

/** Map seat `use` → seat kind of the world (layout.js seats carry `kind` themselves). */
const USE_KIND = { desk: 'desk', sofa: 'sofa', armchair: 'armchair', pouf: 'pouf', barStool: 'stool', table: 'cafe', booth: 'booth' };

/** Seat kind of a world seat (`kind`) or a parsed map seat (`use`); 'stand' for standing spots. */
export function seatKind(s) {
  if (s.kind && s.kind !== 'seat') return s.kind;
  return USE_KIND[s.use] ?? 'stand';
}

/** Kinds people sit on (everything else is a standing spot: coffee, window, meeting, chat…). */
export const SEATED_KINDS = new Set(['desk', 'sofa', 'armchair', 'pouf', 'stool', 'booth', 'cafe']);

/**
 * How a person sits on (or stands at) a seat: offset from the seat point, depth for sorting and the
 * figure view. Desk profile seats rely on the row slices of their desk (hands over, legs under);
 * desk front seats sit behind the desk (its top hides the legs); desk back seats sit in front of it
 * with the chair back over them; upholstered seats sit between the back/top and the front parts of
 * their piece (sofaDrawables, armchairDrawables, poufDrawables); profile sofa and pouf sitters lean
 * back against the backrest or the wall; stool sitters perch 2 px higher; booth sitters are inside,
 * under the glass front; café sitters sit between their chair back and the table.
 * @returns {{ dx: number, dy: number, depth: number, view: 'front'|'back'|'left'|'right', seated: boolean }}
 */
export function seatPose(s) {
  const kind = seatKind(s);
  const facing = s.facing ?? 'front';
  const side = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
  const pose = { dx: 0, dy: 0, depth: s.y + 0.1, view: facing, seated: SEATED_KINDS.has(kind) };
  switch (kind) {
    case 'desk':
      if (facing === 'front') pose.dy = 1;
      break;
    case 'sofa':
    case 'pouf':
      if (side) pose.dx = -3 * side;
      else if (facing === 'back') pose.dy = -2;
      break;
    case 'armchair':
      if (facing === 'front') pose.dy = -1;
      else if (facing === 'back') pose.dy = -1;
      break;
    case 'stool':
      pose.dy = -2;
      pose.view = 'back';
      break;
    case 'booth':
      pose.view = 'front';
      break;
    case 'coffee':
      pose.view = 'back';
      pose.depth = s.y;
      break;
    case 'window':
      pose.view = 'front';
      pose.depth = s.y;
      break;
    default:
      if (!pose.seated) {
        pose.depth = s.y;
        if (side) pose.view = 'front';
      }
  }
  return pose;
}


// ---- upholstery

/** Sofa tones: cream upstairs (photos 01, 04), blue in the klubovna. */
export const CREAM = { main: BG.sofa, shade: BG.sofaShade, dark: BG.sofaDark, light: BG.sofaLight };

export const BLUE = { main: BG.sofaBlue, shade: BG.sofaBlueShade, dark: BG.sofaBlueDark, light: BG.sofaBlueLight };

/** One cushion: face, light top edge, shaded bottom edge, dark seam on its far side. */
function cushion(x, y, w, h, t) {
  R(x, y, w, h, t.main);
  R(x, y, w, 1, t.light);
  R(x, y + h - 1, w, 1, t.shade);
}

/**
 * Sofa with backrest, arms and one cushion per seat. Profile sofas (seats `<`/`>`) are drawn before
 * their sitters and their front arm after; sofas seen from behind are drawn after (heads show above).
 */
export function sofaDrawables(item, items, tone = CREAM) {
  const { x, y, w, h } = item;
  const t = tone;
  const facing = item.seats[0]?.facing ?? 'back';
  const seats = item.seats.map((q) => (facing === 'left' || facing === 'right' ? q.y : q.x)).sort((p, q) => p - q);
  const splits = seats.slice(0, -1).map((v, i) => Math.round((v + seats[i + 1]) / 2));
  if (facing === 'left' || facing === 'right') {
    const backX = facing === 'right' ? x : x + w - 4;
    const seatX = facing === 'right' ? x + 4 : x;
    const sw = w - 4;
    items.push({
      y,
      draw: () => {
        R(x + 1, y + h - 1, w, 2, 'rgba(0,0,0,0.14)'); // floor shadow
        R(x - 1, y - 12, w + 2, h + 12, t.dark); // outline
        R(x, y - 5, w, h + 1, t.shade);
        // seat cushions
        const edges = [y - 2, ...splits.map((v) => v - 4), y + h - 8];
        for (let i = 0; i + 1 < edges.length; i++) cushion(seatX, edges[i], sw, edges[i + 1] - edges[i], t);
        R(facing === 'right' ? seatX + sw - 1 : seatX, y - 2, 1, h - 6, t.shade); // seat front edge
        // backrest: cap, quilted face, shadow where it meets the seat
        R(backX, y - 11, 4, h + 3, t.main);
        R(backX, y - 11, 4, 1, t.light);
        for (let yy = y - 8; yy < y + h - 9; yy += 3) R(backX, yy, 4, 1, t.shade);
        R(facing === 'right' ? backX + 4 : backX - 1, y - 10, 1, h + 2, t.dark);
        // north arm
        R(x, y - 9, w, 4, t.main);
        R(x, y - 9, w, 1, t.light);
        R(x, y - 5, w, 1, t.dark);
      },
    });
    items.push({
      y: y + h,
      draw: () => {
        R(x - 1, y + h - 11, w + 2, 12, t.dark);
        R(x, y + h - 10, w, 4, t.main); // south arm
        R(x, y + h - 10, w, 1, t.light);
        R(x, y + h - 6, w, 5, t.shade); // its front face
        R(x, y + h - 6, w, 1, t.dark);
        R(x + 1, y + h - 1, 1, 1, BG.chair);
        R(x + w - 2, y + h - 1, 1, 1, BG.chair);
      },
    });
    return;
  }
  if (facing === 'back') {
    // seen from behind: arms, tall back with one cushion per seat; heads show above it
    items.push({
      y: y + h,
      draw: () => {
        R(x - 1, y - 7, w + 2, h + 7, t.dark);
        R(x, y - 6, 4, h + 4, t.shade);
        R(x + w - 4, y - 6, 4, h + 4, t.shade);
        R(x, y - 6, 4, 1, t.light);
        R(x + w - 4, y - 6, 4, 1, t.light);
        const edges = [x + 4, ...splits, x + w - 4];
        for (let i = 0; i + 1 < edges.length; i++) {
          const cx = edges[i];
          const cw = edges[i + 1] - edges[i];
          R(cx, y - 3, cw, h + 1, t.main);
          R(cx, y - 3, cw, 1, t.light);
          R(cx + cw - 1, y - 2, 1, h, t.shade);
          for (let yy = y; yy < y + h - 3; yy += 3) R(cx + 1, yy, cw - 2, 1, t.shade);
        }
        R(x, y + h - 2, w, 1, t.dark);
        R(x + 1, y + h - 1, 2, 1, BG.chair);
        R(x + w - 3, y + h - 1, 2, 1, BG.chair);
      },
    });
    return;
  }
  // facing the viewer: backrest behind, arms, cushions in front
  items.push({
    y,
    draw: () => {
      R(x - 1, y - 11, w + 2, h + 11, t.dark);
      R(x, y - 10, w, 5, t.main);
      R(x, y - 10, w, 1, t.light);
      R(x, y - 6, w, 1, t.shade);
      const edges = [x + 3, ...splits, x + w - 3];
      for (let i = 0; i + 1 < edges.length; i++) cushion(edges[i], y - 5, edges[i + 1] - edges[i] - 1, h, t);
      R(x, y - 7, 3, h + 4, t.main);
      R(x + w - 3, y - 7, 3, h + 4, t.main);
      R(x, y + h - 4, w, 4, t.shade);
    },
  });
}

/** Armchair: facing the viewer (back behind the sitter) or away (back towards the viewer). */
export function armchairDrawables(item, items) {
  const { x, y, w, h } = item;
  const facing = item.seats[0]?.facing ?? 'front';
  const t = facing === 'back'
    ? { main: BG.armchair, shade: BG.armchairShade, dark: '#8c7d64', light: '#c8bba7' }
    : CREAM;
  if (facing === 'back') {
    items.push({
      y: y + h,
      draw: () => {
        R(x - 1, y - 10, w + 2, h + 10, t.dark);
        R(x, y - 6, 2, h + 5, t.shade); // arms
        R(x + w - 2, y - 6, 2, h + 5, t.shade);
        R(x, y - 6, 2, 1, t.light);
        R(x + w - 2, y - 6, 2, 1, t.light);
        R(x + 2, y - 9, w - 4, h + 8, t.main); // the back seen from behind
        R(x + 2, y - 9, w - 4, 1, t.light);
        for (let yy = y - 6; yy < y + h - 2; yy += 3) R(x + 2, yy, w - 4, 1, t.shade);
        R(x, y + h - 1, w, 1, t.dark);
      },
    });
    return;
  }
  items.push({
    y,
    draw: () => {
      R(x - 1, y - 12, w + 2, h + 12, t.dark);
      R(x + 1, y - 11, w - 2, 6, t.main); // backrest
      R(x + 1, y - 11, w - 2, 1, t.light);
      R(x + 1, y - 8, w - 2, 1, t.shade);
      R(x + 1, y - 6, w - 2, 1, t.dark);
      R(x, y - 7, 2, h + 6, t.main); // arms
      R(x, y - 7, 2, 1, t.light);
      R(x + w - 2, y - 7, 2, h + 6, t.main);
      R(x + w - 2, y - 7, 2, 1, t.light);
      R(x + 2, y - 7, 1, h + 6, t.dark);
      R(x + w - 3, y - 7, 1, h + 6, t.dark);
      cushion(x + 3, y - 5, w - 6, h + 1, t); // seat cushion
      R(x, y + h - 3, w, 3, t.shade);
      R(x, y + h - 3, w, 1, t.dark);
    },
  });
}

/** Long upholstered pouf along the side wall (seats in profile). */
export function poufDrawables(item, items) {
  const { x, y, w, h } = item;
  items.push({
    y,
    draw: () => {
      R(x, y - 4, w, h, '#d3cbbc');
      R(x, y - 4, w, 1, '#e0dacd');
      const seats = item.seats.map((s) => s.y).sort((a, b) => a - b);
      for (let i = 0; i + 1 < seats.length; i++) R(x, Math.round((seats[i] + seats[i + 1]) / 2) - 4, w, 1, '#b9b1a1');
      R(x + w - 1, y - 4, 1, h, '#c2baa9');
    },
  });
  items.push({ y: y + h, draw: () => R(x, y + h - 4, w, 4, '#b9b1a1') });
}


// ---- tables

/** Small table: round (wood or white), C-shaped laptop table, café table or low coffee table. */
export function tableDrawables(m, item, items, variant) {
  const { x, y, w, h } = item;
  items.push({
    y: y + h,
    draw: () => {
      if (variant === 'c-table') {
        R(x + w - 2, y - 7, 1, 7, BG.white);
        R(x + 1, y - 1, w - 1, 1, BG.whiteShade);
        R(x, y - 9, w, 4, BG.white);
        R(x, y - 6, w, 1, BG.whiteShade);
        R(x + 1, y - 8, 2, 1, BG.chrome);
        return;
      }
      if (variant === 'round-wood' || variant === 'round-white') {
        const cx = x + Math.floor(w / 2);
        R(x + 1, y + h - 2, w - 1, 2, 'rgba(0,0,0,0.16)'); // shadow on the floor
        if (variant === 'round-wood') {
          // three splayed legs
          R(cx - 3, y + h - 4, 1, 4, BG.tableWoodDark);
          R(cx + 2, y + h - 4, 1, 4, BG.tableWoodDark);
          R(cx, y + h - 5, 1, 5, BG.tableWoodDark);
        } else {
          // pedestal on a round foot
          R(cx - 1, y + h - 6, 2, 6, BG.steelDark);
          R(cx - 3, y + h - 1, 6, 1, BG.steelDark);
        }
        R(x + 1, y - 7, w - 2, h - 1, BG.tableWood);
        R(x, y - 6, w, h - 3, BG.tableWood);
        R(x + 1, y + h - 8, w - 2, 1, BG.tableWoodDark);
        R(x, y + h - 9, 1, 1, BG.tableWoodDark);
        R(x + w - 1, y + h - 9, 1, 1, BG.tableWoodDark);
        R(x + 2, y - 7, w - 4, 1, BG.tableWoodLight);
        if (variant === 'round-white') {
          R(x + 2, y - 5, 2, 2, BG.paper); // mugs (photo 05)
          R(x + w - 4, y - 6, 2, 2, BG.paper);
        } else {
          R(x + 3, y - 6, 3, 2, 'rgba(210,235,240,0.8)'); // glass bowl
        }
        return;
      }
      const th = variant === 'coffee' ? 3 : 6;
      const [top, edge, leg] = m.floorAt(item.box.c, item.box.r) === 'wood'
        ? [BG.tableWoodLight, BG.tableWoodDark, BG.chair] : [BG.white, BG.whiteShade, BG.chrome];
      R(x + 1, y + h - th, 1, th, leg);
      R(x + w - 2, y + h - th, 1, th, leg);
      R(x, y - th, w, h, top);
      R(x, y - th, w, 1, 'rgba(255,255,255,0.3)');
      R(x, y + h - th, w, 1, edge);
      if (variant === 'coffee') {
        R(x + 4, y - 2, 3, 2, BG.paper);
        R(x + w - 9, y - 3, 4, 3, BG.plant);
      }
    },
  });
}

/** Café chair at a klubovna table seat. */
export function cafeChair(s, items) {
  const { x, y } = s;
  if (s.facing === 'front') {
    items.push({
      y: y - 0.5,
      draw: () => {
        R(x - 3, y - 13, 6, 6, BG.tableWoodDark);
        R(x - 3, y - 13, 6, 1, BG.tableWood);
        R(x - 3, y - 6, 6, 2, BG.tableWood);
        R(x - 3, y - 4, 1, 4, BG.chair);
        R(x + 2, y - 4, 1, 4, BG.chair);
      },
    });
  } else {
    items.push({
      y: y + 0.5,
      draw: () => {
        R(x - 3, y - 9, 6, 5, BG.tableWoodDark);
        R(x - 3, y - 9, 6, 1, BG.tableWood);
        R(x - 3, y - 4, 1, 4, BG.chair);
        R(x + 2, y - 4, 1, 4, BG.chair);
      },
    });
  }
}

/** Meeting table running diagonally: per row runs shifted by one cell, smoothed into a 45° band. */
export function meetingTableDrawables(item, items) {
  const rows = [...new Set(item.cells.map(([, r]) => r))].sort((a, b) => a - b);
  const runs = rows.map((r) => {
    const cs = item.cells.filter(([, rr]) => rr === r).map(([c]) => c);
    return { r, c0: Math.min(...cs), w: Math.max(...cs) - Math.min(...cs) + 1 };
  });
  const dir = runs.length > 1 ? Math.sign(runs[1].c0 - runs[0].c0) : 0;
  const lines = [];
  for (const run of runs) {
    for (let py = 0; py < CELL; py++) {
      const shift = dir < 0 ? CELL - 1 - py : dir > 0 ? py : 0;
      lines.push({ x: run.c0 * CELL + shift - (dir < 0 ? 1 : 0), y: run.r * CELL + py, w: run.w * CELL });
    }
  }
  const bottom = Math.max(...lines.map((l) => l.y)) + 1;
  items.push({
    y: bottom,
    draw: () => {
      const TH = 6;
      for (const l of lines) R(l.x + 2, l.y, 1, 1, BG.chair); // legs line
      for (const l of lines) R(l.x, l.y - TH + 2, l.w, 1, BG.deskShade);
      for (const l of lines) R(l.x, l.y - TH, l.w, 1, BG.desk);
      for (const l of lines) R(l.x, l.y - TH, 1, 1, BG.deskShade);
      const first = lines[0];
      R(first.x, first.y - TH, first.w, 1, BG.deskLight);
      // laptops and papers along the table
      for (let i = 4; i < lines.length - 2; i += 7) {
        const l = lines[i];
        R(l.x + 6, l.y - TH - 2, 5, 3, '#9aa3ad');
        R(l.x + 6, l.y - TH - 2, 5, 1, '#c7cbd1');
        R(l.x + 13, l.y - TH, 3, 2, BG.paper);
      }
    },
  });
}

/** Black meeting chair (decoration), turned towards the table next to it. */
export function meetingChair(m, item, items) {
  const x = item.x + 2;
  const y = item.y + 2;
  const table = m.of('meetingTable')[0];
  const row = table ? table.cells.filter(([, r]) => r === item.box.r).map(([c]) => c) : [];
  const facing = row.length && item.box.c < Math.min(...row) ? 'right' : 'left';
  items.push({ y: y - 0.5, draw: () => officeChair(x, y, facing) });
}


// ---- bar, reception, appliances

/** Stone-imitation blocks (bar front): staggered rows with mortar joints. */
function stoneBlocks(x, y, w, h) {
  R(x, y, w, h, '#6f6b65');
  const tones = ['#8e8a84', '#9a968f', '#857f78', '#a19d96'];
  for (let row = 0; row * 3 < h; row++) {
    let bx = x - (row % 2) * 4;
    let i = 0;
    while (bx < x + w) {
      const bw = 6 + Math.floor(noise(row * 53 + i * 7 + x) * 4);
      const x0 = Math.max(x, bx);
      const x1 = Math.min(x + w, bx + bw - 1);
      const y0 = y + row * 3;
      const bh = Math.min(2, y + h - y0);
      if (x1 > x0 && bh > 0) {
        R(x0, y0, x1 - x0, bh, tones[Math.floor(noise(row * 31 + i * 17) * tones.length)]);
        R(x0, y0, x1 - x0, 1, 'rgba(255,255,255,0.12)');
      }
      bx += bw;
      i++;
    }
  }
}

/** The bar's footprint: bar and coffee-machine cells along the back wall. */
export function barRect(m) {
  const parts = [...m.of('bar'), ...m.of('coffeeMachine')];
  if (!parts.length) return null;
  const x = Math.min(...parts.map((p) => p.x));
  const y = Math.min(...parts.map((p) => p.y));
  return { x, y, w: Math.max(...parts.map((p) => p.x + p.w)) - x, h: Math.max(...parts.map((p) => p.y + p.h)) - y };
}

export const BAR_H = 9;

/** Bar counter along the back wall: wooden top, stone-imitation front, espresso machine at its end. */
export function barDrawables(m, items) {
  const rect = barRect(m);
  if (!rect) return;
  const { x, y, w, h } = rect;
  const x1 = x + w;
  const y1 = y + h;
  const BH = BAR_H;
  items.push({
    y: y1,
    draw: () => {
      stoneBlocks(x, y1 - BH, w, BH - 1);
      R(x, y1 - 1, w, 1, BG.accentWallDark);
      R(x, y - BH, w, h, BG.tableWood);
      for (let px = x + 7; px < x1; px += 13) R(px, y - BH + 1, 1, h - 2, BG.tableWoodDark);
      R(x, y - BH, w, 1, BG.tableWoodLight);
      R(x, y1 - BH - 1, w, 1, BG.tableWoodDark);
      R(x, y1 - BH, w, 1, '#5e4630');
      // things on the bar
      for (let i = 0; x + 30 + i * 22 < x1 - 6; i++) {
        const bx = x + 30 + i * 22;
        R(bx, y - BH + 2, 2, 2, BG.paper);
        R(bx + 3, y - BH + 3, 2, 2, i % 2 ? '#ef7d57' : BG.paper);
      }
      R(x1 - 10, y - BH - 1, 5, 4, BG.plant);
      R(x1 - 9, y - BH + 2, 3, 2, BG.pot);
      for (const cm of m.of('coffeeMachine')) espresso(cm.x, cm.y - BH, cm.w);
    },
  });
}

function espresso(x, y, w) {
  // y = bar top surface
  const bx = x + 1;
  R(bx, y - 7, w - 4, 8, BG.chrome);
  R(bx, y - 7, w - 4, 1, '#dfe2e6');
  R(bx + 1, y - 5, w - 6, 2, BG.chair);
  R(bx + 2, y - 3, 1, 2, BG.chromeDark);
  R(bx + 5, y - 3, 1, 2, BG.chromeDark);
  R(bx + 1, y - 1, w - 6, 1, BG.chromeDark);
  R(bx + 2, y - 8, 2, 1, BG.paper);
  R(bx + 5, y - 8, 2, 1, BG.paper);
  R(x + w - 3, y - 6, 3, 7, BG.chair); // grinder
  R(x + w - 3, y - 8, 3, 2, 'rgba(120,80,50,0.9)');
}

/** Small upholstered stool in a phone booth, teal like its curtains; drawn before whoever sits on it. */
export function boothStool(s, items) {
  const { x, y } = s;
  items.push({
    y: y - 0.5,
    draw: () => {
      R(x - 5, y - 8, 10, 2, BG.curtainLight);
      R(x - 5, y - 6, 10, 6, BG.curtain);
      R(x - 5, y - 1, 10, 1, BG.curtainDark);
    },
  });
}

/** White bar stool with a chrome leg; drawn before whoever sits on it. */
export function barStool(s, items) {
  const { x, y } = s;
  items.push({
    y: y - 2,
    draw: () => {
      R(x - 2, y - 1, 5, 1, BG.chrome);
      R(x, y - 9, 1, 8, BG.chrome);
      R(x - 1, y - 5, 3, 1, BG.chromeDark);
      R(x - 2, y - 11, 5, 2, BG.white);
      R(x - 2, y - 11, 5, 1, BG.paper);
      R(x - 2, y - 9, 5, 1, BG.whiteShade);
    },
  });
}

export function receptionDrawables(item, items) {
  const { x, y, w, h } = item;
  const RH = 8;
  items.push({
    y: y + h,
    draw: () => {
      R(x, y + h - RH, w, RH, BG.white);
      R(x, y + h - RH + 3, w, 2, BG.tableWood);
      R(x, y + h - 2, w, 2, BG.whiteShade);
      R(x, y - RH, w, h, BG.desk);
      R(x, y - RH, w, 1, BG.tableWoodLight);
      R(x, y + h - RH, w, 1, BG.deskShade);
      // laptop (lid from behind), bell, a plant, papers
      R(x + 6, y - RH + 1, 8, 4, '#9aa3ad');
      R(x + 6, y - RH + 1, 8, 1, '#c7cbd1');
      R(x + w - 12, y - RH + 3, 3, 2, '#e9b865');
      R(x + w - 6, y - RH - 2, 4, 4, BG.plant);
      R(x + w - 5, y - RH + 2, 2, 2, BG.pot);
      R(x + 18, y - RH + 4, 5, 3, BG.paper);
    },
  });
}

/** Table with the soft-serve machine and snacks (klubovna, under the darts). */
export function snackDrawables(item, items) {
  const { x, y, w, h } = item;
  items.push({
    y: y + h,
    draw: () => {
      R(x + 1, y + h - 7, 1, 7, BG.chrome);
      R(x + w - 2, y + h - 7, 1, 7, BG.chrome);
      R(x, y - 7, w, h, BG.white);
      R(x, y + h - 7, w, 1, BG.whiteShade);
      // soft-serve machine
      R(x + 2, y - 17, 7, 11, '#e4e6e8');
      R(x + 2, y - 17, 7, 1, BG.paper);
      R(x + 3, y - 14, 5, 3, BG.chromeDark);
      R(x + 4, y - 11, 1, 2, '#d04f55');
      R(x + 6, y - 11, 1, 2, '#f8955e');
      R(x + 4, y - 8, 3, 1, BG.chromeDark);
      // snack bowls
      R(x + 10, y - 9, 5, 2, BG.paper);
      R(x + 10, y - 10, 1, 1, '#e9b865');
      R(x + 12, y - 10, 1, 1, '#d04f55');
      R(x + 14, y - 10, 1, 1, '#f8955e');
      R(x + 11, y - 6, 3, 2, '#8c6b45');
    },
  });
}

const PRINTER_H = 11;

export function printerDrawables(item, items) {
  const { x, y, w, h } = item;
  const PH = PRINTER_H;
  items.push({
    y: y + h,
    draw: () => {
      R(x, y + h - PH, w, PH, '#e7e7e3');
      for (let i = 0; i < 2; i++) R(x + 1, y + h - PH + 4 + i * 3, w - 2, 1, '#c9c9c4');
      R(x, y - PH, w, h, '#dcdcd8');
      R(x, y - PH, w, 1, '#f0f0ec');
      R(x + 2, y - PH + 2, w - 7, h - 4, '#c3c4c0'); // scanner lid
      R(x + w - 4, y - PH + 2, 3, 2, BG.monitor);
      R(x + w - 3, y - PH + 2, 1, 1, '#38b764');
      R(x + 3, y + h - PH - 1, 7, 2, BG.paper);
      R(x + 1, y + h - 1, w - 2, 1, '#b9b9b4');
    },
  });
}

/** Printer at work (someone stands at it): blinking light, scanner light sweeping, pages sliding out. */
export function printerBusyDrawable(item, t) {
  const { x, y, w, h } = item;
  const PH = PRINTER_H;
  return {
    y: y + h + 0.01,
    box: { x, y: y - PH - 4, w, h: h + PH + 4 },
    draw: () => {
      R(x + w - 3, y - PH + 2, 1, 1, Math.floor(t * 4) % 2 ? '#a7f070' : '#38b764');
      const sweep = Math.floor((t * 6) % (w - 7));
      R(x + 2 + sweep, y - PH + 2, 1, h - 4, 'rgba(167,240,112,0.55)');
      const out = (t * 1.5) % 1;
      R(x + 3, y + h - PH - 1 - Math.round(out * 3), 7, 2, BG.paper);
      R(x + 4, y + h - PH - 1 - Math.round(out * 3), 4, 1, '#c9c9c4');
    },
  };
}

/** Personal drawers along the side wall: white cabinet, drawer fronts on the room side. */
export function drawersDrawables(item, items) {
  const { x, y, w, h } = item;
  const DH = 9;
  items.push({
    y: y + h,
    draw: () => {
      R(x, y - DH, w, h, BG.white);
      R(x + w - 2, y - DH, 2, h, BG.whiteShade);
      for (let yy = y - DH + 4; yy < y + h - DH; yy += 4) {
        R(x, yy, w, 1, BG.whiteShade);
        R(x + w - 2, yy - 2, 1, 1, BG.chromeDark);
      }
      R(x, y + h - DH, w, DH, BG.white);
      R(x, y + h - DH, w, 1, BG.whiteShade);
      for (let i = 0; i < 3; i++) R(x + 1, y + h - DH + 2 + i * 2, w - 2, 1, BG.whiteShade);
    },
  });
}

/** Central sorted-waste bins (blue, yellow, green, grey). */
export function binsDrawables(item, items) {
  const { x, y, w, h } = item;
  const colors = [BG.binBlue, BG.binYellow, BG.binGreen, BG.binGrey];
  const n = Math.max(1, Math.floor(h / CELL));
  for (let i = 0; i < n; i++) {
    const by = y + i * CELL;
    const col = colors[i % colors.length];
    items.push({
      y: by + CELL,
      draw: () => {
        R(x, by - 6, w, CELL, col);
        R(x, by - 6, w, 1, 'rgba(255,255,255,0.35)');
        R(x, by - 2, w, 6, col);
        R(x, by - 2, w, 1, 'rgba(0,0,0,0.25)');
        R(x + Math.floor(w / 2) - 1, by, 2, 2, 'rgba(255,255,255,0.7)');
      },
    });
  }
}

/** Potted plant scaled to its footprint; tall leaves overlap what stands behind. */
export function plantDrawables(item, items, band) {
  const { x, y, w, h } = item;
  const cx = x + w / 2;
  const tall = item.box.r === band ? 12 : Math.max(12, w * 2 + h);
  items.push({
    y: y + h,
    draw: () => {
      R(cx - w / 2 + 1, y + h - 6, w - 2, 6, BG.pot);
      R(cx - w / 2 + 1, y + h - 6, w - 2, 1, BG.potShade);
      for (let i = 0; i < 14; i++) {
        const lx = Math.round(cx - w / 2 + noise(x * 13 + i) * w);
        const ly = Math.round(y + h - 6 - noise(y * 7 + i * 3) * tall);
        R(lx - 1, ly, 3, 2, i % 3 ? BG.plant : BG.plantDark);
        R(lx, ly + 2, 1, Math.max(1, y + h - 6 - ly - 2), BG.plantDark);
      }
      for (let i = 0; i < 8; i++) {
        const lx = Math.round(cx - w / 2 + noise(x * 5 + i * 9) * w);
        const ly = Math.round(y + h - 8 - noise(y + i * 11) * tall * 0.8);
        R(lx, ly, 2, 1, BG.plantLight);
      }
    },
  });
}

/** Coats on the hooks of the side wall, hanging above the pouf. */
export function hooksDrawables(item, items) {
  const colors = ['#2f3b52', '#5a5f3a', '#3a3b3f', '#b58a3c', '#7a3e2e', '#1e1f22', '#6b7f8c'];
  items.push({ y: item.y, draw: () => R(item.x + 2, item.y - 15, 1, item.h, BG.steelDark) });
  for (let i = 0; i * 8 < item.h - 4; i++) {
    const hy = item.y + i * 8 + 5;
    const col = colors[(i * 3) % colors.length];
    items.push({
      y: hy + 0.5,
      draw: () => {
        R(item.x + 2, hy - 16, 1, 2, BG.steel);
        R(item.x + 2, hy - 14, 4, 1, col);
        R(item.x + 2, hy - 13, 5, 8, col);
        R(item.x + 3, hy - 13, 1, 7, 'rgba(255,255,255,0.18)');
        R(item.x + 6, hy - 12, 1, 7, 'rgba(0,0,0,0.25)');
      },
    });
  }
}

