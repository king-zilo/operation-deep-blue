import { useEffect, useRef } from 'react';
import { isShipSunk } from '../engine/board.js';
import { calcAccuracy, countAfloat, fleetIntegrity } from '../engine/stats.js';
import { turnStatus } from './turnStatus.js';

function shipStatus(board, ship) {
  if (isShipSunk(board, ship)) return 'sunk';
  return ship.cells.some((key) => board.shots[key] === 'hit') ? 'damaged' : 'intact';
}

function FleetList({ board, hideDamage = false }) {
  return (
    <ul className="fleet-list">
      {board.ships.map((ship) => {
        let status = shipStatus(board, ship);
        if (hideDamage && status === 'damaged') status = 'intact';
        return (
          <li key={ship.id} className={`fleet-item fleet-${status}`}>
            <span className="fleet-name">{ship.name}</span>
            <span className="fleet-pips" aria-hidden="true">
              {ship.cells.map((key) => (
                <span
                  key={key}
                  className={`pip ${!hideDamage && board.shots[key] === 'hit' ? 'pip-hit' : ''} ${status === 'sunk' ? 'pip-hit' : ''}`}
                />
              ))}
            </span>
            <span className="fleet-status">{status}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function Radar() {
  return (
    <div className="radar" aria-hidden="true">
      <div className="radar-sweep" />
      <div className="radar-blip radar-blip-1" />
      <div className="radar-blip radar-blip-2" />
      <div className="radar-blip radar-blip-3" />
    </div>
  );
}

export default function Dashboard({ state }) {
  const { stats, playerBoard, enemyBoard, log } = state;
  const integrity = fleetIntegrity(playerBoard);
  const enemyLeft = countAfloat(enemyBoard);
  const accuracy = calcAccuracy(stats.playerHits, stats.playerShots);
  const status = turnStatus(state);
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [log.length]);

  return (
    <aside className="dashboard" aria-label="Tactical dashboard">
      <section className="panel status-panel">
        <Radar />
        <div className="status-text">
          <span className="panel-kicker">Turn status</span>
          <p className={`turn-status turn-${status.tone}`} data-testid="turn-status">
            {status.text}
          </p>
        </div>
      </section>

      <section className="panel stats-grid" aria-label="Battle statistics">
        <div className="stat">
          <span className="stat-label">Fleet integrity</span>
          <span className="stat-value" data-testid="stat-integrity">
            {integrity}%
          </span>
          <span className="meter" aria-hidden="true">
            <span
              className={`meter-fill ${integrity < 40 ? 'meter-danger' : integrity < 70 ? 'meter-warn' : ''}`}
              style={{ width: `${integrity}%` }}
            />
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Enemy ships left</span>
          <span className="stat-value" data-testid="stat-enemy-left">
            {enemyLeft}
            <small>/{enemyBoard.ships.length}</small>
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Shots fired</span>
          <span className="stat-value" data-testid="stat-shots">
            {stats.playerShots}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Accuracy</span>
          <span className="stat-value" data-testid="stat-accuracy">
            {accuracy}%
          </span>
        </div>
      </section>

      <section className="panel fleets">
        <div>
          <h3 className="panel-kicker">Your fleet</h3>
          <FleetList board={playerBoard} />
        </div>
        <div>
          <h3 className="panel-kicker">Enemy fleet</h3>
          <FleetList board={enemyBoard} hideDamage />
        </div>
      </section>

      <section className="panel log-panel">
        <h3 className="panel-kicker">Combat log</h3>
        <ol className="combat-log" ref={logRef} data-testid="combat-log">
          {log.length === 0 && <li className="log-empty">No contacts yet. Standing by…</li>}
          {log.map((entry) => (
            <li key={entry.id} className={`log-entry log-${entry.actor} log-${entry.kind}`}>
              {entry.text}
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}
