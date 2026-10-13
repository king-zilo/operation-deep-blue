import { FLEET } from './constants.js';
import { createBoard, placeShip } from './board.js';

// Fleet laid out on rows 0,2,4,6,8 starting at column 0 — easy to reason about in tests.
export function stackedFleetBoard() {
  return FLEET.reduce((board, ship, i) => placeShip(board, ship, i * 2, 0, 'horizontal'), createBoard());
}

export function shipCells(board) {
  return board.ships.flatMap((ship) => ship.cells.map((key) => key.split(',').map(Number)));
}
