import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  value: number;
  /** Starting point for the very first render (e.g. 0 for reward reveals). */
  from?: number;
  duration?: number;
};

/**
 * Animated number: eases towards `value` whenever it changes, so credits and
 * rewards are felt rather than blinked. Respects prefers-reduced-motion.
 */
export function CountUp({ value, from, duration = 800 }: CountUpProps) {
  const [display, setDisplay] = useState(from ?? value);
  const previous = useRef(from ?? value);

  useEffect(() => {
    const start = previous.current;
    previous.current = value;

    if (start === value) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (value - start) * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}
