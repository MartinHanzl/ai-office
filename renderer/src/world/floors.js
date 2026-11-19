/** Both BlueGhost floors parsed from the ASCII plans (world/maps.js, generated from docs/office/layout.md). */
import { parseMap } from './map.js';
import { MAPS } from './maps.js';

export const FLOORS = {
  ground: parseMap(MAPS.ground, 'ground'),
  upper: parseMap(MAPS.upper, 'upper'),
};
