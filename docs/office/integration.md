# Integration contract: BlueGhost floors in the live app

Step 4 of the office redesign (see `brief.md`, `layout.md` v6, `preview/`). The ASCII maps in `layout.md`
are the single source of truth; `scripts/sync-maps.js` copies them into `renderer/src/world/maps.js`,
`renderer/src/world/map.js` parses them, `renderer/src/world/floors.js` exposes both parsed floors.

Three agents work on it. Phase 1 runs two of them in parallel with disjoint file ownership; this file is the
interface they both code against. Phase 2 wires everything together. Nobody commits.

| Agent | Owns (exclusive) |
|---|---|
| **W – world & entities** | `renderer/src/world/**`, `renderer/src/entities/**`, `renderer/src/state.js`, `renderer/src/life/cat.js`, `renderer/src/life/robot.js`, `test/layout.test.mjs`, `test/map.test.mjs`, `test/path.test.mjs`, `test/mood.test.mjs` |
| **D – drawing & poses** | `renderer/src/draw/**`, `renderer/src/loop.js`, `renderer/src/preview.js`, `renderer/src/core/palette.js`, `renderer/src/core/canvas.js`, `renderer/src/life/lighting.js`, `renderer/src/life/particles.js`, `renderer/src/life/index.js` |
| **I – integration** (phase 2) | `renderer/src/main.js`, `renderer/src/events.js`, `renderer/src/ui/**`, `renderer/src/content/texts.js`, `renderer/src/chat/**`, `renderer/src/todo/**`, `README.md`, `scripts/**`, `src/**`, `index.html`, `style.css`, plus fixes anywhere after phase 1 |

## Coordinates and floors

- Logical canvas 320×180 px, one floor shown at a time. Floor names: `'ground'`, `'upper'`. Default floor `'upper'`.
- Map cell (c, r) covers x 4c..4c+3, y 4r..4r+3; a spot's point is the cell centre (4c+2, 4r+2).
- A person's (x, y) is the feet point, as today. `person.floor` says which floor they are on.
- `state.floor` (in `state.js`) is the floor currently displayed. Only people with `person.floor === state.floor`
  are drawn, plus people on the stairs whose `stairs.floor === state.floor`.

## World API – `renderer/src/world/layout.js` (owner W)

Keep the module path so existing imports survive. Everything below is exported.

```js
export const SPEED = 60;                        // px/s, unchanged
export const FLOOR_NAMES = ['ground', 'upper'];
export const DEFAULT_FLOOR = 'upper';
export const floors = { ground: Floor, upper: Floor };
// Floor = {
//   name, map /* parseMap() result */, grid, floorY,
//   route(from, to, opts), isWalkable(x, y), randomPoint(area?),
//   openAreas: rect[], chatPairs: [[spot, spot]...],
//   stairs: { x, y },            // the Z cell centre on this floor (portal)
//   entry?: { x, y },            // ground: courtyard gate E
//   door?: { x, y },             // ground: entrance door cell on the chamfer
//   taskBoard?, planBoard?, tv?  // px rects { x, y, w, h } of wall items (upper: X, P, V; ground: V above reception)
// }
export const ENTRY = { x, y, floor: 'ground' }; // where people appear and leave
export const DOOR = ENTRY;                      // deprecated alias for untouched modules
export const DESKS = [ /* upper desk seats */ ];
// desk seat = { id, floor: 'upper', x, y, facing: 'left'|'right'|'front'|'back', kind: 'desk',
//               desk: { x, y, w, h },  // px rect of the desk top this seat uses (for screens)
//               seed, owner }
export const IDLE_POOLS = { coffee, sofa, window, booth, cafe, stool, pouf };
// each: seat[] = { x, y, floor, facing, kind: 'coffee'|'sofa'|'armchair'|'window'|'booth'|'cafe'|'stool'|'pouf', owner }
// coffee = ground bar `$` spots (standing, facing back); sofa = upper chill sofas + armchairs, ground klubovna sofa,
// under-stairs sofa; window = upper `w` (standing, facing front = looking out at the viewer); booth = the 3 booth seats;
// cafe = klubovna table seats; stool = bar stools; pouf = pouf seats.
export const BOARD = [ /* upper `m` spots */ ];   // plan-mode meeting spots { x, y, floor: 'upper', owner }
export const TASK_BOARD = { x, y, w, h };          // px rect of X on the upper back wall
export const PLAN_BOARD = { x, y, w, h };          // px rect of P
export const TVS = { reception: rect, meeting: rect };
export const OFFICE_AREAS = [ /* upper meeting-room floor rects */ ];
export const OFFICE_SPOTS = { board: {x,y}, tv: {x,y}, glass: {x,y} };  // director stops, all floor 'upper'
export function randomOfficePoint();
export function randomFloorPoint(area = null, floor = DEFAULT_FLOOR);
export function isWalkable(x, y, floor);
export function route(from, to, opts);         // same floor only; floor taken from from.floor ?? to.floor ?? DEFAULT_FLOOR
export function chatPair(busy = [], floor = DEFAULT_FLOOR);
export function claimSeat(worker);             // upper desks first; overflow: cafe tables, then sofas; returns a seat
export function releaseSeat(worker);
export function internSpot(seat, slot);        // on free floor next to the seat, on the side away from the desk
export const CHAT_PAIRS = floors.upper.chatPairs; // for window.__office
```

Rules: every spot object carries `floor`. Nothing in `layout.js` is hard-coded in px; it is all derived from the maps.

## People and stairs (owner W, drawn by D)

- `Person.walkTo(loc, onArrive, opts)` accepts `loc.floor`. Same floor: as today. Other floor: walk to this floor's
  `stairs`, then set `person.stairs = { floor: <current>, dir: 'up'|'down', progress: 0 }`; progress runs 0→1 in about
  2.5 s; at 0.5 `person.floor` flips and `stairs.floor` flips; at 1 the person stands on the other floor's `stairs`
  point and continues to `loc`. `person.walking` is true throughout. `person.x/y` during the climb = the point
  `stairsPoint(floorName, dir, progress)` returns; it lives in the pure module `renderer/src/world/stairs.js`
  (owner W, derived from the map's stairs/opening rects: ground = along the flight from Z up to the west end rising
  ~40 px; upper = from the opening's west end up onto Z) and D imports it so drawing and movement agree. While
  climbing, D draws the person with the walking pose, view `back` when going up and `front` when going down,
  clipped by the floor edge / opening as the structure drawing requires.
- Arrival: a new worker starts at `ENTRY` on the ground floor and walks gate → door → hall → stairs → desk.
  Leaving: the reverse, then gone. Interns follow their boss across floors.
- Idle behaviours pick spots on any floor; the walk handles the stairs. The director stays on the upper floor
  (meeting room: `OFFICE_AREAS`, `OFFICE_SPOTS`); his task board is on the wall (no cabinet beat; replace it with a
  `tv` beat: watches the meeting-room TV).
- Workers at `BOARD` spots face the plan board (back view); at `coffee` they face the bar (back view); at `window`
  they face the viewer (front view).

## Poses and depth (owner D)

`figure()` gains a seated profile pose: `{ view: 'left'|'right', seated: true, arms, animate, t }` (legs to the
side, hands toward the desk). Existing `front`/`back` seated poses stay. `people.js` picks the pose from
`seat.kind` + `seat.facing`:

| kind | facing | pose | depth / layering |
|---|---|---|---|
| desk | left/right | seated profile, screen work arms | drawn after the desk top; chair under the sitter |
| desk | front | seated front | behind the desk: feet hidden by the desk top (drawn before the desk) |
| desk | back | seated back | in front of the desk, chair back drawn over the sitter |
| sofa/armchair/pouf | per facing | seated | upholstery before/after per existing `sofaDrawables` rules |
| stool | back | seated back, 2 px higher | stool drawn under |
| booth | front | seated front | inside the booth, glass front drawn over |
| cafe | front/back | seated | café chair |
| coffee / window / meeting / chat / stand | – | standing, as today | – |

`renderer/src/draw/office/furniture.js#seatPose(seat)` returns `{ dx, dy, depth }` for every kind above.
`loop.js` draws: cached static layer of `state.floor` → dynamic items sorted by depth (furniture that depends on
state, people, interns, director, cat, particles) → lamps/beams → darkness with lights → floor switch arrows
with the count of people on the other floor → overlay (bubbles, name tags, empty-office message).

Dynamic elements D must wire: desk screens (activity per desk; profile desks get a narrow side-view screen),
printer busy when someone stands at its `+` spot, reception TV (clock, date, limits bars, strike notice),
meeting-room TV (plan-mode diagram when a meeting runs, else BlueGhost screensaver), task board (director's
to-dos, as today but at `TASK_BOARD`), plan board diagram, employee-of-the-week portrait, LED sign glow and
lamps at night, courtyard sky by hour.

Static layer cache: one offscreen canvas per (floor, lighting bucket, canvas size); invalidated on resize.

## UI (owner I)

- Floor switch: arrows at x 4, y 164, 24×12 px (▲ upper, ▼ ground) drawn by D, clickable (I); keys PageUp/PageDown
  and ↑/↓ when no text field is focused. Badge: number of people on the other floor.
- Tooltip hit test only on the displayed floor; task board/director clicks only when the upper floor is shown.
- Compact (tray) mode shows `state.floor` too (default upper), arrows work there.
- Branding: "Papírna Svišť" → BlueGhost in `texts.js`, README; README gets a section on the two floors.

## Verification

- `npm run lint`, `npm run test:unit` (W and D run these; D also `npm run preview`). Only I runs `npm test`
  (includes the Electron smoke test) and the app with `npm run demo` to check seating on both floors visually.
- Deviations from this contract go into the agent's report so the integrator can reconcile them.
