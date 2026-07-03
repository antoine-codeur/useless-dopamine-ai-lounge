import { useEffect, useState } from "react";

/** Virtual-keyboard heuristic (mobile): tracks whether an editable element holds
 *  focus so the thumb bar can duck under the on-screen keyboard. Taps on composer
 *  tools blur the textarea for a beat — those must not flip the state back. */
export function useKeyboardOpen() {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    // Track editable focus so the thumb bar can duck under the virtual keyboard.
    const isEditable = (target: EventTarget | null) =>
      target instanceof HTMLElement && (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable);
    const inDock = (target: EventTarget | null) => target instanceof Element && !!target.closest(".prompt-dock");
    // Tapping a composer tool (appearance, persona, attach…) blurs the textarea
    // for a beat — the thumb bar must NOT pop back during that interaction.
    let dockInteraction = false;
    const onPointerDown = (event: PointerEvent) => {
      dockInteraction = inDock(event.target);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (isEditable(event.target)) {
        setKeyboardOpen(true);
      }
    };
    const onFocusOut = (event: FocusEvent) => {
      if (isEditable(event.target) && !inDock(event.relatedTarget) && !dockInteraction) {
        setKeyboardOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return keyboardOpen;
}
