import { BOARD_SIZE } from './constants.js';
import { cellKey, isInBounds, isShipSunk, parseKey } from './board.js';
import { pickRandom } from './rng.js';

const DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

// What the AI is allowed to know: where it has fired, the results, and which cells belong to
// ships it has already sunk (the game announces sinkings). It never sees un-hit ship positions.
export function getAIView(board) {
  const sunkCells = board.ships.filter((ship) => isShipSunk(board, ship)).flatMap((ship) => ship.cells);
  return { shots: board.shots, sunkCells };
}

// Hits that belong to ships which are still afloat — these are the AI's "leads".
export function getOpenHits(view) {
  const sunk = new Set(view.sunkCells);
  return Object.entries(view.shots)
    .filter(([key, result]) => result === 'hit' && !sunk.has(key))
    .map(([key]) => parseKey(key));
}

// If two or more open hits line up, the ship must lie along that line: extend from both ends.
function lineTargets(openHits, isTried) {
  const hitSet = new Set(openHits.map(([r, c]) => cellKey(r, c)));
  let best = [];
  let bestLength = 1;
  for (const [r, c] of openHits) {
    for (const [dr, dc] of [
      [0, 1],
      [1, 0],
    ]) {
      if (hitSet.has(cellKey(r - dr, c - dc))) continue; // only measure from the start of a segment
      let length = 1;
      while (hitSet.has(cellKey(r + dr * length, c + dc * length))) length += 1;
      if (length < 2) continue;
      const ends = [
        [r - dr, c - dc],
        [r + dr * length, c + dc * length],
      ].filter(([er, ec]) => isInBounds(er, ec) && !isTried(er, ec));
      if (ends.length === 0) continue;
      if (length > bestLength) {
        best = ends;
        bestLength = length;
      } else if (length === bestLength) {
        best.push(...ends);
      }
    }
  }
  return best;
}

function neighbourTargets(openHits, isTried) {
  const seen = new Set();
  const targets = [];
  for (const [r, c] of openHits) {
    for (const [dr, dc] of DIRECTIONS) {
      const nr = r + dr;
      const nc = c + dc;
      const key = cellKey(nr, nc);
      if (isInBounds(nr, nc) && !isTried(nr, nc) && !seen.has(key)) {
        seen.add(key);
        targets.push([nr, nc]);
      }
    }
  }
  return targets;
}

/**
 * Hunt-and-target AI.
 *  - TARGET mode (there is an unsunk hit): extend a line of hits if one exists, otherwise try the
 *    cells next to a hit. This finishes off a discovered ship before searching elsewhere.
 *  - HUNT mode: pick a random untried cell, preferring a checkerboard pattern (every ship is at
 *    least 2 long, so it must cover one of these cells).
 * Returns { row, col, mode } or null if every cell has been tried.
 */
export function chooseAITarget(view, rng) {
  const isTried = (r, c) => Boolean(view.shots[cellKey(r, c)]);
  const openHits = getOpenHits(view);

  if (openHits.length > 0) {
    const line = lineTargets(openHits, isTried);
    if (line.length > 0) {
      const [row, col] = pickRandom(line, rng);
      return { row, col, mode: 'target' };
    }
    const neighbours = neighbourTargets(openHits, isTried);
    if (neighbours.length > 0) {
      const [row, col] = pickRandom(neighbours, rng);
      return { row, col, mode: 'target' };
    }
  }

  const untried = [];
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      if (!isTried(r, c)) untried.push([r, c]);
    }
  }
  if (untried.length === 0) return null;
  const checkerboard = untried.filter(([r, c]) => (r + c) % 2 === 0);
  const [row, col] = pickRandom(checkerboard.length > 0 ? checkerboard : untried, rng);
  return { row, col, mode: 'hunt' };
}
