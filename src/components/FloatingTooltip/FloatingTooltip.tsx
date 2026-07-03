import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./FloatingTooltip.css";

export type TooltipAnchor = {
  label: string;
  left: number;
  top: number;
  bottom: number;
  width: number;
};

/**
 * Viewport-aware tooltip: measured after render (pre-paint), clamped
 * horizontally to its own width and flipped above the anchor when it would
 * overflow the bottom edge — so it is never cut by screen or container edges.
 */
export function FloatingTooltip({ anchor }: { anchor: TooltipAnchor }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const margin = 8;
    const half = element.offsetWidth / 2;
    const center = Math.min(window.innerWidth - margin - half, Math.max(margin + half, anchor.left + anchor.width / 2));
    let top = anchor.bottom + margin;

    if (top + element.offsetHeight > window.innerHeight - margin) {
      top = anchor.top - margin - element.offsetHeight;
    }

    element.style.left = `${center}px`;
    element.style.top = `${top}px`;
  }, [anchor]);

  return createPortal(
    <div className="floating-tooltip" ref={ref} role="tooltip">
      {anchor.label}
    </div>,
    document.body,
  );
}
