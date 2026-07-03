import { CreditCard, Crown, Gift, MessageSquare, Package, RotateCcw, ShoppingBag, Trophy, Zap } from "lucide-react";
import { Button } from "../../components/Button/Button";
import { showToast } from "../../components/Toast/toast.store";
import { useAccountStore } from "../profile/account.store";
import { useUserStore } from "../profile/profile.store";
import { usePersonaStore } from "../personas/persona.store";
import { bumpQuest, useQuestStore } from "../quests/quest.store";
import { useShopStore } from "../shop/shop.store";
import { refundBoosters } from "../../lib/api";
import { planGainBonusLabel } from "../../lib/planPerks";
import { recordCredit, totalsBySource, useLedgerStore } from "./ledger.store";
import { REFUND_LIMIT, usePurchasesStore } from "../shop/purchases.store";
import type { Purchase } from "../shop/purchases.store";
import type { CreditSource } from "./ledger.store";
import type { PersonaId } from "../personas/personas";
import type { ThemeId } from "../../types";

const sourceMeta: Record<CreditSource, { icon: typeof Zap; label: string }> = {
  prompt: { icon: MessageSquare, label: "Prompts" },
  quest: { icon: Trophy, label: "Quests" },
  booster: { icon: Package, label: "Boosters" },
  combo: { icon: Zap, label: "Combos" },
  purchase: { icon: ShoppingBag, label: "Purchases" },
  refund: { icon: RotateCcw, label: "Refunds" },
  plan: { icon: CreditCard, label: "Plans" },
  gift: { icon: Gift, label: "Gifts" },
  season: { icon: Crown, label: "Season pass" },
};

const when = (at: string) =>
  new Date(at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** Every credit the user ever gained or spent, source by source. */
export function CreditLedgerCard() {
  const entries = useLedgerStore((state) => state.entries);
  const totals = totalsBySource(entries);

  return (
    <section className="detail-card stats-card">
      <h4><Zap size={15} /> Credit sources</h4>
      {entries.length === 0 ? <p className="muted">Every credit you earn or spend lands here — prompts, quests, boosters, combos, purchases.</p> : null}
      {totals.length > 0 ? (
        <div className="ledger-totals">
          {totals.map(({ source, total }) => {
            const Meta = sourceMeta[source].icon;
            return (
              <span className="ledger-total" data-negative={total < 0 || undefined} key={source}>
                <Meta size={12} /> {sourceMeta[source].label} {total > 0 ? "+" : ""}{total.toLocaleString()}
              </span>
            );
          })}
        </div>
      ) : null}
      <div className="ledger-list">
        {entries.slice(0, 60).map((entry) => {
          const Icon = sourceMeta[entry.source].icon;
          return (
            <div className="ledger-row" key={entry.id}>
              <span className="ledger-row__icon"><Icon size={13} /></span>
              <span className="ledger-row__reason">{entry.reason}</span>
              <span className="ledger-row__when">{when(entry.at)}</span>
              <strong className="ledger-row__delta" data-negative={entry.delta < 0 || undefined}>
                {entry.delta > 0 ? "+" : ""}{entry.delta.toLocaleString()}
              </strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Shop-side numbers: pity, packs bought/opened, refunds, plan gain bonus. */
export function ShopStatsCard() {
  const account = useAccountStore((state) => state.account);
  const counters = useQuestStore((state) => state.counters);
  const boostersOpened = useShopStore((state) => state.boostersOpened);
  const sinceRare = useShopStore((state) => state.sinceRare);
  const purchases = usePurchasesStore((state) => state.purchases);
  const refundsUsed = usePurchasesStore((state) => state.refundsUsed);
  const spentInShop = purchases.filter((purchase) => !purchase.refundedAt).reduce((sum, purchase) => sum + purchase.price, 0);
  const bonus = planGainBonusLabel(account?.plan);

  return (
    <section className="detail-card stats-card">
      <h4><Package size={15} /> Shop</h4>
      <div className="stat-row"><span>Boosters owned</span><strong>{(account?.boosters ?? 0).toLocaleString()}</strong></div>
      <div className="stat-row"><span>Boosters bought</span><strong>{(counters["booster-buys"] ?? 0).toLocaleString()}</strong></div>
      <div className="stat-row"><span>Boosters opened</span><strong>{boostersOpened.toLocaleString()}</strong></div>
      <div className="stat-row"><span>Pity — openings since a Rare+</span><strong>{sinceRare}/10</strong></div>
      <div className="stat-row"><span>Purchases made</span><strong>{purchases.length.toLocaleString()}</strong></div>
      <div className="stat-row"><span>Spent in the shop</span><strong>{spentInShop.toLocaleString()}</strong></div>
      <div className="stat-row"><span>Refunds used</span><strong>{refundsUsed}/{REFUND_LIMIT}</strong></div>
      <div className="stat-row"><span>Plan gain bonus</span><strong>{bonus ?? "—"}</strong></div>
    </section>
  );
}

/** LoL-style purchase history: 3 refunds ever, boosters only while unopened. */
export function PurchasesCard() {
  const purchases = usePurchasesStore((state) => state.purchases);
  const refundsUsed = usePurchasesStore((state) => state.refundsUsed);
  const markRefunded = usePurchasesStore((state) => state.markRefunded);
  const account = useAccountStore((state) => state.account);
  const plans = useAccountStore((state) => state.plans);
  const quests = useAccountStore((state) => state.quests);
  const setAccount = useAccountStore((state) => state.setAccount);
  const refundsLeft = Math.max(0, REFUND_LIMIT - refundsUsed);

  async function refund(purchase: Purchase) {
    if (refundsLeft === 0 || purchase.refundedAt || purchase.refundable === false) {
      return;
    }

    if (purchase.kind === "booster") {
      // Server checks the pack is still unopened, then re-credits for real.
      const result = await refundBoosters(purchase.count ?? 1).catch(() => null);

      if (!result?.ok) {
        if (result?.account) {
          setAccount(result.account, result.plans, result.quests);
        }

        showToast({
          variant: "warning",
          title: result?.error === "boosters_opened" ? "Already opened" : "Refund failed",
          description: result?.error === "boosters_opened" ? "Opened boosters can never be refunded — only unopened packs." : "The server did not confirm the refund.",
        });
        return;
      }

      setAccount(result.account, result.plans, result.quests);
    } else {
      if (!account) {
        return;
      }

      setAccount(
        { ...account, creditsRemaining: account.creditsRemaining + purchase.price },
        plans,
        quests,
      );

      if (purchase.kind === "theme") {
        useUserStore.getState().lockTheme(purchase.refId as ThemeId);
      } else if (purchase.kind === "polarized") {
        useUserStore.getState().lockPolarized();
      } else if (purchase.kind === "persona") {
        usePersonaStore.getState().lockPersona(purchase.refId as PersonaId);
      }
    }

    markRefunded(purchase.id);
    bumpQuest("refunds-used");
    recordCredit(purchase.price, `Refund: ${purchase.label}`, "refund");
    showToast({
      variant: "success",
      title: `${purchase.label} refunded`,
      description: `+${purchase.price.toLocaleString()} credits · ${Math.max(0, refundsLeft - 1)} refund${refundsLeft - 1 === 1 ? "" : "s"} left`,
    });
  }

  return (
    <section className="detail-card stats-card">
      <h4>
        <ShoppingBag size={15} /> Purchase history
        <span className="refund-pill" data-empty={refundsLeft === 0 || undefined}>
          <RotateCcw size={11} /> {refundsLeft}/{REFUND_LIMIT} refunds left
        </span>
      </h4>
      {purchases.length === 0 ? <p className="muted">Themes, personas and boosters you buy appear here — with three lifetime refunds, LoL-style.</p> : null}
      {purchases.map((purchase) => (
        <div className="ledger-row" data-refunded={!!purchase.refundedAt || undefined} key={purchase.id}>
          <span className="ledger-row__icon"><ShoppingBag size={13} /></span>
          <span className="ledger-row__reason">{purchase.label}</span>
          <span className="ledger-row__when">{when(purchase.at)}</span>
          <strong className="ledger-row__delta" data-negative>-{purchase.price.toLocaleString()}</strong>
          {purchase.refundedAt ? (
            <span className="ledger-row__status">Refunded</span>
          ) : purchase.refundable === false ? (
            <span className="ledger-row__status">Non-refundable</span>
          ) : refundsLeft > 0 ? (
            <Button onClick={() => void refund(purchase)} size="sm" type="button" variant="ghost">
              Refund
            </Button>
          ) : (
            <span className="ledger-row__status">—</span>
          )}
        </div>
      ))}
    </section>
  );
}
