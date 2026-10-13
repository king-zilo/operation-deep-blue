import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { createGame, gameReducer, PHASE, TURN } from '../engine/game.js';
import { randomSeed } from '../engine/rng.js';

export const AI_TURN_DELAY_MS = 850;

/**
 * Connects the pure game engine to React. The AI move is scheduled on a timer that is cancelled
 * whenever the turn, phase, or game changes (e.g. restart), and the reducer also ignores AI moves
 * tagged with an old gameId — two layers of protection against stale moves.
 */
export function useGame({ seed, nextSeed = randomSeed, aiDelay = AI_TURN_DELAY_MS } = {}) {
  const [state, dispatch] = useReducer(gameReducer, seed, (s) => createGame({ seed: s ?? nextSeed() }));

  const { phase, turn, gameId } = state;
  useEffect(() => {
    if (phase !== PHASE.BATTLE || turn !== TURN.AI) return undefined;
    const timer = setTimeout(() => dispatch({ type: 'AI_FIRE', gameId, now: Date.now() }), aiDelay);
    return () => clearTimeout(timer);
  }, [phase, turn, gameId, aiDelay]);

  const fire = useCallback((row, col) => dispatch({ type: 'PLAYER_FIRE', row, col, now: Date.now() }), []);
  const newGame = useCallback((s) => dispatch({ type: 'NEW_GAME', seed: s ?? nextSeed() }), [nextSeed]);
  const startBattle = useCallback(() => dispatch({ type: 'START_BATTLE', now: Date.now() }), []);
  const randomizeFleet = useCallback(() => dispatch({ type: 'RANDOMIZE_FLEET' }), []);
  const clearFleet = useCallback(() => dispatch({ type: 'CLEAR_FLEET' }), []);
  const placeShip = useCallback(
    (shipId, row, col, orientation) => dispatch({ type: 'PLACE_SHIP', shipId, row, col, orientation }),
    [],
  );
  const removeShip = useCallback((shipId) => dispatch({ type: 'REMOVE_SHIP', shipId }), []);

  const actions = useMemo(
    () => ({ fire, newGame, startBattle, randomizeFleet, clearFleet, placeShip, removeShip }),
    [fire, newGame, startBattle, randomizeFleet, clearFleet, placeShip, removeShip],
  );
  return [state, actions];
}
