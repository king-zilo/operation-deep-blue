import { useMemo, useRef, useState } from 'react';
import { BOARD_SIZE, ROW_LABELS, coordLabel } from '../engine/constants.js';
import { cellKey, isShipSunk } from '../engine/board.js';

const INDICES = Array.from({ length: BOARD_SIZE }, (_, i) => i);

function describeCell({ variant, shot, sunk, hasShip, showShip }) {
  if (sunk) return 'ship sunk';
  if (shot === 'hit') return 'hit';
  if (shot === 'miss') return 'miss';
  if (variant === 'player') return hasShip ? 'your ship' : 'open water';
  if (showShip) return 'enemy ship (revealed)';
  return 'unknown waters';
}

/**
 * A 10x10 grid. `variant="enemy"` hides un-hit ships unless `revealAll`; `variant="player"` shows
 * your fleet. Cells are buttons with arrow-key navigation (one tab stop per board).
 */
export default function Board({
  board,
  variant,
  title,
  subtitle,
  interactive = false,
  onCellClick,
  onCellHover,
  onBoardLeave,
  revealAll = false,
  lastShot = null,
  preview = null,
  active = false,
  className = '',
}) {
  const gridRef = useRef(null);
  const [focus, setFocus] = useState([0, 0]);

  const shipMap = useMemo(() => {
    const map = new Map();
    for (const ship of board.ships) {
      const sunk = isShipSunk(board, ship);
      ship.cells.forEach((key, index) => map.set(key, { ship, index, sunk }));
    }
    return map;
  }, [board]);

  const previewCells = useMemo(() => new Set(preview?.cells ?? []), [preview]);
  const lastKey = lastShot ? cellKey(lastShot.row, lastShot.col) : null;
  const sinkingCells = useMemo(() => new Set(lastShot?.shipCells ?? []), [lastShot]);

  const moveFocus = (row, col) => {
    const r = Math.min(BOARD_SIZE - 1, Math.max(0, row));
    const c = Math.min(BOARD_SIZE - 1, Math.max(0, col));
    setFocus([r, c]);
    gridRef.current?.querySelector(`[data-row="${r}"][data-col="${c}"]`)?.focus();
  };

  const onKeyDown = (e, row, col) => {
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      moveFocus(row + moves[e.key][0], col + moves[e.key][1]);
      onCellHover?.(row + moves[e.key][0], col + moves[e.key][1]);
    }
  };

  return (
    <section className={`board board-${variant} ${active ? 'board-active' : ''} ${className}`} aria-label={title}>
      <header className="board-header">
        <h2 className="board-title">{title}</h2>
        {subtitle && <p className="board-subtitle">{subtitle}</p>}
      </header>
      <div className="board-frame" ref={gridRef} onMouseLeave={onBoardLeave}>
        <div className="board-corner" aria-hidden="true" />
        {INDICES.map((c) => (
          <div key={`col-${c}`} className="board-label board-label-col" aria-hidden="true">
            {c + 1}
          </div>
        ))}
        {INDICES.map((r) => (
          <div key={`row-${r}`} className="board-row">
            <div className="board-label board-label-row" aria-hidden="true">
              {ROW_LABELS[r]}
            </div>
            {INDICES.map((c) => {
              const key = cellKey(r, c);
              const shot = board.shots[key];
              const info = shipMap.get(key);
              const sunk = Boolean(info?.sunk);
              const showShip = Boolean(info) && (variant === 'player' || sunk || revealAll);
              const targetable = interactive && !shot;
              const classes = ['cell'];
              if (showShip) {
                classes.push('cell-ship', `cell-ship-${info.ship.orientation}`);
                if (info.index === 0) classes.push('cell-bow');
                if (info.index === info.ship.length - 1) classes.push('cell-stern');
                if (variant === 'enemy' && !sunk) classes.push('cell-revealed');
              }
              if (shot) classes.push(`cell-${shot}`);
              if (sunk) classes.push('cell-sunk');
              if (targetable) classes.push('cell-targetable');
              if (key === lastKey) classes.push(`cell-impact-${lastShot.result === 'miss' ? 'miss' : 'hit'}`);
              if (sinkingCells.has(key)) classes.push('cell-sinking');
              if (previewCells.has(key)) classes.push(preview.valid ? 'cell-preview' : 'cell-preview-invalid');
              const label = `${coordLabel(r, c)}, ${describeCell({ variant, shot, sunk, hasShip: Boolean(info), showShip })}`;
              const focused = focus[0] === r && focus[1] === c;
              return (
                <button
                  key={key}
                  type="button"
                  className={classes.join(' ')}
                  data-row={r}
                  data-col={c}
                  aria-label={label}
                  aria-disabled={!interactive || Boolean(shot)}
                  tabIndex={focused ? 0 : -1}
                  onFocus={() => setFocus([r, c])}
                  onKeyDown={(e) => onKeyDown(e, r, c)}
                  onMouseEnter={() => onCellHover?.(r, c)}
                  onClick={() => {
                    if (interactive && onCellClick) onCellClick(r, c);
                  }}
                >
                  {shot && <span className={`marker marker-${sunk ? 'sunk' : shot}`} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
