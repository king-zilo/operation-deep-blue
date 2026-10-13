// Small seeded PRNG (mulberry32). Same seed => same game, which makes the engine testable.
export function createRng(seed) {
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    get state() {
      return state;
    },
  };
}

export function pickRandom(items, rng) {
  return items[Math.floor(rng.next() * items.length)];
}

export function randomSeed() {
  return Math.floor(Math.random() * 2 ** 32) >>> 0;
}
