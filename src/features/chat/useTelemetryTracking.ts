import { useEffect } from "react";
import type { Account } from "../../types";
import type { ShellView } from "../shell/shell.store";
import { useTelemetryStore } from "../stats/telemetry.store";

/** Global interaction telemetry: click classification by region, time spent per
 *  page, and the plan journey. Installed once; page/plan trackers follow their
 *  inputs. */
export function useTelemetryTracking(view: ShellView, plan: Account["plan"] | undefined) {
  useEffect(() => {
    // Global interaction telemetry: every button click, classified by region.
    useTelemetryStore.getState().recordBoot();

    const regionOf = (element: Element) => {
      if (element.closest(".sidebar")) return "sidebar";
      if (element.closest(".topbar")) return "topbar";
      if (element.closest(".prompt-form") || element.closest(".prompt-dock")) return "composer";
      if (element.closest(".inspector")) return "inspector";
      if (element.closest(".chat-bubble")) return "chat";
      if (element.closest(".account-popover")) return "account-menu";
      if (element.closest(".mode-menu__popover") || element.closest(".thread-menu")) return "menus";
      if (element.closest(".toaster")) return "toasts";
      if (element.closest(".modal-backdrop") || element.closest(".reward-backdrop")) return "modals";
      if (element.closest(".content-panel")) return "pages";
      return "app";
    };

    const onClick = (event: globalThis.MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("button, a") : null;

      if (!target) {
        return;
      }

      const label = (target.getAttribute("aria-label") ?? target.textContent ?? "button").trim().slice(0, 32) || "button";
      useTelemetryStore.getState().recordClick(`${regionOf(target)}/${label}`);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- installed once
  }, []);

  useEffect(() => {
    // Time spent per page.
    const startedAt = Date.now();
    return () => useTelemetryStore.getState().addPageTime(view, (Date.now() - startedAt) / 1000);
  }, [view]);

  useEffect(() => {
    // Plan journey: switches and time spent per plan (guests count too).
    useTelemetryStore.getState().trackPlan(plan ?? "guest");
  }, [plan]);
}
