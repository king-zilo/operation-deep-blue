import { describe, expect, it } from 'vitest';
import { receiveAttack } from './attack.js';
import { allShipsSunk } from './board.js';
import { shipCells, stackedFleetBoard } from './testUtils.js';

describe('attacks', () => {
  it('detects a miss', () => {
    const out = receiveAttack(stackedFleetBoard(), 1, 0);
    expect(out).toMatchObject({ valid: true, result: 'miss', ship: null });
    expect(out.board.shots['1,0']).toBe('miss');
  });

  it('detects a hit', () => {
    const out = receiveAttack(stackedFleetBoard(), 0, 2);
    expect(out).toMatchObject({ valid: true, result: 'hit' });
    expect(out.ship.id).toBe('carrier');
    expect(out.board.shots['0,2']).toBe('hit');
  });

  it('rejects duplicate attacks without changing the board', () => {
    const first = receiveAttack(stackedFleetBoard(), 4, 4);
    const second = receiveAttack(first.board, 4, 4);
    expect(second).toMatchObject({ valid: false, reason: 'duplicate' });
    expect(second.board).toBe(first.board);
  });

  it('rejects out-of-bounds attacks', () => {
    expect(receiveAttack(stackedFleetBoard(), 10, 0)).toMatchObject({ valid: false, reason: 'out-of-bounds' });
  });

  it('does not mutate the original board', () => {
    const board = stackedFleetBoard();
    receiveAttack(board, 0, 0);
    expect(board.shots).toEqual({});
  });

  it('reports sunk only when the last cell of a ship is hit', () => {
    let board = stackedFleetBoard();
    let out = receiveAttack(board, 8, 0); // destroyer at row 8, cols 0-1
    expect(out.result).toBe('hit');
    out = receiveAttack(out.board, 8, 1);
    expect(out.result).toBe('sunk');
    expect(out.ship.name).toBe('Destroyer');
    expect(out.fleetDestroyed).toBe(false);
  });

  it('final shot on the final ship reports fleetDestroyed', () => {
    let board = stackedFleetBoard();
    const cells = shipCells(board);
    let out;
    cells.forEach(([r, c], i) => {
      out = receiveAttack(board, r, c);
      board = out.board;
      expect(out.fleetDestroyed).toBe(i === cells.length - 1);
    });
    expect(out.result).toBe('sunk');
    expect(allShipsSunk(board)).toBe(true);
  });
});
