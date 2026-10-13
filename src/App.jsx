import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Board from './components/Board.jsx';
import CommsPanel from './components/CommsPanel.jsx';
import Dashboard from './components/Dashboard.jsx';
import Banner from './components/Banner.jsx';
import Finale from './components/Finale.jsx';
import Debrief from './components/Debrief.jsx';
import PlacementPanel from './components/PlacementPanel.jsx';
import { useGame } from './hooks/useGame.js';
import { usePrefersReducedMotion } from './hooks/useReducedMotion.js';
import { FLEET } from './engine/constants.js';
import { getShipCells, isInBounds, shipAt, validatePlacement, cellKey } from './engine/board.js';
import { PHASE, TURN } from './engine/game.js';
import { buildDebrief } from './engine/stats.js';
import { playSound } from './audio/sound.js';

export const BANNER_MS = 1900;
export const FINALE_MS = 3200;
export const FINALE_REDUCED_MS = 1200;
const SHAKE_MS = 500;
const MOTION_LABELS = { system: 'Auto', full: 'Full', reduced: 'Reduced' };
const NEXT_MOTION = { system: 'full', full: 'reduced', reduced: 'system' };

function readStorage(key, fallback) {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode) — preferences just won't persist
  }
}

function SpeakerIcon({ muted }) {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      {muted ? (
        <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

export default function App({ seed, aiDelay } = {}) {
  const [state, actions] = useGame({ seed, aiDelay });
  const { phase, turn, gameId, lastEvent } = state;

  const systemReduced = usePrefersReducedMotion();
  const [motionPref, setMotionPref] = useState(() => readStorage('odb-motion', 'system'));
  const reduced = motionPref === 'system' ? systemReduced : motionPref === 'reduced';
  const [muted, setMuted] = useState(() => readStorage('odb-muted', 'true') !== 'false');

  const [banner, setBanner] = useState(null);
  const [shaking, setShaking] = useState(false);
  const [debriefFor, setDebriefFor] = useState(null);
  const [reviewing, setReviewing] = useState(false);

  const [orientation, setOrientation] = useState('horizontal');
  const [selectedShipId, setSelectedShipId] = useState(null);
  const [hover, setHover] = useState(null);

  const settings = useRef({ muted, reduced });
  settings.current = { muted, reduced };
  const handledEvent = useRef(null);

  // Side effects for each shot: sound, sink banner, screen shake. They never touch game state.
  useEffect(() => {
    if (!lastEvent) return;
    const eventKey = `${gameId}:${lastEvent.seq}`;
    if (handledEvent.current === eventKey) return;
    handledEvent.current = eventKey;
    const byPlayer = lastEvent.actor === TURN.PLAYER;
    if (!settings.current.muted) {
      playSound(lastEvent.result);
      if (lastEvent.fleetDestroyed) playSound(byPlayer ? 'victory' : 'defeat');
    }
    if (lastEvent.result === 'sunk') {
      if (!lastEvent.fleetDestroyed) {
        const name = lastEvent.shipName.toUpperCase();
        setBanner({
          key: eventKey,
          gameId,
          tone: byPlayer ? 'enemy' : 'friendly',
          text: byPlayer ? `ENEMY ${name} SUNK!` : `YOUR ${name} HAS BEEN SUNK!`,
        });
      }
      if (!settings.current.reduced) setShaking(true);
    }
  }, [lastEvent, gameId]);

  useEffect(() => {
    if (!banner) return undefined;
    const timer = setTimeout(() => setBanner(null), BANNER_MS);
    return () => clearTimeout(timer);
  }, [banner]);

  useEffect(() => {
    if (!shaking) return undefined;
    const timer = setTimeout(() => setShaking(false), SHAKE_MS);
    return () => clearTimeout(timer);
  }, [shaking]);

  // After the game ends, play the finale, then show the debrief. Cancelled by restart (gameId change).
  useEffect(() => {
    if (phase !== PHASE.GAME_OVER) return undefined;
    const timer = setTimeout(() => setDebriefFor(gameId), reduced ? FINALE_REDUCED_MS : FINALE_MS);
    return () => clearTimeout(timer);
  }, [phase, gameId, reduced]);

  const placedIds = useMemo(() => new Set(state.playerBoard.ships.map((s) => s.id)), [state.playerBoard]);
  const activeShipId =
    selectedShipId && !placedIds.has(selectedShipId) ? selectedShipId : FLEET.find((s) => !placedIds.has(s.id))?.id;

  const rotate = useCallback(() => setOrientation((o) => (o === 'horizontal' ? 'vertical' : 'horizontal')), []);

  useEffect(() => {
    if (phase !== PHASE.PLACEMENT) return undefined;
    const onKey = (e) => {
      if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.altKey) rotate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, rotate]);

  const preview = useMemo(() => {
    if (phase !== PHASE.PLACEMENT || !hover || !activeShipId) return null;
    if (shipAt(state.playerBoard, hover[0], hover[1])) return null;
    const def = FLEET.find((s) => s.id === activeShipId);
    const { valid } = validatePlacement(state.playerBoard, hover[0], hover[1], def.length, orientation);
    const cells = getShipCells(hover[0], hover[1], def.length, orientation)
      .filter(([r, c]) => isInBounds(r, c))
      .map(([r, c]) => cellKey(r, c));
    return { cells, valid };
  }, [phase, hover, activeShipId, orientation, state.playerBoard]);

  const onPlacementClick = (row, col) => {
    const existing = shipAt(state.playerBoard, row, col);
    if (existing) {
      actions.removeShip(existing.id);
      setSelectedShipId(existing.id);
      setOrientation(existing.orientation);
      return;
    }
    if (activeShipId) actions.placeShip(activeShipId, row, col, orientation);
  };

  const newGame = () => {
    actions.newGame();
    setBanner(null);
    setShaking(false);
    setReviewing(false);
    setSelectedShipId(null);
    setHover(null);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    writeStorage('odb-muted', String(next));
    if (!next) playSound('click');
  };

  const cycleMotion = () => {
    const next = NEXT_MOTION[motionPref] ?? 'system';
    setMotionPref(next);
    writeStorage('odb-motion', next);
  };

  const gameOver = phase === PHASE.GAME_OVER;
  const showFinale = gameOver && debriefFor !== gameId;
  const showDebrief = gameOver && debriefFor === gameId && !reviewing;
  const debrief = useMemo(() => (gameOver ? buildDebrief(state) : null), [gameOver, state]);
  const finalRemark = gameOver ? state.comms[0]?.text : null;
  const visibleBanner = banner && banner.gameId === gameId && !showFinale ? banner : null;
  const playerTurn = phase === PHASE.BATTLE && turn === TURN.PLAYER;

  return (
    <div className={`app ${reduced ? 'reduced-motion' : ''}`} data-testid="app">
      <div className="backdrop-grid" aria-hidden="true" />
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <h1 className="brand-title">
              OPERATION <span>DEEP BLUE</span>
            </h1>
            <p className="brand-sub">Naval Command · Hostile: Admiral Byte</p>
          </div>
        </div>
        <div className="controls">
          {gameOver && reviewing && (
            <button type="button" className="btn" onClick={() => setReviewing(false)}>
              Mission debrief
            </button>
          )}
          <button type="button" className="btn" onClick={toggleMute} aria-pressed={!muted} aria-label={muted ? 'Unmute sound' : 'Mute sound'}>
            <SpeakerIcon muted={muted} />
            {muted ? 'Sound off' : 'Sound on'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={cycleMotion}
            aria-label={`Motion: ${MOTION_LABELS[motionPref]}${motionPref === 'system' ? (reduced ? ' (reduced)' : ' (full)') : ''}. Click to change.`}
          >
            Motion: {MOTION_LABELS[motionPref]}
            {motionPref === 'system' && <small>{reduced ? ' · reduced' : ' · full'}</small>}
          </button>
          <button type="button" className="btn btn-danger" onClick={newGame}>
            New battle
          </button>
        </div>
      </header>

      <main className={`layout layout-${phase}`}>
        <div className={`theatre ${shaking ? 'shake' : ''}`}>
          <CommsPanel comms={state.comms} />
          {phase === PHASE.PLACEMENT ? (
            <div className="boards boards-single">
              <Board
                board={state.playerBoard}
                variant="player"
                title="Your fleet"
                subtitle={activeShipId ? `Placing: ${FLEET.find((s) => s.id === activeShipId).name}` : 'Fleet ready'}
                interactive
                onCellClick={onPlacementClick}
                onCellHover={(r, c) => setHover([r, c])}
                onBoardLeave={() => setHover(null)}
                preview={preview}
                className="board-placement"
              />
            </div>
          ) : (
            <div className="boards">
              <Board
                board={state.enemyBoard}
                variant="enemy"
                title="Enemy waters"
                subtitle={playerTurn ? 'Select a target' : gameOver ? 'Battle over' : 'Hold fire…'}
                interactive={playerTurn}
                onCellClick={actions.fire}
                revealAll={gameOver}
                lastShot={state.lastShot.player}
                active={playerTurn}
              />
              <Board
                board={state.playerBoard}
                variant="player"
                title="Your fleet"
                subtitle={phase === PHASE.BATTLE && turn === TURN.AI ? 'Incoming fire!' : 'Defensive grid'}
                lastShot={state.lastShot.ai}
                active={phase === PHASE.BATTLE && turn === TURN.AI}
              />
            </div>
          )}
          <Banner banner={visibleBanner} />
        </div>

        {phase === PHASE.PLACEMENT ? (
          <PlacementPanel
            board={state.playerBoard}
            selectedShipId={activeShipId}
            orientation={orientation}
            onSelectShip={setSelectedShipId}
            onRotate={rotate}
            onRandomize={actions.randomizeFleet}
            onClear={actions.clearFleet}
            onStart={actions.startBattle}
          />
        ) : (
          <Dashboard state={state} />
        )}
      </main>

      <footer className="footer">Operation Deep Blue · React + Vite · No accounts, no tracking.</footer>

      {showFinale && <Finale outcome={debrief.outcome} onSkip={() => setDebriefFor(gameId)} />}
      {showDebrief && (
        <Debrief debrief={debrief} finalRemark={finalRemark} onNewGame={newGame} onReview={() => setReviewing(true)} />
      )}
    </div>
  );
}
