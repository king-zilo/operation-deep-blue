import { FLEET, coordLabel } from './constants.js';
import { createBoard, isFleetComplete, placeFleetRandomly, placeShip, removeShip, validatePlacement } from './board.js';
import { receiveAttack } from './attack.js';
import { chooseAITarget, getAIView } from './ai.js';
import { formatLine, pickLine } from './dialogue.js';
import { createRng } from './rng.js';

export const PHASE = { PLACEMENT: 'placement', BATTLE: 'battle', GAME_OVER: 'gameOver' };
export const TURN = { PLAYER: 'player', AI: 'ai' };
const MAX_COMMS = 4;

function withComms(state, rng, event, vars) {
  const { index, text } = pickLine(event, rng, state.lastLineIndex[event]);
  const seq = state.eventSeq;
  return {
    ...state,
    lastLineIndex: { ...state.lastLineIndex, [event]: index },
    comms: [{ id: seq, event, text: formatLine(text, vars) }, ...state.comms].slice(0, MAX_COMMS),
  };
}

function withLog(state, entry) {
  return { ...state, log: [{ id: state.eventSeq, ...entry }, ...state.log] };
}

export function createGame({ seed, gameId = 1 }) {
  const rng = createRng(seed);
  const enemyBoard = placeFleetRandomly(rng);
  const playerBoard = placeFleetRandomly(rng);
  let state = {
    gameId,
    phase: PHASE.PLACEMENT,
    turn: TURN.PLAYER,
    winner: null,
    playerBoard,
    enemyBoard,
    stats: { playerShots: 0, playerHits: 0, aiShots: 0, aiHits: 0 },
    startedAt: null,
    endedAt: null,
    log: [],
    comms: [],
    lastShot: { player: null, ai: null },
    lastEvent: null,
    eventSeq: 1,
    lastLineIndex: {},
    rngState: 0,
  };
  state = withComms(state, rng, 'gameStart');
  return { ...state, eventSeq: state.eventSeq + 1, rngState: rng.state };
}

function resolveShot(state, actor, outcome, now, rng) {
  const isPlayer = actor === TURN.PLAYER;
  const target = coordLabel(outcome.row, outcome.col);
  const shipName = outcome.ship?.name ?? null;
  const hit = outcome.result !== 'miss';

  const stats = { ...state.stats };
  if (isPlayer) {
    stats.playerShots += 1;
    if (hit) stats.playerHits += 1;
  } else {
    stats.aiShots += 1;
    if (hit) stats.aiHits += 1;
  }

  const event = {
    seq: state.eventSeq,
    actor,
    row: outcome.row,
    col: outcome.col,
    result: outcome.result,
    shipId: outcome.ship?.id ?? null,
    shipName,
    shipCells: outcome.result === 'sunk' ? outcome.ship.cells : null,
    fleetDestroyed: outcome.fleetDestroyed,
  };

  let next = {
    ...state,
    stats,
    [isPlayer ? 'enemyBoard' : 'playerBoard']: outcome.board,
    lastEvent: event,
    lastShot: { ...state.lastShot, [actor]: event },
  };

  const who = isPlayer ? 'You fire at' : 'Admiral Byte fires at';
  let text;
  if (outcome.result === 'miss') text = `${who} ${target} — miss.`;
  else if (outcome.result === 'hit') text = `${who} ${target} — HIT!`;
  else text = isPlayer ? `${who} ${target} — enemy ${shipName} SUNK!` : `${who} ${target} — your ${shipName} SUNK!`;
  next = withLog(next, { actor, kind: outcome.result, text });

  let dialogueEvent;
  if (outcome.fleetDestroyed) dialogueEvent = isPlayer ? 'playerWin' : 'aiWin';
  else if (outcome.result === 'miss') dialogueEvent = isPlayer ? 'playerMiss' : 'aiMiss';
  else if (outcome.result === 'hit') dialogueEvent = isPlayer ? 'playerHit' : 'aiHit';
  else dialogueEvent = isPlayer ? 'playerSunk' : 'aiSunk';
  next = withComms(next, rng, dialogueEvent, { ship: shipName });

  if (outcome.fleetDestroyed) {
    next = {
      ...next,
      eventSeq: next.eventSeq + 1,
      phase: PHASE.GAME_OVER,
      winner: actor,
      endedAt: now,
    };
    next = withLog(next, {
      actor: 'system',
      kind: isPlayer ? 'victory' : 'defeat',
      text: isPlayer ? 'ENEMY FLEET ANNIHILATED.' : 'MISSION FAILED — ALL HANDS LOST.',
    });
  } else {
    next = { ...next, turn: isPlayer ? TURN.AI : TURN.PLAYER };
  }

  return { ...next, eventSeq: next.eventSeq + 1, rngState: rng.state };
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'NEW_GAME':
      return createGame({ seed: action.seed, gameId: state.gameId + 1 });

    case 'RANDOMIZE_FLEET': {
      if (state.phase !== PHASE.PLACEMENT) return state;
      const rng = createRng(state.rngState);
      return { ...state, playerBoard: placeFleetRandomly(rng), rngState: rng.state };
    }

    case 'CLEAR_FLEET':
      if (state.phase !== PHASE.PLACEMENT) return state;
      return { ...state, playerBoard: createBoard() };

    case 'PLACE_SHIP': {
      if (state.phase !== PHASE.PLACEMENT) return state;
      const shipDef = FLEET.find((ship) => ship.id === action.shipId);
      if (!shipDef || state.playerBoard.ships.some((ship) => ship.id === shipDef.id)) return state;
      const { row, col, orientation } = action;
      if (!validatePlacement(state.playerBoard, row, col, shipDef.length, orientation).valid) return state;
      return { ...state, playerBoard: placeShip(state.playerBoard, shipDef, row, col, orientation) };
    }

    case 'REMOVE_SHIP':
      if (state.phase !== PHASE.PLACEMENT) return state;
      return { ...state, playerBoard: removeShip(state.playerBoard, action.shipId) };

    case 'START_BATTLE': {
      if (state.phase !== PHASE.PLACEMENT || !isFleetComplete(state.playerBoard)) return state;
      const next = withLog(
        { ...state, phase: PHASE.BATTLE, turn: TURN.PLAYER, startedAt: action.now },
        { actor: 'system', kind: 'info', text: 'Battle stations! Enemy fleet detected. Awaiting your orders.' },
      );
      return { ...next, eventSeq: next.eventSeq + 1 };
    }

    case 'PLAYER_FIRE': {
      if (state.phase !== PHASE.BATTLE || state.turn !== TURN.PLAYER) return state;
      const outcome = receiveAttack(state.enemyBoard, action.row, action.col);
      if (!outcome.valid) return state;
      return resolveShot(state, TURN.PLAYER, outcome, action.now, createRng(state.rngState));
    }

    case 'AI_FIRE': {
      if (state.phase !== PHASE.BATTLE || state.turn !== TURN.AI) return state;
      if (action.gameId !== undefined && action.gameId !== state.gameId) return state;
      const rng = createRng(state.rngState);
      const target = chooseAITarget(getAIView(state.playerBoard), rng);
      if (!target) return state;
      const outcome = receiveAttack(state.playerBoard, target.row, target.col);
      if (!outcome.valid) return state;
      return resolveShot(state, TURN.AI, outcome, action.now, rng);
    }

    default:
      return state;
  }
}
