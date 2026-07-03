import { nanoid } from "nanoid";
import { create } from "zustand";

type PuzzleSession = {
  id: string;
  /** Backend base credits, one entry per booster being opened (1 or 10). */
  bases: number[];
  /** Guaranteed minimum rarity stage for the tapped booster (pity system). */
  floor: number;
};

type BoosterPuzzleStore = {
  session: PuzzleSession | null;
  openPuzzle: (bases: number[], floor: number) => void;
  closePuzzle: () => void;
};

/** One booster-opening puzzle at a time (id re-mounts the scene). */
export const useBoosterPuzzleStore = create<BoosterPuzzleStore>((set) => ({
  session: null,
  openPuzzle: (bases, floor) => set({ session: { id: nanoid(), bases, floor } }),
  closePuzzle: () => set({ session: null }),
}));

export function openBoosterPuzzle(bases: number[], floor = 0) {
  useBoosterPuzzleStore.getState().openPuzzle(bases, floor);
}
