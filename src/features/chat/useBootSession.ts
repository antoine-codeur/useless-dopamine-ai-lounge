import { useEffect, useState } from "react";
import type { GuestSession } from "../../types";
import { getAuthToken, loadGuestSession, loadSession } from "../../lib/api";
import { applyAccountResult, useAccountStore } from "../profile/account.store";
import { scopeIsNew, switchDataScope } from "../../lib/accountScope";

/** Boots the session: restores the account (or guest) into the live data scope
 *  and probes the backend health endpoint. Owns the `isBooting` gate and the
 *  `backendStatus` pill state. */
export function useBootSession(setGuest: (guest: GuestSession | null) => void) {
  const setAccount = useAccountStore((state) => state.setAccount);
  const setPlans = useAccountStore((state) => state.setPlans);
  const [isBooting, setIsBooting] = useState(true);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    if (!getAuthToken()) {
      // Guest identity: make sure the guest data bucket is the live one.
      if (switchDataScope("guest")) {
        window.location.reload();
        return;
      }

      loadGuestSession().then((result) => {
        if (result.ok && result.guest) {
          setGuest(result.guest);
          setPlans(result.plans);
        }
        setIsBooting(false);
      });
      return;
    }

    loadSession().then((result) => {
      if (result.ok && result.account) {
        // Bind every unlock/conversation/etc. to this account. First scoping
        // of a pre-existing session carries the accumulated data over.
        if (switchDataScope(result.account.id, scopeIsNew(result.account.id))) {
          window.location.reload();
          return;
        }

        applyAccountResult(result);
      } else {
        loadGuestSession().then((guestResult) => {
          if (guestResult.ok && guestResult.guest) {
            setGuest(guestResult.guest);
            setPlans(guestResult.plans);
          }
        });
      }
      setIsBooting(false);
    });
  }, [setAccount, setPlans]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/v1/health", { signal: controller.signal })
      .then((response) => {
        setBackendStatus(response.ok ? "online" : "offline");
      })
      .catch(() => {
        setBackendStatus("offline");
      });

    return () => controller.abort();
  }, []);

  return { isBooting, backendStatus };
}
