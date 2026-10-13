import { describe, expect, it } from 'vitest';
import { BOARD_SIZE, FLEET } from './constants.js';
import {
  allShipsSunk,
  createBoard,
  getShipCells,
  isFleetComplete,
  isInBounds,
  placeFleetRandomly,
  placeShip,
  validatePlacement,
} from './board.js';
import { createRng } from './rng.js';

const carrier = FLEET[0];
const destroyer = FLEET[4];

describe('ship placement', () => {
  it('places a valid horizontal and vertical ship', () => {
    let board = placeShip(createBoard(), carrier, 0, 0, 'horizontal');
    board = placeShip(board, destroyer, 5, 9, 'vertical');
    expect(board.ships[0].cells).toEqual(['0,0', '0,1', '0,2', '0,3', '0,4']);
    expect(board.ships[1].cells).toEqual(['5,9', '6,9']);
  });

  it('rejects overlapping ships', () => {
    const board = placeShip(createBoard(), carrier, 3, 2, 'horizontal');
    expect(validatePlacement(board, 1, 4, 3, 'vertical')).toMatchObject({ valid: false, reason: 'overlap' });
    expect(() => placeShip(board, destroyer, 3, 6, 'horizontal')).toThrow(/overlap/);
  });

  it('rejects out-of-bounds ships at every edge', () => {
    const board = createBoard();
    expect(validatePlacement(board, 0, 6, 5, 'horizontal').reason).toBe('out-of-bounds');
    expect(validatePlacement(board, 6, 0, 5, 'vertical').reason).toBe('out-of-bounds');
    expect(validatePlacement(board, -1, 0, 2, 'vertical').reason).toBe('out-of-bounds');
    expect(validatePlacement(board, 0, -1, 2, 'horizontal').reason).toBe('out-of-bounds');
    expect(validatePlacement(board, 0, 5, 5, 'horizontal').valid).toBe(true);
    expect(validatePlacement(board, 5, 0, 5, 'vertical').valid).toBe(true);
  });

  it('rejects diagonal / unknown orientations', () => {
    expect(validatePlacement(createBoard(), 0, 0, 3, 'diagonal')).toMatchObject({ valid: false, reason: 'orientation' });
  });

  it('rejects placing the same ship twice', () => {
    const board = placeShip(createBoard(), destroyer, 0, 0, 'horizontal');
    expect(() => placeShip(board, destroyer, 5, 5, 'horizontal')).toThrow(/already placed/);
  });

  it('getShipCells produces contiguous straight lines', () => {
    expect(getShipCells(2, 3, 3, 'vertical')).toEqual([
      [2, 3],
      [3, 3],
      [4, 3],
    ]);
  });
});

describe('random fleet placement', () => {
  it('always produces a complete, legal, non-overlapping fleet (500 seeds)', () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const board = placeFleetRandomly(createRng(seed));
      expect(isFleetComplete(board)).toBe(true);
      const all = board.ships.flatMap((s) => s.cells);
      expect(new Set(all).size).toBe(17);
      for (const ship of board.ships) {
        const coords = ship.cells.map((k) => k.split(',').map(Number));
        coords.forEach(([r, c]) => expect(isInBounds(r, c)).toBe(true));
        const rows = new Set(coords.map(([r]) => r));
        const cols = new Set(coords.map(([, c]) => c));
        // straight line: one row or one column, and contiguous
        expect(rows.size === 1 || cols.size === 1).toBe(true);
        const varying = rows.size === 1 ? coords.map(([, c]) => c) : coords.map(([r]) => r);
        expect(Math.max(...varying) - Math.min(...varying)).toBe(ship.length - 1);
      }
    }
  });

  it('is deterministic for the same seed', () => {
    expect(placeFleetRandomly(createRng(42))).toEqual(placeFleetRandomly(createRng(42)));
  });

  it('only counts in-bounds integer cells', () => {
    expect(isInBounds(BOARD_SIZE, 0)).toBe(false);
    expect(isInBounds(0.5, 0)).toBe(false);
  });

  it('an empty board is not "all sunk"', () => {
    expect(allShipsSunk(createBoard())).toBe(false);
  });
});
