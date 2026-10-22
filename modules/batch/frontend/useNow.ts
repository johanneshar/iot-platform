import { useEffect, useState } from 'react';

/** Aktuelle Zeit, die sich alle `intervalMs` erneuert – für laufende Kennzahlen. */
export function useNow(intervalMs = 5_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, intervalMs);
    return () => {
      clearInterval(timer);
    };
  }, [intervalMs]);
  return now;
}
