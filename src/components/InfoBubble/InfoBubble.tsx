import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";

type Anchor = { left: number; top: number; bottom: number; width: number };

/**
 * Small "?" trigger that reveals a portal-rendered bubble on hover/focus.
 * The bubble is measured post-render and clamped/flipped so it is never cut
 * by the viewport; a short close timer lets the pointer travel into it.
 */
export function InfoBubble({ children, label }: { children: ReactNode; label: string }) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const closeTimer = useRef<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimer.current) {
        window.clearTimeout(closeTimer.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    const element = contentRef.current;

    if (!element || !anchor) {
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

  function clearCloseTimer() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openBubble() {
    clearCloseTimer();
    const rect = triggerRef.current?.getBoundingClientRect();

    if (rect) {
      setAnchor({ left: rect.left, top: rect.top, bottom: rect.bottom, width: rect.width });
    }
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setAnchor(null), 120);
  }

  const open = anchor !== null;

  return (
    <span className="info-bubble" onBlur={scheduleClose} onFocus={openBubble} onMouseEnter={openBubble} onMouseLeave={scheduleClose}>
      <button aria-expanded={open} aria-label={label} className="info-bubble__trigger" onClick={() => (open ? setAnchor(null) : openBubble())} ref={triggerRef} type="button">
        <HelpCircle size={14} />
      </button>
      {open
        ? createPortal(
            <span
              className="info-bubble__content info-bubble__content--portal"
              onMouseEnter={clearCloseTimer}
              onMouseLeave={scheduleClose}
              ref={contentRef}
              role="tooltip"
            >
              {children}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
