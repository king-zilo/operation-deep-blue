import { PHASE, TURN } from '../engine/game.js';

export function turnStatus(state) {
  if (state.phase === PHASE.PLACEMENT) return { text: 'Deploying fleet', tone: 'idle' };
  if (state.phase === PHASE.GAME_OVER)
    return state.winner === 'player'
      ? { text: 'Victory — enemy fleet destroyed', tone: 'win' }
      : { text: 'Defeat — fleet lost', tone: 'lose' };
  return state.turn === TURN.PLAYER
    ? { text: 'Your turn — select a target', tone: 'player' }
    : { text: 'Admiral Byte is targeting…', tone: 'ai' };
}
