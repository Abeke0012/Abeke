"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GLYPHS = "!<>-_\\/[]{}—=+*^?#01ABCDEFXZ$%&@░▒▓█";
const DURATION_MS = 150;
const TICK_MS = 25;

function scramble(text: string, intensity: number) {
  let out = "";
  for (const ch of text) {
    out += ch !== " " && Math.random() < intensity ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : ch;
  }
  return out;
}

/**
 * Heavy scramble: an interval loop swaps random characters every 25ms for
 * 150ms, then resolves back to the source text.
 */
export function useGlitchText(text: string) {
  const [display, setDisplay] = useState(text);
  const [glitching, setGlitching] = useState(false);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
  }, []);

  const trigger = useCallback(() => {
    stop();
    const started = performance.now();
    setGlitching(true);
    interval.current = setInterval(() => {
      const elapsed = performance.now() - started;
      if (elapsed >= DURATION_MS) {
        stop();
        setDisplay(text);
        setGlitching(false);
        return;
      }
      // Ramp from total noise toward the real string as time runs out.
      setDisplay(scramble(text, 0.85 - (elapsed / DURATION_MS) * 0.5));
    }, TICK_MS);
  }, [text, stop]);

  // Keep the label in sync if the text changes (e.g. price update).
  useEffect(() => {
    stop();
    setDisplay(text);
    setGlitching(false);
  }, [text, stop]);

  useEffect(() => stop, [stop]);

  return { display, glitching, trigger };
}
