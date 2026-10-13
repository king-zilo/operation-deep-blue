import { isShipSunk } from './board.js';
import { ASSESSMENTS } from './dialogue.js';

export const RANKS = ['Deckhand', 'Ensign', 'Lieutenant', 'Commander', 'Fleet Admiral'];

export function calcAccuracy(hits, shots) {
  return shots > 0 ? Math.round((hits / shots) * 100) : 0;
}

export function countSunk(board) {
  return board.ships.filter((ship) => isShipSunk(board, ship)).length;
}

export function countAfloat(board) {
  return board.ships.length - countSunk(board);
}

// Percentage of the fleet's cells that have not been hit.
export function fleetIntegrity(board) {
  const total = board.ships.reduce((sum, ship) => sum + ship.length, 0);
  if (total === 0) return 100;
  const damaged = board.ships.reduce(
    (sum, ship) => sum + ship.cells.filter((key) => board.shots[key] === 'hit').length,
    0,
  );
  return Math.round(((total - damaged) / total) * 100);
}

export function determineRank({ won, accuracy, enemyShipsSunk, friendlyShipsRemaining }) {
  if (won) {
    if (accuracy >= 65 && friendlyShipsRemaining >= 3) return 'Fleet Admiral';
    if (accuracy >= 50) return 'Commander';
    if (accuracy >= 35) return 'Lieutenant';
    return 'Ensign';
  }
  if (enemyShipsSunk >= 4 && accuracy >= 40) return 'Lieutenant';
  if (enemyShipsSunk >= 2) return 'Ensign';
  return 'Deckhand';
}

export function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function buildDebrief(state) {
  const won = state.winner === 'player';
  const { playerShots, playerHits } = state.stats;
  const accuracy = calcAccuracy(playerHits, playerShots);
  const enemyShipsSunk = countSunk(state.enemyBoard);
  const friendlyShipsRemaining = countAfloat(state.playerBoard);
  const rank = determineRank({ won, accuracy, enemyShipsSunk, friendlyShipsRemaining });
  const durationMs = state.startedAt != null && state.endedAt != null ? state.endedAt - state.startedAt : 0;
  return {
    outcome: won ? 'victory' : 'defeat',
    shots: playerShots,
    hits: playerHits,
    accuracy,
    enemyShipsSunk,
    enemyShipsTotal: state.enemyBoard.ships.length,
    friendlyShipsRemaining,
    friendlyShipsTotal: state.playerBoard.ships.length,
    durationMs,
    duration: formatDuration(durationMs),
    rank,
    assessment: ASSESSMENTS[won ? 'victory' : 'defeat'][rank],
  };
}
