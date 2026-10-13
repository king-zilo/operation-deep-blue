import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App, { FINALE_MS, FINALE_REDUCED_MS } from './App.jsx';
import { createGame } from './engine/game.js';
import { setPrefersReducedMotion } from './test/setup.js';

const SEED = 12345;
const AI_DELAY = 500;
const enemyShipCells = () =>
  createGame({ seed: SEED }).enemyBoard.ships.flatMap((s) => s.cells.map((k) => k.split(',').map(Number)));
const enemyWaterCells = () => {
  const occupied = new Set(createGame({ seed: SEED }).enemyBoard.ships.flatMap((s) => s.cells));
  const cells = [];
  for (let r = 0; r < 10; r += 1) for (let c = 0; c < 10; c += 1) if (!occupied.has(`${r},${c}`)) cells.push([r, c]);
  return cells;
};

const enemyCell = (r, c) =>
  document.querySelector(`section[aria-label="Enemy waters"] [data-row="${r}"][data-col="${c}"]`);
const advance = (ms) => act(() => vi.advanceTimersByTime(ms));
const engage = () => fireEvent.click(screen.getByRole('button', { name: /engage the enemy/i }));
const shots = () => screen.getByTestId('stat-shots').textContent;

function renderGame() {
  const utils = render(<App seed={SEED} aiDelay={AI_DELAY} />);
  engage();
  return utils;
}

function sinkWholeEnemyFleet({ stopBeforeLast = false } = {}) {
  const cells = enemyShipCells();
  const list = stopBeforeLast ? cells.slice(0, -1) : cells;
  list.forEach(([r, c], i) => {
    fireEvent.click(enemyCell(r, c));
    if (i < cells.length - 1) advance(AI_DELAY);
  });
  return cells;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('App (integration)', () => {
  it('starts with an auto-placed fleet and sound muted by default', () => {
    render(<App seed={SEED} aiDelay={AI_DELAY} />);
    expect(screen.getByRole('button', { name: /engage the enemy/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /unmute sound/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('ignores rapid repeated clicks while the AI is taking its turn', () => {
    renderGame();
    const [[r1, c1], [r2, c2], [r3, c3]] = enemyWaterCells();
    fireEvent.click(enemyCell(r1, c1));
    fireEvent.click(enemyCell(r2, c2));
    fireEvent.click(enemyCell(r3, c3));
    fireEvent.click(enemyCell(r1, c1));
    expect(shots()).toBe('1');
    expect(enemyCell(r2, c2)).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('turn-status')).toHaveTextContent(/admiral byte is targeting/i);
    advance(AI_DELAY);
    expect(screen.getByTestId('turn-status')).toHaveTextContent(/your turn/i);
    fireEvent.click(enemyCell(r2, c2));
    expect(shots()).toBe('2');
  });

  it('ignores clicks on an already-attacked cell', () => {
    renderGame();
    const [r, c] = enemyWaterCells()[0];
    fireEvent.click(enemyCell(r, c));
    advance(AI_DELAY);
    fireEvent.click(enemyCell(r, c));
    expect(shots()).toBe('1');
    expect(screen.getByTestId('turn-status')).toHaveTextContent(/your turn/i);
  });

  it('restart during the AI turn fully resets and the pending AI move never lands', () => {
    renderGame();
    fireEvent.click(enemyCell(...enemyWaterCells()[0]));
    fireEvent.click(screen.getByRole('button', { name: /new battle/i }));
    advance(AI_DELAY * 4);
    engage();
    expect(shots()).toBe('0');
    expect(screen.getByTestId('stat-integrity')).toHaveTextContent('100%');
    expect(screen.getByTestId('combat-log')).not.toHaveTextContent(/fires at/);
    const playerBoard = document.querySelector('section[aria-label="Your fleet"]');
    expect(within(playerBoard).queryAllByLabelText(/, (hit|miss|ship sunk)$/)).toHaveLength(0);
  });

  it('shows a sink announcement and log entry when an enemy ship sinks', () => {
    renderGame();
    const first = createGame({ seed: SEED }).enemyBoard.ships[0];
    first.cells.forEach((key, i) => {
      fireEvent.click(enemyCell(...key.split(',').map(Number)));
      if (i < first.cells.length - 1) advance(AI_DELAY);
    });
    expect(screen.getByRole('status')).toHaveTextContent(`ENEMY ${first.name.toUpperCase()} SUNK!`);
    expect(screen.getByTestId('combat-log')).toHaveTextContent(`enemy ${first.name} SUNK!`);
    expect(screen.getByTestId('stat-enemy-left')).toHaveTextContent('4/5');
    expect(document.querySelectorAll('.cell-sinking')).toHaveLength(first.length);
  });

  it('final shot ends the game, plays the finale, then shows an accurate debrief', () => {
    renderGame();
    const cells = sinkWholeEnemyFleet();
    expect(screen.getByRole('alertdialog')).toHaveTextContent('ENEMY FLEET ANNIHILATED.');
    expect(screen.getByTestId('turn-status')).toHaveTextContent(/victory/i);
    // the AI must not fire after the game ended
    const aiShotsBefore = screen.getByTestId('combat-log').textContent.match(/Admiral Byte fires/g).length;
    advance(AI_DELAY * 3);
    expect(screen.getByTestId('combat-log').textContent.match(/Admiral Byte fires/g).length).toBe(aiShotsBefore);
    expect(aiShotsBefore).toBe(cells.length - 1);
    advance(FINALE_MS);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('VICTORY');
    expect(dialog).toHaveTextContent(/Shots fired\s*17/);
    expect(dialog).toHaveTextContent(/Accuracy\s*100%/);
    expect(dialog).toHaveTextContent(/Enemy ships sunk\s*5 \/ 5/);
    expect(['Commander', 'Fleet Admiral']).toContain(screen.getByTestId('debrief-rank').textContent);
  });

  it('the finale can be skipped', () => {
    renderGame();
    sinkWholeEnemyFleet();
    fireEvent.click(screen.getByRole('button', { name: /skip to debrief/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('restart while the end-of-game animation is playing never shows a stale debrief', () => {
    renderGame();
    sinkWholeEnemyFleet();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /new battle/i }));
    advance(FINALE_MS * 2);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /engage the enemy/i })).toBeInTheDocument();
  });

  it('"Launch Another Battle" starts a fresh game', () => {
    renderGame();
    sinkWholeEnemyFleet();
    advance(FINALE_MS);
    fireEvent.click(screen.getByRole('button', { name: /launch another battle/i }));
    engage();
    expect(shots()).toBe('0');
    expect(screen.getByTestId('stat-enemy-left')).toHaveTextContent('5/5');
  });

  it('respects prefers-reduced-motion: no shake, shorter finale', () => {
    setPrefersReducedMotion(true);
    renderGame();
    expect(screen.getByTestId('app')).toHaveClass('reduced-motion');
    sinkWholeEnemyFleet();
    expect(document.querySelector('.theatre')).not.toHaveClass('shake');
    advance(FINALE_REDUCED_MS);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shakes the screen on a sink when motion is enabled', () => {
    renderGame();
    sinkWholeEnemyFleet({ stopBeforeLast: true });
    const first = createGame({ seed: SEED }).enemyBoard.ships[0];
    expect(first).toBeTruthy();
    fireEvent.click(enemyCell(...enemyShipCells().at(-1)));
    expect(document.querySelector('.theatre')).toHaveClass('shake');
  });

  it('motion toggle can force reduced motion', () => {
    render(<App seed={SEED} aiDelay={AI_DELAY} />);
    const toggle = screen.getByRole('button', { name: /^motion/i });
    fireEvent.click(toggle); // full
    expect(screen.getByTestId('app')).not.toHaveClass('reduced-motion');
    fireEvent.click(toggle); // reduced
    expect(screen.getByTestId('app')).toHaveClass('reduced-motion');
  });

  it('supports manual placement: clear, place all ships, then engage', () => {
    render(<App seed={SEED} aiDelay={AI_DELAY} />);
    fireEvent.click(screen.getByRole('button', { name: /clear board/i }));
    expect(screen.getByRole('button', { name: /place 5 more ships/i })).toBeDisabled();
    const playerCell = (r, c) =>
      document.querySelector(`section[aria-label="Your fleet"] [data-row="${r}"][data-col="${c}"]`);
    // invalid: carrier hanging off the right edge
    fireEvent.click(playerCell(0, 8));
    expect(screen.getByRole('button', { name: /place 5 more ships/i })).toBeInTheDocument();
    [0, 2, 4, 6, 8].forEach((row) => fireEvent.click(playerCell(row, 0)));
    engage();
    expect(screen.getByTestId('turn-status')).toHaveTextContent(/your turn/i);
  });
});
