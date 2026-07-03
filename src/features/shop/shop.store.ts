import { create } from "zustand";
import { persist } from "zustand/middleware";

type ShopStore = {
  /** Lifetime boosters opened (pity: the very first is Rare minimum). */
  boostersOpened: number;
  /** Openings since the last Rare-or-better (pity: 1 per batch of 10). */
  sinceRare: number;
  recordOpening: (stage: number) => void;
};

/** Rare = stage index 2 in the puzzle's rarity ladder. */
export const RARE_STAGE = 2;

export const useShopStore = create<ShopStore>()(
  persist(
    (set, get) => ({
      boostersOpened: 0,
      sinceRare: 0,
      recordOpening: (stage) => {
        set({
          boostersOpened: get().boostersOpened + 1,
          sinceRare: stage >= RARE_STAGE ? 0 : get().sinceRare + 1,
        });
      },
    }),
    { name: "uda:shop" },
  ),
);

/** Guaranteed minimum rarity for the NEXT opening (0 = none, 2 = Rare). */
export function nextBoosterFloor(): number {
  const { boostersOpened, sinceRare } = useShopStore.getState();

  if (boostersOpened === 0 || sinceRare >= 9) {
    return RARE_STAGE;
  }

  return 0;
}
