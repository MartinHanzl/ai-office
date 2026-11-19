/**
 * The flight between the two floors: where a person on the stairs stands. Pure module (no DOM), shared
 * by the movement (entities/person.js) and the drawing, so both agree. Derived from the plans: the
 * ground flight `S` rises from its portal `Z` at the east end to its west end; upstairs the person comes
 * up through the west part of the opening `~` and steps onto that floor's `Z`.
 *
 * A climb runs `progress` 0 → 1 in STAIRS_SECONDS. Going up, the ground half comes first (0 – 0.5) and the
 * upper half second (0.5 – 1); going down the other way round. The floor flips at 0.5.
 */
import { FLOORS } from './floors.js';
import { CELL } from './map.js';

/** How long one climb takes (s). */
export const STAIRS_SECONDS = 2.5;

/** Drawn rise of the whole ground flight (17 treads × ~2.6 px, as draw/office/structure.js draws them). */
export const STAIRS_RISE = 11 * CELL;

/** Horizontal run of the last treads seen through the opening upstairs. */
const UPPER_RUN = 6 * CELL;

const portal = (m) => {
  const z = m.spots.find((s) => s.kind === 'stairs');
  return { x: z.x, y: z.y };
};

const flight = FLOORS.ground.of('stairs')[0];
const opening = FLOORS.upper.of('opening')[0];
const groundZ = portal(FLOORS.ground);
const upperZ = portal(FLOORS.upper);
const groundTop = { x: flight.x + CELL / 2, y: groundZ.y - STAIRS_RISE };
/** Drawn rise per px of run (the same slope on both floors). */
const slope = STAIRS_RISE / (groundZ.x - groundTop.x);
const upperX = opening.x + UPPER_RUN - CELL / 2;

/**
 * Both ends of the visible part of the flight on each floor (`bottom` = where a climber going up starts
 * on that floor, `top` = where they leave it). Ground: Z → west end, rising. Upper: below the floor in the
 * opening → Z (the feet sit lower on screen the deeper they are).
 */
export const STAIRS = {
  ground: { bottom: groundZ, top: groundTop },
  upper: { bottom: { x: upperX, y: upperZ.y + Math.round((upperX - upperZ.x) * slope) }, top: upperZ },
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * Feet point of a person on the stairs.
 * @param {'ground'|'upper'} floorName floor the person is shown on (`person.stairs.floor`)
 * @param {'up'|'down'} dir
 * @param {number} progress 0 → 1 over the whole climb (values outside this floor's half clamp to its ends)
 * @returns {{ x: number, y: number }}
 */
export function stairsPoint(floorName, dir, progress) {
  const flightOf = STAIRS[floorName] ?? STAIRS.ground;
  // going up the ground half is walked first, going down the upper half
  const first = (dir === 'up') === (floorName === 'ground');
  const p = clamp01(progress);
  const s = clamp01(first ? p * 2 : p * 2 - 1);
  const [a, b] = dir === 'up' ? [flightOf.bottom, flightOf.top] : [flightOf.top, flightOf.bottom];
  return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s };
}
