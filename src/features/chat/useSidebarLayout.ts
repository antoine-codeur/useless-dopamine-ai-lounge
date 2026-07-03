import { useEffect, useState } from "react";

/** Owns the sidebar / inspector layout: collapsed states (persisted), the
 *  resizable sidebar width, the drag-to-resize gesture, the phone drawer, and
 *  the responsive rules that force the icon rail on small screens. */
export function useSidebarLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("uda:sidebar-collapsed") === "true");
  const [inspectorCollapsed, setInspectorCollapsed] = useState(() => localStorage.getItem("uda:inspector-collapsed") === "true");
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem("uda:sidebar-width") ?? 280));
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  // Phone-only: the sidebar becomes a drawer (threads, nav, account menu).
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("uda:sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem("uda:inspector-collapsed", String(inspectorCollapsed));
  }, [inspectorCollapsed]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setSidebarCollapsed((value) => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // The drawer shows the FULL sidebar (labels + threads), never the icon rail.
  useEffect(() => {
    if (mobileNavOpen) {
      setSidebarCollapsed(false);
      return;
    }

    if (window.matchMedia("(max-width: 760px)").matches) {
      setSidebarCollapsed(true);
    }
  }, [mobileNavOpen]);

  useEffect(() => {
    // Phone layout keeps only the icon rail: force-collapse when entering it.
    const media = window.matchMedia("(max-width: 760px)");
    const apply = (matches: boolean) => {
      if (matches) {
        setSidebarCollapsed(true);
      }
    };

    apply(media.matches);
    const onChange = (event: MediaQueryListEvent) => apply(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    localStorage.setItem("uda:sidebar-width", String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isResizingSidebar) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.clientX <= 96) {
        setSidebarCollapsed(true);
        return;
      }

      setSidebarCollapsed(false);
      setSidebarWidth(Math.min(420, Math.max(220, event.clientX)));
    };
    const onPointerUp = () => setIsResizingSidebar(false);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isResizingSidebar]);

  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    inspectorCollapsed,
    setInspectorCollapsed,
    sidebarWidth,
    setSidebarWidth,
    isResizingSidebar,
    setIsResizingSidebar,
    mobileNavOpen,
    setMobileNavOpen,
  };
}
