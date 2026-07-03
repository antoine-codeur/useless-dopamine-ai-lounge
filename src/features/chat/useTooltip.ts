import { FocusEvent as ReactFocusEvent, PointerEvent as ReactPointerEvent, useState } from "react";
import type { TooltipAnchor } from "../../components/FloatingTooltip/FloatingTooltip";

/** Owns the floating tooltip: tracks the hovered/focused `[data-tooltip]` anchor
 *  and exposes the pointer/focus handlers the app shell binds at its root. */
export function useTooltip() {
  const [floatingTooltip, setFloatingTooltip] = useState<TooltipAnchor | null>(null);

  function showTooltipFor(element: HTMLElement) {
    // Touch fires pointerover on tap; without this guard the tooltip flashes on
    // every tap. Hover-capable pointers still get it; labels have aria fallbacks.
    if (!window.matchMedia("(hover: hover)").matches) {
      return;
    }

    const label = element.dataset.tooltip;

    if (!label) {
      return;
    }

    const rect = element.getBoundingClientRect();
    setFloatingTooltip({ label, left: rect.left, top: rect.top, bottom: rect.bottom, width: rect.width });
  }

  function tooltipTarget(target: EventTarget | null) {
    return target instanceof Element ? target.closest<HTMLElement>("[data-tooltip]") : null;
  }

  function handleTooltipPointerOver(event: ReactPointerEvent<HTMLElement>) {
    const element = tooltipTarget(event.target);

    if (element) {
      showTooltipFor(element);
    }
  }

  function handleTooltipPointerOut(event: ReactPointerEvent<HTMLElement>) {
    const element = tooltipTarget(event.target);
    const nextTarget = event.relatedTarget;

    if (element && nextTarget instanceof Node && element.contains(nextTarget)) {
      return;
    }

    setFloatingTooltip(null);
  }

  function handleTooltipFocus(event: ReactFocusEvent<HTMLElement>) {
    const element = tooltipTarget(event.target);

    if (element) {
      showTooltipFor(element);
    }
  }

  function handleTooltipBlur() {
    setFloatingTooltip(null);
  }

  return { floatingTooltip, handleTooltipPointerOver, handleTooltipPointerOut, handleTooltipFocus, handleTooltipBlur };
}
