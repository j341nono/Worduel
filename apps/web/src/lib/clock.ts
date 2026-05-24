"use client";
import { useEffect, useState } from "react";

// A re-render hook that ticks every `intervalMs`. Used for countdown displays.
export function useTick(intervalMs = 250): number {
  const [, setT] = useState(0);
  useEffect(() => {
    const handle = setInterval(() => setT((t) => t + 1), intervalMs);
    return () => clearInterval(handle);
  }, [intervalMs]);
  return Date.now();
}
