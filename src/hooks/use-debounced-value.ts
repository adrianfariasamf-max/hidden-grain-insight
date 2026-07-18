import { useEffect, useState } from "react";

/**
 * Returns a value that only updates after `delay` ms of stability.
 * Used to keep the URL search param `q` from being rewritten on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
