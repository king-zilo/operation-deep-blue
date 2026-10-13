import { BOARD_SIZE, FLEET, ORIENTATIONS } from './constants.js';
import { pickRandom } from './rng.js';

export const cellKey = (row, col) => `${row},${col}`;
export const parseKey = (key) => key.split(',').map(Number);

export const isInBounds = (row, col) =>
  Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

// A board is plain data: the ships on it and the shots it has received ("r,c" -> 'hit' | 'miss').
export function createBoard() {
  return { ships: [], shots: {} };
}

export function getShipCells(row, col, length, orientation) {
  const cells = [];
  for (let i = 0; i < length; i += 1) {
    cells.push(orientation === 'horizontal' ? [row, col + i] : [row + i, col]);
  }
  return cells;
}

export function validatePlacement(board, row, col, length, orientation) {
  if (!ORIENTATIONS.includes(orientation)) return { valid: false, reason: 'orientation' };
  const cells = getShipCells(row, col, length, orientation);
  if (cells.some(([r, c]) => !isInBounds(r, c))) return { valid: false, reason: 'out-of-bounds', cells };
  const occupied = new Set(board.ships.flatMap((ship) => ship.cells));
  if (cells.some(([r, c]) => occupied.has(cellKey(r, c)))) return { valid: false, reason: 'overlap', cells };
  return { valid: true, cells };
}

export function placeShip(board, shipDef, row, col, orientation) {
  if (board.ships.some((ship) => ship.id === shipDef.id)) {
    throw new Error(`Ship already placed: ${shipDef.id}`);
  }
  const check = validatePlacement(board, row, col, shipDef.length, orientation);
  if (!check.valid) throw new Error(`Invalid placement for ${shipDef.id}: ${check.reason}`);
  const ship = {
    id: shipDef.id,
    name: shipDef.name,
    length: shipDef.length,
    orientation,
    cells: check.cells.map(([r, c]) => cellKey(r, c)),
  };
  return { ...board, ships: [...board.ships, ship] };
}

export function removeShip(board, shipId) {
  return { ...board, ships: board.ships.filter((ship) => ship.id !== shipId) };
}

// Enumerates every legal spot and picks one, so it always terminates (no retry loops).
export function placeFleetRandomly(rng, fleet = FLEET, startBoard = createBoard()) {
  let board = startBoard;
  for (const shipDef of fleet) {
    if (board.ships.some((ship) => ship.id === shipDef.id)) continue;
    const options = [];
    for (const orientation of ORIENTATIONS) {
      for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
          if (validatePlacement(board, row, col, shipDef.length, orientation).valid) {
            options.push([row, col, orientation]);
          }
        }
      }
    }
    if (options.length === 0) throw new Error(`No room left for ${shipDef.id}`);
    const [row, col, orientation] = pickRandom(options, rng);
    board = placeShip(board, shipDef, row, col, orientation);
  }
  return board;
}

export function shipAt(board, row, col) {
  const key = cellKey(row, col);
  return board.ships.find((ship) => ship.cells.includes(key)) ?? null;
}

export function isShipSunk(board, ship) {
  return ship.cells.every((key) => board.shots[key] === 'hit');
}

export function allShipsSunk(board) {
  return board.ships.length > 0 && board.ships.every((ship) => isShipSunk(board, ship));
}

export function isFleetComplete(board, fleet = FLEET) {
  return fleet.every((def) => board.ships.some((ship) => ship.id === def.id));
}
