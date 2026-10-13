import { describe, expect, it } from 'vitest';
import { chooseAITarget, getAIView } from './ai.js';
import { receiveAttack } from './attack.js';
import { allShipsSunk, createBoard, placeFleetRandomly, placeShip } from './board.js';
import { FLEET } from './constants.js';
import { createRng } from './rng.js';

const fire = (board, r, c) => receiveAttack(board, r, c).board;
const isAdjacent = ([r1, c1], [r2, c2]) => Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;

describe('AI opponent', () => {
  it('never repeats an attack and eventually sinks every fleet (200 full games)', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const rng = createRng(seed);
      let board = placeFleetRandomly(createRng(seed * 7919));
      const seen = new Set();
      let shots = 0;
      while (!allShipsSunk(board)) {
        const t = chooseAITarget(getAIView(board), rng);
        const key = `${t.row},${t.col}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        const out = receiveAttack(board, t.row, t.col);
        expect(out.valid).toBe(true);
        board = out.board;
        shots += 1;
        expect(shots).toBeLessThanOrEqual(100);
      }
    }
  });

  it('is meaningfully better than random (average under 70 shots)', () => {
    let total = 0;
    const games = 100;
    for (let seed = 1; seed <= games; seed += 1) {
      const rng = createRng(seed);
      let board = placeFleetRandomly(createRng(seed + 1000));
      while (!allShipsSunk(board)) {
        const t = chooseAITarget(getAIView(board), rng);
        board = fire(board, t.row, t.col);
        total += 1;
      }
    }
    // Pure random averages ~96 shots; hunt/target with parity is typically ~60.
    expect(total / games).toBeLessThan(70);
  });

  it('hunts on a checkerboard when it has no leads', () => {
    const rng = createRng(3);
    const board = placeFleetRandomly(createRng(9));
    for (let i = 0; i < 20; i += 1) {
      const t = chooseAITarget(getAIView(board), rng);
      expect(t.mode).toBe('hunt');
      expect((t.row + t.col) % 2).toBe(0);
    }
  });

  it('targets a neighbouring cell after a hit', () => {
    let board = placeShip(createBoard(), FLEET[0], 4, 2, 'horizontal'); // 4,2..4,6
    board = fire(board, 4, 4);
    for (let seed = 0; seed < 30; seed += 1) {
      const t = chooseAITarget(getAIView(board), createRng(seed));
      expect(t.mode).toBe('target');
      expect(isAdjacent([t.row, t.col], [4, 4])).toBe(true);
    }
  });

  it('follows the line once two hits are aligned', () => {
    let board = placeShip(createBoard(), FLEET[0], 4, 2, 'horizontal');
    board = fire(board, 4, 4);
    board = fire(board, 4, 5);
    for (let seed = 0; seed < 30; seed += 1) {
      const t = chooseAITarget(getAIView(board), createRng(seed));
      expect([
        [4, 3],
        [4, 6],
      ]).toContainEqual([t.row, t.col]);
    }
  });

  it('reverses direction when one end of the line is a miss', () => {
    let board = placeShip(createBoard(), FLEET[0], 4, 2, 'horizontal');
    board = fire(board, 4, 4);
    board = fire(board, 4, 5);
    board = fire(board, 4, 6);
    board = fire(board, 4, 7); // miss: end of ship
    const t = chooseAITarget(getAIView(board), createRng(1));
    expect([t.row, t.col]).toEqual([4, 3]);
  });

  it('finishes a discovered ship before returning to hunt mode', () => {
    let board = placeShip(createBoard(), FLEET[1], 2, 2, 'vertical'); // 2..5,2
    board = placeShip(board, FLEET[4], 8, 8, 'horizontal');
    board = fire(board, 3, 2);
    const rng = createRng(11);
    let guard = 0;
    while (!board.ships[0].cells.every((k) => board.shots[k] === 'hit')) {
      const t = chooseAITarget(getAIView(board), rng);
      expect(t.mode).toBe('target');
      board = fire(board, t.row, t.col);
      guard += 1;
      expect(guard).toBeLessThan(10);
    }
    expect(chooseAITarget(getAIView(board), rng).mode).toBe('hunt');
  });

  it('only knows about sunk ships, not hidden ones', () => {
    let board = placeShip(createBoard(), FLEET[4], 0, 0, 'horizontal');
    board = placeShip(board, FLEET[2], 5, 5, 'horizontal');
    board = fire(board, 0, 0);
    expect(getAIView(board).sunkCells).toEqual([]);
    board = fire(board, 0, 1);
    expect(getAIView(board).sunkCells).toEqual(['0,0', '0,1']);
    expect(JSON.stringify(getAIView(board))).not.toContain('5,6');
  });

  it('returns null when the board is exhausted', () => {
    const shots = {};
    for (let r = 0; r < 10; r += 1) for (let c = 0; c < 10; c += 1) shots[`${r},${c}`] = 'miss';
    expect(chooseAITarget({ shots, sunkCells: [] }, createRng(1))).toBeNull();
  });
});
