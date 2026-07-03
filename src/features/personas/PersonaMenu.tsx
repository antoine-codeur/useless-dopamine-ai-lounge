import { useState } from "react";
import { Check, Lock, Zap } from "lucide-react";
import { IconButton } from "../../components/Button/Button";
import { showToast } from "../../components/Toast/toast.store";
import { useDismiss } from "../../lib/useDismiss";
import { getPersona, personas } from "./personas";
import { usePersonaStore } from "./persona.store";
import { recordCredit } from "../stats/ledger.store";
import { recordPurchase } from "../shop/purchases.store";
import { bumpQuest } from "../quests/quest.store";
import { useAccountStore } from "../profile/account.store";
import { useShellStore } from "../shell/shell.store";
import type { Persona } from "./personas";
// Shares the ModeMenu popover look & feel.
import "../themes/ModeMenu.css";

/**
 * Composer persona picker. The feature itself unlocks with a paid plan;
 * individual personas are then bought with credits (The Librarian is free).
 */
export function PersonaMenu() {
  const [open, setOpen] = useState(false);
  const activePersonaId = usePersonaStore((state) => state.activePersonaId);
  const unlocked = usePersonaStore((state) => state.unlocked);
  const setActivePersona = usePersonaStore((state) => state.setActivePersona);
  const unlockPersona = usePersonaStore((state) => state.unlockPersona);
  const account = useAccountStore((state) => state.account);
  const plans = useAccountStore((state) => state.plans);
  const quests = useAccountStore((state) => state.quests);
  const setAccount = useAccountStore((state) => state.setAccount);
  const setView = useShellStore((state) => state.setView);
  const menuRef = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const active = getPersona(activePersonaId);
  const featureLocked = !account || account.plan === "free";

  function pickPersona(persona: Persona) {
    const owned = persona.cost === 0 || unlocked.includes(persona.id);

    if (!owned) {
      if (!account) {
        return;
      }

      if (account.creditsRemaining < persona.cost) {
        showToast({
          variant: "warning",
          title: `Missing ${(persona.cost - account.creditsRemaining).toLocaleString()} credits`,
          description: `${persona.label} costs ${persona.cost.toLocaleString()} credits.`,
          actionLabel: "View plans",
          onAction: () => setView("plans"),
        });
        return;
      }

      setAccount(
        { ...account, creditsRemaining: account.creditsRemaining - persona.cost },
        plans,
        quests,
      );
      unlockPersona(persona.id);
      bumpQuest("credits-spent", persona.cost);
      recordCredit(-persona.cost, `Bought ${persona.label}`, "purchase");
      recordPurchase({ kind: "persona", refId: persona.id, label: persona.label, price: persona.cost });
      showToast({ variant: "success", title: `${persona.label} unlocked`, description: `-${persona.cost} credits` });
    }

    setActivePersona(persona.id);
    setOpen(false);
  }

  if (featureLocked) {
    return (
      <IconButton
        className="composer-tool composer-tool--locked"
        label="Personas unlock with a paid plan"
        tooltip="Personas — unlock with a paid plan"
        onClick={() =>
          showToast({
            variant: "info",
            title: "Personas are a paid-plan feature",
            description: "Upgrade to switch parsers: Pokémon, Yu-Gi-Oh!, One Piece, beers…",
            actionLabel: "View plans",
            onAction: () => setView("plans"),
          })
        }
        type="button"
      >
        <Lock size={16} />
      </IconButton>
    );
  }

  return (
    <div className="mode-menu" ref={menuRef}>
      <IconButton
        aria-expanded={open}
        className="composer-tool"
        data-active={open || undefined}
        label={`Persona: ${active.label}`}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <active.icon size={18} />
      </IconButton>
      {open ? (
        <div aria-label="Persona" className="mode-menu__popover" role="menu">
          {personas.map((persona) => {
            const isActive = persona.id === activePersonaId;
            const owned = persona.cost === 0 || unlocked.includes(persona.id);

            return (
              <button
                aria-checked={isActive}
                data-active={isActive}
                data-locked={!owned || undefined}
                key={persona.id}
                onClick={() => pickPersona(persona)}
                role="menuitemradio"
                type="button"
              >
                <persona.icon size={15} />
                <span className="mode-menu__persona">
                  {persona.label}
                  <small>{persona.description}</small>
                </span>
                {!owned ? (
                  <span className="mode-menu__lock">
                    <Lock size={12} /> {persona.cost} <Zap size={11} />
                  </span>
                ) : isActive ? (
                  <Check className="mode-menu__check" size={14} />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
