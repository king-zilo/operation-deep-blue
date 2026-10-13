import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY).matches : false,
  );
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mql = window.matchMedia(QUERY);
    const onChange = (e) => setPrefers(e.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);
  return prefers;
}
