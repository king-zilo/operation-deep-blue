import { describe, expect, it } from 'vitest';
import { createGame, gameReducer, PHASE, TURN } from './game.js';
import { DIALOGUE, formatLine } from './dialogue.js';
import { isShipSunk } from './board.js';
import { buildDebrief, calcAccuracy } from './stats.js';
import { stackedFleetBoard } from './testUtils.js';

const started = (seed = 1) => gameReducer(createGame({ seed }), { type: 'START_BATTLE', now: 1000 });
const playerFire = (state, row, col, now = 2000) => gameReducer(state, { type: 'PLAYER_FIRE', row, col, now });
const aiFire = (state, now = 2500) => gameReducer(state, { type: 'AI_FIRE', gameId: state.gameId, now });

function findCell(board, wantShip) {
  for (let r = 0; r < 10; r += 1)
    for (let c = 0; c < 10; c += 1) {
      const key = `${r},${c}`;
      const hasShip = board.ships.some((s) => s.cells.includes(key));
      if (hasShip === wantShip && !board.shots[key]) return [r, c];
    }
  return null;
}

const lineMatches = (event, text, ship) =>
  DIALOGUE[event].some((line) => formatLine(line, { ship }) === text);

describe('game flow', () => {
  it('starts in placement with both fleets auto-placed and an opening line', () => {
    const s = createGame({ seed: 7 });
    expect(s.phase).toBe(PHASE.PLACEMENT);
    expect(s.playerBoard.ships).toHaveLength(5);
    expect(s.enemyBoard.ships).toHaveLength(5);
    expect(lineMatches('gameStart', s.comms[0].text)).toBe(true);
  });

  it('cannot fire before the battle starts', () => {
    const s = createGame({ seed: 7 });
    expect(playerFire(s, 0, 0)).toBe(s);
  });

  it('cannot start the battle with an incomplete fleet', () => {
    const s = gameReducer(createGame({ seed: 7 }), { type: 'CLEAR_FLEET' });
    expect(gameReducer(s, { type: 'START_BATTLE', now: 0 }).phase).toBe(PHASE.PLACEMENT);
  });

  it('supports manual placement and rejects invalid manual placements', () => {
    let s = gameReducer(createGame({ seed: 7 }), { type: 'CLEAR_FLEET' });
    s = gameReducer(s, { type: 'PLACE_SHIP', shipId: 'carrier', row: 0, col: 0, orientation: 'horizontal' });
    expect(s.playerBoard.ships).toHaveLength(1);
    const overlap = gameReducer(s, { type: 'PLACE_SHIP', shipId: 'destroyer', row: 0, col: 3, orientation: 'vertical' });
    expect(overlap).toBe(s);
    const oob = gameReducer(s, { type: 'PLACE_SHIP', shipId: 'destroyer', row: 9, col: 5, orientation: 'vertical' });
    expect(oob).toBe(s);
    s = gameReducer(s, { type: 'REMOVE_SHIP', shipId: 'carrier' });
    expect(s.playerBoard.ships).toHaveLength(0);
  });

  it('alternates turns: player, then AI, then player', () => {
    let s = started();
    expect(s.turn).toBe(TURN.PLAYER);
    s = playerFire(s, ...findCell(s.enemyBoard, false));
    expect(s.turn).toBe(TURN.AI);
    expect(s.stats.playerShots).toBe(1);
    s = aiFire(s);
    expect(s.turn).toBe(TURN.PLAYER);
    expect(s.stats.aiShots).toBe(1);
  });

  it('ignores player fire during the AI turn (rapid clicks)', () => {
    let s = started();
    const [r1, c1] = findCell(s.enemyBoard, false);
    s = playerFire(s, r1, c1);
    const afterFirst = s;
    // second and third clicks land before the AI has moved
    s = playerFire(s, ...findCell(s.enemyBoard, true));
    s = playerFire(s, ...findCell(s.enemyBoard, false));
    expect(s).toBe(afterFirst);
    expect(s.stats.playerShots).toBe(1);
  });

  it('ignores AI fire during the player turn', () => {
    const s = started();
    expect(aiFire(s)).toBe(s);
  });

  it('rejects duplicate attacks and keeps it the player turn', () => {
    let s = started();
    const [r, c] = findCell(s.enemyBoard, false);
    s = aiFire(playerFire(s, r, c));
    const before = s;
    s = playerFire(s, r, c);
    expect(s).toBe(before);
    expect(s.turn).toBe(TURN.PLAYER);
  });

  it('ignores a stale AI move from a previous game (restart during AI turn)', () => {
    let s = started();
    s = playerFire(s, ...findCell(s.enemyBoard, false));
    const oldGameId = s.gameId;
    s = gameReducer(s, { type: 'NEW_GAME', seed: 99 });
    s = gameReducer(s, { type: 'START_BATTLE', now: 5 });
    s = playerFire(s, ...findCell(s.enemyBoard, false));
    const stale = gameReducer(s, { type: 'AI_FIRE', gameId: oldGameId, now: 6 });
    expect(stale).toBe(s);
  });

  it('NEW_GAME completely resets state', () => {
    let s = started();
    for (let i = 0; i < 5; i += 1) s = aiFire(playerFire(s, ...findCell(s.enemyBoard, i % 2 === 0)));
    const fresh = gameReducer(s, { type: 'NEW_GAME', seed: 1 });
    const reference = createGame({ seed: 1, gameId: s.gameId + 1 });
    expect(fresh).toEqual(reference);
    expect(fresh.stats).toEqual({ playerShots: 0, playerHits: 0, aiShots: 0, aiHits: 0 });
    expect(fresh.log).toEqual([]);
    expect(fresh.winner).toBeNull();
    expect(Object.keys(fresh.playerBoard.shots)).toHaveLength(0);
    expect(Object.keys(fresh.enemyBoard.shots)).toHaveLength(0);
  });

  it('dialogue and log match the actual result of every shot', () => {
    let s = started(3);
    let guard = 0;
    while (s.phase === PHASE.BATTLE && guard < 200) {
      guard += 1;
      const target = findCell(s.enemyBoard, guard % 3 === 0);
      if (s.turn === TURN.PLAYER) s = playerFire(s, ...target);
      else s = aiFire(s);
      const e = s.lastEvent;
      const actor = e.actor === 'player' ? 'player' : 'ai';
      const event = e.fleetDestroyed
        ? `${actor}Win`
        : `${actor}${e.result[0].toUpperCase()}${e.result.slice(1)}`;
      expect(lineMatches(event, s.comms[0].text, e.shipName)).toBe(true);
      const shotLog = s.log.find((l) => l.actor === e.actor);
      if (e.result === 'miss') expect(shotLog.text).toMatch(/miss/);
      if (e.result === 'hit') expect(shotLog.text).toMatch(/HIT/);
      if (e.result === 'sunk') expect(shotLog.text).toContain(`${e.shipName} SUNK`);
    }
    expect(s.phase).toBe(PHASE.GAME_OVER);
  });

  it('final shot sinks the final ship: player wins and gameplay stops immediately', () => {
    let s = started();
    s = { ...s, enemyBoard: stackedFleetBoard() };
    const cells = s.enemyBoard.ships.flatMap((ship) => ship.cells.map((k) => k.split(',').map(Number)));
    cells.forEach(([r, c], i) => {
      s = playerFire(s, r, c, 1000 + i);
      if (s.phase === PHASE.BATTLE) s = aiFire(s);
    });
    expect(s.phase).toBe(PHASE.GAME_OVER);
    expect(s.winner).toBe('player');
    expect(s.endedAt).toBe(1000 + cells.length - 1);
    expect(s.lastEvent).toMatchObject({ actor: 'player', result: 'sunk', fleetDestroyed: true });
    expect(s.log[0].text).toBe('ENEMY FLEET ANNIHILATED.');
    expect(lineMatches('playerWin', s.comms[0].text)).toBe(true);
    // nothing else can happen
    expect(aiFire(s)).toBe(s);
    expect(playerFire(s, ...findCell(s.enemyBoard, false))).toBe(s);
    expect(s.enemyBoard.ships.every((ship) => isShipSunk(s.enemyBoard, ship))).toBe(true);
  });

  it('AI win is detected and announced', () => {
    let s = started(4);
    s = { ...s, playerBoard: stackedFleetBoard() };
    let guard = 0;
    while (s.phase === PHASE.BATTLE && guard < 200) {
      guard += 1;
      // player deliberately only fires at empty water
      s = playerFire(s, ...findCell(s.enemyBoard, false));
      if (s.phase === PHASE.BATTLE) s = aiFire(s);
    }
    expect(s.winner).toBe('ai');
    expect(s.log[0].text).toBe('MISSION FAILED — ALL HANDS LOST.');
    expect(lineMatches('aiWin', s.comms[0].text)).toBe(true);
    expect(buildDebrief(s).outcome).toBe('defeat');
  });

  it('stats and debrief stay consistent with the boards over a full game', () => {
    let s = started(8);
    let guard = 0;
    while (s.phase === PHASE.BATTLE && guard < 300) {
      guard += 1;
      s = playerFire(s, ...findCell(s.enemyBoard, guard % 4 === 0));
      if (s.phase === PHASE.BATTLE) s = aiFire(s);
    }
    const enemyShots = Object.values(s.enemyBoard.shots);
    const playerShots = Object.values(s.playerBoard.shots);
    expect(s.stats.playerShots).toBe(enemyShots.length);
    expect(s.stats.playerHits).toBe(enemyShots.filter((v) => v === 'hit').length);
    expect(s.stats.aiShots).toBe(playerShots.length);
    expect(s.stats.aiHits).toBe(playerShots.filter((v) => v === 'hit').length);
    const d = buildDebrief(s);
    expect(d.accuracy).toBe(calcAccuracy(s.stats.playerHits, s.stats.playerShots));
    expect(d.durationMs).toBe(s.endedAt - s.startedAt);
  });

  it('the same seed and the same moves produce the same game', () => {
    const play = () => {
      let s = started(21);
      for (let i = 0; i < 10; i += 1) s = aiFire(playerFire(s, ...findCell(s.enemyBoard, i % 2 === 0)));
      return s;
    };
    expect(play()).toEqual(play());
  });
});
