import { describe, expect, it } from 'vitest';
import { DIALOGUE, formatLine, pickLine } from './dialogue.js';
import { createRng } from './rng.js';

describe('Admiral Byte dialogue', () => {
  it('has several lines for every event', () => {
    for (const lines of Object.values(DIALOGUE)) expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it('never repeats the same line twice in a row', () => {
    const rng = createRng(5);
    for (const event of Object.keys(DIALOGUE)) {
      let last = -1;
      for (let i = 0; i < 200; i += 1) {
        const { index } = pickLine(event, rng, last);
        expect(index).not.toBe(last);
        last = index;
      }
    }
  });

  it('fills in ship names', () => {
    expect(formatLine('Glub glub, {ship}.', { ship: 'Cruiser' })).toBe('Glub glub, Cruiser.');
  });

  it('throws on unknown events', () => {
    expect(() => pickLine('nope', createRng(1))).toThrow();
  });
});
