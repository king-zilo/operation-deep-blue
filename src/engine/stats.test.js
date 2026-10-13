import { describe, expect, it } from 'vitest';
import { buildDebrief, calcAccuracy, determineRank, fleetIntegrity, formatDuration, RANKS } from './stats.js';
import { receiveAttack } from './attack.js';
import { ASSESSMENTS } from './dialogue.js';
import { stackedFleetBoard } from './testUtils.js';

describe('stats', () => {
  it('calculates accuracy, including zero shots', () => {
    expect(calcAccuracy(0, 0)).toBe(0);
    expect(calcAccuracy(17, 17)).toBe(100);
    expect(calcAccuracy(1, 3)).toBe(33);
    expect(calcAccuracy(2, 3)).toBe(67);
  });

  it('calculates fleet integrity from hit cells', () => {
    let board = stackedFleetBoard();
    expect(fleetIntegrity(board)).toBe(100);
    board = receiveAttack(board, 0, 0).board;
    board = receiveAttack(board, 9, 9).board; // miss doesn't count
    expect(fleetIntegrity(board)).toBe(Math.round((16 / 17) * 100));
  });

  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65_400)).toBe('1:05');
    expect(formatDuration(-5)).toBe('0:00');
  });

  it('assigns ranks across the full range', () => {
    expect(determineRank({ won: true, accuracy: 80, friendlyShipsRemaining: 5 })).toBe('Fleet Admiral');
    expect(determineRank({ won: true, accuracy: 80, friendlyShipsRemaining: 1 })).toBe('Commander');
    expect(determineRank({ won: true, accuracy: 40, friendlyShipsRemaining: 5 })).toBe('Lieutenant');
    expect(determineRank({ won: true, accuracy: 20, friendlyShipsRemaining: 5 })).toBe('Ensign');
    expect(determineRank({ won: false, accuracy: 45, enemyShipsSunk: 4 })).toBe('Lieutenant');
    expect(determineRank({ won: false, accuracy: 10, enemyShipsSunk: 2 })).toBe('Ensign');
    expect(determineRank({ won: false, accuracy: 10, enemyShipsSunk: 0 })).toBe('Deckhand');
  });

  it('has an assessment for every rank and outcome', () => {
    for (const rank of RANKS) {
      expect(ASSESSMENTS.victory[rank]).toBeTruthy();
      expect(ASSESSMENTS.defeat[rank]).toBeTruthy();
    }
  });

  it('builds a debrief purely from game state', () => {
    let enemyBoard = stackedFleetBoard();
    let playerBoard = stackedFleetBoard();
    // sink enemy destroyer (row 8) + one hit on carrier, 2 misses
    for (const [r, c] of [
      [8, 0],
      [8, 1],
      [0, 0],
      [9, 9],
      [9, 8],
    ])
      enemyBoard = receiveAttack(enemyBoard, r, c).board;
    playerBoard = receiveAttack(playerBoard, 8, 0).board;
    playerBoard = receiveAttack(playerBoard, 8, 1).board;
    const debrief = buildDebrief({
      winner: 'ai',
      stats: { playerShots: 5, playerHits: 3, aiShots: 2, aiHits: 2 },
      enemyBoard,
      playerBoard,
      startedAt: 1_000,
      endedAt: 126_000,
    });
    expect(debrief).toMatchObject({
      outcome: 'defeat',
      shots: 5,
      hits: 3,
      accuracy: 60,
      enemyShipsSunk: 1,
      friendlyShipsRemaining: 4,
      duration: '2:05',
      rank: 'Deckhand',
      assessment: ASSESSMENTS.defeat.Deckhand,
    });
  });
});
