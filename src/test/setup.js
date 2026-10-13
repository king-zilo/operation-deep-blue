import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

let reducedMotion = false;
export function setPrefersReducedMotion(value) {
  reducedMotion = value;
}

window.matchMedia = vi.fn((query) => ({
  matches: query.includes('prefers-reduced-motion') ? reducedMotion : false,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

Element.prototype.scrollIntoView = vi.fn();

afterEach(() => {
  cleanup();
  reducedMotion = false;
  window.localStorage.clear();
});
