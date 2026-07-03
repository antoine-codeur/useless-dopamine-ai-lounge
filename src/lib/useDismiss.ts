import { useEffect, useRef } from "react";

/**
 * Dismiss-on-outside-interaction for popovers and menus: closes on any
 * pointerdown outside the returned ref, and on Escape. Attach the ref to the
 * element that should stay interactive while open.
 */
export function useDismiss<T extends HTMLElement = HTMLDivElement>(active: boolean, onDismiss: () => void) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && event.target instanceof Node && !ref.current.contains(event.target)) {
        onDismiss();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss();
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  });

  return ref;
}
