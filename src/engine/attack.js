import { allShipsSunk, cellKey, isInBounds, isShipSunk, shipAt } from './board.js';

// Fires at a board. Never mutates; returns the new board plus what happened.
export function receiveAttack(board, row, col) {
  if (!isInBounds(row, col)) return { valid: false, reason: 'out-of-bounds', board };
  const key = cellKey(row, col);
  if (board.shots[key]) return { valid: false, reason: 'duplicate', board };

  const ship = shipAt(board, row, col);
  const next = { ...board, shots: { ...board.shots, [key]: ship ? 'hit' : 'miss' } };
  if (!ship) return { valid: true, board: next, result: 'miss', row, col, ship: null, fleetDestroyed: false };

  const sunk = isShipSunk(next, ship);
  return {
    valid: true,
    board: next,
    result: sunk ? 'sunk' : 'hit',
    row,
    col,
    ship,
    fleetDestroyed: sunk && allShipsSunk(next),
  };
}
