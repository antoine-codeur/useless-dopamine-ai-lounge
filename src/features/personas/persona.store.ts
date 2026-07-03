import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PersonaId } from "./personas";

type PersonaStore = {
  activePersonaId: PersonaId;
  /** Bought personas — The Librarian is always included. */
  unlocked: PersonaId[];
  setActivePersona: (id: PersonaId) => void;
  unlockPersona: (id: PersonaId) => void;
  /** Refunds re-lock; the Librarian takes over if the refunded one was active. */
  lockPersona: (id: PersonaId) => void;
};

export const usePersonaStore = create<PersonaStore>()(
  persist(
    (set) => ({
      activePersonaId: "librarian",
      unlocked: ["librarian"],
      setActivePersona: (activePersonaId) => set({ activePersonaId }),
      unlockPersona: (id) =>
        set((state) => (state.unlocked.includes(id) ? state : { unlocked: [...state.unlocked, id] })),
      lockPersona: (id) =>
        set((state) => ({
          unlocked: state.unlocked.filter((persona) => persona !== id),
          activePersonaId: state.activePersonaId === id ? "librarian" : state.activePersonaId,
        })),
    }),
    { name: "uda:persona" },
  ),
);
