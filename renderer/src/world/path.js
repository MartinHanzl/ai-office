/**
 * Walkable grid and path finding (A* with per-walk random cost noise, line-of-sight smoothing
 * and an optional random detour), so people never take the same route twice. Pure module,
 * no DOM: unit-tested in test/path.test.mjs.
 */

export const CELL = 4;

/**
 * @param {{ width: number, height: number, minY: number, obstacles: {x:number,y:number,w:number,h:number}[], margin?: number }} spec
 */
export function createGrid({ width, height, minY, obstacles, margin = 3 }) {
  const cols = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);
  const open = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * CELL + CELL / 2;
      const y = r * CELL + CELL / 2;
      if (y < minY || y > height - margin || x < margin || x > width - margin) continue;
      if (obstacles.some((o) => x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h)) continue;
      open[r * cols + c] = 1;
    }
  }
  return { cols, rows, open, width, height };
}

const cellOf = (grid, x, y) => [Math.floor(x / CELL), Math.floor(y / CELL)];

export function walkable(grid, x, y) {
  const [c, r] = cellOf(grid, x, y);
  if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) return false;
  return grid.open[r * grid.cols + c] === 1;
}

/** Nearest walkable cell centre (spiral search); targets like sofa seats sit inside furniture. */
export function nearestWalkable(grid, x, y) {
  const [c0, r0] = cellOf(grid, x, y);
  for (let rad = 0; rad < 12; rad++) {
    let best = null;
    let bestD = Infinity;
    for (let r = r0 - rad; r <= r0 + rad; r++) {
      for (let c = c0 - rad; c <= c0 + rad; c++) {
        if (Math.max(Math.abs(r - r0), Math.abs(c - c0)) !== rad) continue;
        if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows || !grid.open[r * grid.cols + c]) continue;
        const cx = c * CELL + CELL / 2;
        const cy = r * CELL + CELL / 2;
        const d = Math.hypot(cx - x, cy - y);
        if (d < bestD) {
          bestD = d;
          best = { x: cx, y: cy };
        }
      }
    }
    if (best) return best;
  }
  return null;
}

/** Straight segment stays on walkable cells (sampled every pixel). */
export function lineOfSight(grid, a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(d));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!walkable(grid, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
  }
  return true;
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** A* between two walkable points; `noise` (0 = shortest path) makes cells randomly more expensive. */
function astar(grid, a, b, noise, rng) {
  const { cols, rows, open } = grid;
  const [sc, sr] = cellOf(grid, a.x, a.y);
  const [gc, gr] = cellOf(grid, b.x, b.y);
  const start = sr * cols + sc;
  const goal = gr * cols + gc;
  if (start === goal) return [a, b];
  const n = cols * rows;
  const weight = new Float32Array(n);
  for (let i = 0; i < n; i++) weight[i] = 1 + noise * rng();
  const g = new Float32Array(n).fill(Infinity);
  const from = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const h = (i) => Math.hypot((i % cols) - gc, Math.floor(i / cols) - gr);
  // binary heap of [f, index]
  const heap = [];
  const push = (f, i) => {
    heap.push([f, i]);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p][0] <= heap[k][0]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };
  g[start] = 0;
  push(h(start), start);
  while (heap.length) {
    const [, cur] = pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cc = cur % cols;
    const cr = Math.floor(cur / cols);
    for (const [dc, dr] of DIRS) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const ni = nr * cols + nc;
      if (!open[ni] || closed[ni]) continue;
      // no corner cutting past furniture
      if (dc && dr && (!open[cr * cols + nc] || !open[nr * cols + cc])) continue;
      const cost = g[cur] + (dc && dr ? Math.SQRT2 : 1) * weight[ni];
      if (cost < g[ni]) {
        g[ni] = cost;
        from[ni] = cur;
        push(cost + h(ni), ni);
      }
    }
  }
  if (from[goal] === -1) return null;
  const cells = [];
  for (let i = goal; i !== -1; i = from[i]) cells.push(i);
  cells.reverse();
  const pts = cells.map((i) => ({ x: (i % cols) * CELL + CELL / 2, y: Math.floor(i / cols) * CELL + CELL / 2 }));
  pts[0] = a;
  pts[pts.length - 1] = b;
  return pts;
}

/** Drop points that can be skipped in a straight line – natural diagonals instead of grid steps. */
export function smooth(grid, pts) {
  if (pts.length <= 2) return pts;
  const out = [pts[0]];
  let anchor = 0;
  while (anchor < pts.length - 1) {
    let next = anchor + 1;
    for (let j = pts.length - 1; j > anchor + 1; j--) {
      if (lineOfSight(grid, pts[anchor], pts[j])) {
        next = j;
        break;
      }
    }
    out.push(pts[next]);
    anchor = next;
  }
  return out;
}

const length = (pts) => pts.reduce((n, p, i) => (i ? n + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);

/** Random walkable point, optionally inside a rectangle. */
export function randomPoint(grid, rng = Math.random, area = null) {
  const x0 = area?.x ?? 0;
  const y0 = area?.y ?? 0;
  const w = area?.w ?? grid.width;
  const h = area?.h ?? grid.height;
  for (let i = 0; i < 60; i++) {
    const x = x0 + rng() * w;
    const y = y0 + rng() * h;
    if (walkable(grid, x, y)) return { x: Math.round(x), y: Math.round(y) };
  }
  return null;
}

/**
 * Path from `from` to `to` (both may lie inside furniture, e.g. a chair or sofa seat).
 * Every call differs: cell costs are noisy and longer walks may detour through a random point.
 * Returns the waypoints after `from`, ending exactly at `to`.
 */
export function findPath(grid, from, to, { rng = Math.random, noise = 0.8, detour = 0.5 } = {}) {
  const a = nearestWalkable(grid, from.x, from.y);
  const b = nearestWalkable(grid, to.x, to.y);
  if (!a || !b) return [{ x: to.x, y: to.y }];
  const direct = Math.hypot(b.x - a.x, b.y - a.y);
  let core = null;
  if (direct > 40 && rng() < detour) {
    // a detour through a random point roughly between both ends, at most ~45 % longer
    for (let i = 0; i < 6 && !core; i++) {
      const via = randomPoint(grid, rng, {
        x: Math.min(a.x, b.x) - 30, y: Math.min(a.y, b.y) - 25,
        w: Math.abs(a.x - b.x) + 60, h: Math.abs(a.y - b.y) + 50,
      });
      if (!via || Math.hypot(via.x - a.x, via.y - a.y) + Math.hypot(b.x - via.x, b.y - via.y) > direct * 1.45) continue;
      const p1 = astar(grid, a, via, noise, rng);
      const p2 = p1 && astar(grid, via, b, noise, rng);
      if (p2) core = [...smooth(grid, p1), ...smooth(grid, p2).slice(1)];
    }
  }
  if (!core) {
    const p = astar(grid, a, b, noise, rng);
    core = p ? smooth(grid, p) : [a, b];
  }
  const pts = [...core];
  if (Math.hypot(from.x - a.x, from.y - a.y) < 0.5) pts.shift();
  pts.push({ x: to.x, y: to.y });
  return pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) > 0.1);
}

export const pathLength = length;
