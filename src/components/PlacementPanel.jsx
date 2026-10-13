import { FLEET } from '../engine/constants.js';

export default function PlacementPanel({
  board,
  selectedShipId,
  orientation,
  onSelectShip,
  onRotate,
  onRandomize,
  onClear,
  onStart,
}) {
  const placed = new Set(board.ships.map((s) => s.id));
  const ready = placed.size === FLEET.length;
  return (
    <aside className="dashboard placement-panel" aria-label="Fleet deployment">
      <section className="panel">
        <p className="panel-kicker">Pre-battle briefing</p>
        <h2 className="placement-title">Deploy your fleet</h2>
        <p className="placement-help">
          Your fleet has been auto-deployed. Engage now, shuffle it, or clear the board and place ships yourself:
          pick a ship, then click a cell. Click a placed ship to pick it back up. Press <kbd>R</kbd> to rotate.
        </p>
      </section>

      <section className="panel">
        <ul className="ship-picker">
          {FLEET.map((ship) => {
            const isPlaced = placed.has(ship.id);
            const selected = selectedShipId === ship.id;
            return (
              <li key={ship.id}>
                <button
                  type="button"
                  className={`ship-option ${selected ? 'ship-option-selected' : ''} ${isPlaced ? 'ship-option-placed' : ''}`}
                  onClick={() => onSelectShip(ship.id)}
                  disabled={isPlaced}
                  aria-pressed={selected}
                >
                  <span>{ship.name}</span>
                  <span className="fleet-pips" aria-hidden="true">
                    {Array.from({ length: ship.length }, (_, i) => (
                      <span key={i} className="pip pip-ship" />
                    ))}
                  </span>
                  <span className="fleet-status">{isPlaced ? 'deployed' : selected ? 'selected' : 'ready'}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="placement-tools">
          <button type="button" className="btn" onClick={onRotate}>
            Rotate: {orientation === 'horizontal' ? 'Horizontal ↔' : 'Vertical ↕'}
          </button>
          <button type="button" className="btn" onClick={onRandomize}>
            Randomize
          </button>
          <button type="button" className="btn" onClick={onClear}>
            Clear board
          </button>
        </div>
      </section>

      <button type="button" className="btn btn-primary btn-large engage" onClick={onStart} disabled={!ready}>
        {ready ? 'Engage the enemy' : `Place ${FLEET.length - placed.size} more ship${FLEET.length - placed.size === 1 ? '' : 's'}`}
      </button>
    </aside>
  );
}
