import { useEffect, useRef } from 'react';
import { AdmiralAvatar } from './CommsPanel.jsx';
import { RANKS } from '../engine/stats.js';

export default function Debrief({ debrief, finalRemark, onNewGame, onReview }) {
  const victory = debrief.outcome === 'victory';
  const buttonRef = useRef(null);
  useEffect(() => buttonRef.current?.focus(), []);
  const rankIndex = RANKS.indexOf(debrief.rank);

  const rows = [
    ['Outcome', victory ? 'Victory' : 'Defeat'],
    ['Shots fired', debrief.shots],
    ['Hits', debrief.hits],
    ['Accuracy', `${debrief.accuracy}%`],
    ['Enemy ships sunk', `${debrief.enemyShipsSunk} / ${debrief.enemyShipsTotal}`],
    ['Friendly ships remaining', `${debrief.friendlyShipsRemaining} / ${debrief.friendlyShipsTotal}`],
    ['Battle duration', debrief.duration],
  ];

  return (
    <div className="modal-backdrop">
      <div
        className={`debrief debrief-${debrief.outcome}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="debrief-title"
      >
        <p className="panel-kicker">Mission debrief · classified</p>
        <h2 id="debrief-title" className="debrief-title">
          {victory ? 'VICTORY' : 'DEFEAT'}
        </h2>
        <div className="rank">
          <span className="rank-label">Rank awarded</span>
          <span className="rank-name" data-testid="debrief-rank">
            {debrief.rank}
          </span>
          <span className="rank-stars" aria-hidden="true">
            {RANKS.map((r, i) => (
              <span key={r} className={i <= rankIndex ? 'star star-on' : 'star'}>
                ★
              </span>
            ))}
          </span>
        </div>
        <dl className="debrief-stats">
          {rows.map(([label, value]) => (
            <div key={label} className="debrief-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="debrief-byte">
          <AdmiralAvatar mood={victory ? 'annoyed' : 'smug'} />
          <div>
            <span className="comms-name">ADMIRAL BYTE · ASSESSMENT</span>
            {finalRemark && <p className="debrief-remark">“{finalRemark}”</p>}
            <p className="debrief-assessment">{debrief.assessment}</p>
          </div>
        </div>
        <div className="debrief-actions">
          <button ref={buttonRef} type="button" className="btn btn-primary btn-large" onClick={onNewGame}>
            Launch Another Battle
          </button>
          <button type="button" className="btn btn-ghost" onClick={onReview}>
            Review battlefield
          </button>
        </div>
      </div>
    </div>
  );
}
