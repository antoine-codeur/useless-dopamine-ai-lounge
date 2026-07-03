import { useState } from "react";
import type { ReactNode } from "react";
import { Check, CreditCard, Gift, ListPlus, Package, PackageOpen, Palette, Paperclip, PawPrint, Puzzle, Sparkles, SunMoon, Trophy, Zap } from "lucide-react";
import { Button } from "../../components/Button/Button";
import { showToast } from "../../components/Toast/toast.store";
import { GuestPanel } from "../account/GuestPanel";
import { applyAccountResult, useAccountStore } from "../profile/account.store";
import { useUserStore } from "../profile/profile.store";
import { buyBoosters as buyBoostersApi, claimDailyBooster as claimDailyBoosterApi, openBooster } from "../../lib/api";
import { openBoosterPuzzle } from "../rewards/puzzle.store";
import { creditGain } from "../rewards/creditCombo.store";
import { bumpQuest, useQuestStore } from "../quests/quest.store";
import { recordCredit } from "../stats/ledger.store";
import { recordPurchase } from "./purchases.store";
import { addSeasonXp } from "../season/season.store";
import { personas } from "../personas/personas";
import { usePersonaStore } from "../personas/persona.store";
import { themes } from "../themes/themes";
import { useThemeStore } from "../themes/theme.store";
import { POLARIZED_UNLOCK_COST, THEME_UNLOCK_COST } from "../themes/useThemeUnlock";
import { nextBoosterFloor, useShopStore } from "./shop.store";
import { useShellStore } from "../shell/shell.store";
import "./ShopPanel.css";

const BOOSTER_PRICE = 120;
const BOOSTER_PACK_PRICE = 1_000;

const planLabels: Record<string, string> = { free: "Free", pro: "Pro", max: "Max", "max-plus": "Max+" };

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="shop-badge">
      <Check size={12} /> {children}
    </span>
  );
}

function Price({ amount }: { amount: number }) {
  return (
    <span className="shop-price">
      {amount.toLocaleString()} <Zap size={11} />
    </span>
  );
}

type SectionProps = {
  icon: typeof Package;
  title: string;
  subtitle: string;
  aside?: ReactNode;
  children: ReactNode;
};

function ShopSection({ icon: Icon, title, subtitle, aside, children }: SectionProps) {
  return (
    <section className="shop-section">
      <header className="shop-section__head">
        <span className="shop-section__icon">
          <Icon size={17} />
        </span>
        <div className="shop-section__titles">
          <h4>{title}</h4>
          <p className="muted">{subtitle}</p>
        </div>
        {aside ? <div className="shop-section__aside">{aside}</div> : null}
      </header>
      <ul className="shop-rows">{children}</ul>
    </section>
  );
}

type RowProps = {
  visual: ReactNode;
  name: string;
  description: string;
  right: ReactNode;
};

function ShopRow({ visual, name, description, right }: RowProps) {
  return (
    <li className="shop-row">
      <span className="shop-row__visual">{visual}</span>
      <div className="shop-row__body">
        <strong>{name}</strong>
        <p>{description}</p>
      </div>
      <div className="shop-row__right">{right}</div>
    </li>
  );
}

/** The shop: buy & open boosters (the star), plus every unlockable by category. */
export function ShopPanel({ onCreateAccount, onLogin }: { onCreateAccount: () => void; onLogin: () => void }) {
  const account = useAccountStore((state) => state.account);
  const plans = useAccountStore((state) => state.plans);
  const quests = useAccountStore((state) => state.quests);
  const setAccount = useAccountStore((state) => state.setAccount);
  const user = useUserStore((state) => state.user);
  const unlockedPersonas = usePersonaStore((state) => state.unlocked);
  const activeTheme = useThemeStore((state) => state.activeTheme);
  const localBoosterDay = useQuestStore((state) => state.dailyBoosterDay);
  const setView = useShellStore((state) => state.setView);
  const boostersOpened = useShopStore((state) => state.boostersOpened);
  const sinceRare = useShopStore((state) => state.sinceRare);
  const [busyOpen, setBusyOpen] = useState(false);
  const [busyBuy, setBusyBuy] = useState(false);
  const [busyDaily, setBusyDaily] = useState(false);

  if (!account) {
    return (
      <GuestPanel
        icon={<Package size={22} />}
        title="The shop needs an account"
        text="Boosters, themes and personas persist on your account — guests keep the free credit pool."
        onCreate={onCreateAccount}
        onLogin={onLogin}
      />
    );
  }

  const floorNow = nextBoosterFloor() > 0;
  const paidPlan = account.plan !== "free";
  const today = new Date().toISOString().slice(0, 10);
  const dailyClaimed = account.dailyBoosterDay === today || localBoosterDay === today;

  /** Optimistic credit spend shared by persona/theme unlocks. */
  function spend(cost: number, what: string, onDone: () => void) {
    const current = useAccountStore.getState().account;

    if (!current) {
      return;
    }

    if (current.creditsRemaining < cost) {
      showToast({
        variant: "warning",
        title: `Missing ${(cost - current.creditsRemaining).toLocaleString()} credits`,
        description: `${what} costs ${cost.toLocaleString()} credits.`,
        actionLabel: "View plans",
        onAction: () => setView("plans"),
      });
      return;
    }

    setAccount(
      { ...current, creditsRemaining: current.creditsRemaining - cost },
      plans,
      quests,
    );
    bumpQuest("credits-spent", cost);
    recordCredit(-cost, `Bought ${what}`, "purchase");
    onDone();
  }

  function requirePaidPlan(): boolean {
    if (paidPlan) {
      return true;
    }

    showToast({
      variant: "info",
      title: "Personas are a paid-plan feature",
      description: "Upgrade with credits first — bought personas then stay on your account.",
      actionLabel: "View plans",
      onAction: () => setView("plans"),
    });
    return false;
  }

  async function buyBoosters(count: number, price: number) {
    if (busyBuy) {
      return;
    }

    setBusyBuy(true);
    const result = await buyBoostersApi(count).catch(() => null);
    setBusyBuy(false);

    if (!result?.ok) {
      if (result?.account) {
        applyAccountResult(result);
      }

      const remaining = useAccountStore.getState().account?.creditsRemaining ?? 0;
      showToast({
        variant: "warning",
        title: result?.error === "credit_limit" ? `Missing ${(price - remaining).toLocaleString()} credits` : "Purchase failed",
        description: `${count} booster${count > 1 ? "s" : ""} cost ${price.toLocaleString()} credits.`,
      });
      return;
    }

    applyAccountResult(result);
    bumpQuest("credits-spent", result.price);
    bumpQuest("booster-buys", count);
    recordCredit(-result.price, `Bought ${count} booster${count > 1 ? "s" : ""}`, "purchase");
    recordPurchase({ kind: "booster", refId: "booster", label: `Booster ×${count}`, price: result.price, count });
    showToast({ variant: "success", title: `+${count} booster${count > 1 ? "s" : ""}`, description: `-${result.price.toLocaleString()} credits` });
  }

  async function openBoosters(count: number) {
    const current = useAccountStore.getState().account;

    if (!current || busyOpen) {
      return;
    }

    if (current.boosters < count) {
      showToast({ variant: "warning", title: "Not enough boosters", description: `You own ${current.boosters}, this opening needs ${count}.` });
      return;
    }

    setBusyOpen(true);
    const bases: number[] = [];
    let last: Awaited<ReturnType<typeof openBooster>> | null = null;

    for (let index = 0; index < count; index++) {
      const result = await openBooster().catch(() => null);

      if (!result?.ok) {
        break;
      }

      last = result;
      bases.push(result.rewardCredits);
    }

    setBusyOpen(false);

    if (!last || bases.length === 0) {
      showToast({ variant: "warning", title: "Opening failed", description: "No booster could be opened." });
      return;
    }

    applyAccountResult(last);
    const totalBase = bases.reduce((sum, base) => sum + base, 0);
    bumpQuest("boosters", bases.length);
    bumpQuest("credits-earned", totalBase);
    recordCredit(totalBase, `Booster opening ×${bases.length}`, "booster");
    addSeasonXp(10 * bases.length);
    creditGain(totalBase);
    openBoosterPuzzle(bases, nextBoosterFloor());
  }

  async function claimDaily() {
    if (busyDaily || dailyClaimed) {
      return;
    }

    setBusyDaily(true);
    const result = await claimDailyBoosterApi().catch(() => null);
    setBusyDaily(false);

    if (!result?.ok) {
      if (result?.account) {
        applyAccountResult(result);
      }

      showToast({ variant: "info", title: "Already claimed today", description: "Your next booster unlocks tomorrow." });
      return;
    }

    applyAccountResult(result);
    useQuestStore.getState().claimDailyBooster();
    bumpQuest("daily-booster");
    showToast({ variant: "success", title: "Booster added", description: "Open it right here — tap fast for a higher rarity." });
  }

  // ---- Personas ------------------------------------------------------------
  const missingPersonas = personas.filter((persona) => persona.cost > 0 && !unlockedPersonas.includes(persona.id));
  const personasTotal = missingPersonas.reduce((sum, persona) => sum + persona.cost, 0);

  function buyPersona(persona: (typeof personas)[number]) {
    if (!requirePaidPlan()) {
      return;
    }

    spend(persona.cost, persona.label, () => {
      usePersonaStore.getState().unlockPersona(persona.id);
      recordPurchase({ kind: "persona", refId: persona.id, label: persona.label, price: persona.cost });
      showToast({ variant: "success", title: `${persona.label} unlocked`, description: `-${persona.cost} credits` });
    });
  }

  function buyAllPersonas() {
    if (!requirePaidPlan() || missingPersonas.length === 0) {
      return;
    }

    spend(personasTotal, `${missingPersonas.length} personas`, () => {
      missingPersonas.forEach((persona) => {
        usePersonaStore.getState().unlockPersona(persona.id);
        recordPurchase({ kind: "persona", refId: persona.id, label: persona.label, price: persona.cost });
      });
      showToast({ variant: "success", title: `${missingPersonas.length} personas unlocked`, description: `-${personasTotal.toLocaleString()} credits` });
    });
  }

  // ---- Themes --------------------------------------------------------------
  const missingThemes = themes.filter((theme) => theme.id !== "default-ai" && !user.themes.includes(theme.id));
  const polarizedOwned = !!user.polarizedUnlocked;
  const themesTotal = missingThemes.length * THEME_UNLOCK_COST + (polarizedOwned ? 0 : POLARIZED_UNLOCK_COST);

  function buyTheme(themeId: (typeof themes)[number]["id"], label: string) {
    spend(THEME_UNLOCK_COST, label, () => {
      useUserStore.getState().unlockTheme(themeId);
      recordPurchase({ kind: "theme", refId: themeId, label, price: THEME_UNLOCK_COST });
      showToast({ variant: "success", title: `${label} unlocked`, description: `-${THEME_UNLOCK_COST} credits` });
    });
  }

  function buyPolarized() {
    spend(POLARIZED_UNLOCK_COST, "High-contrast variants", () => {
      useUserStore.getState().unlockPolarized();
      recordPurchase({ kind: "polarized", refId: "polarized", label: "High-contrast variants", price: POLARIZED_UNLOCK_COST });
      showToast({ variant: "success", title: "High-contrast variants unlocked", description: `-${POLARIZED_UNLOCK_COST} credits` });
    });
  }

  function buyAllThemes() {
    if (themesTotal === 0) {
      return;
    }

    spend(themesTotal, "Every theme", () => {
      missingThemes.forEach((theme) => {
        useUserStore.getState().unlockTheme(theme.id);
        recordPurchase({ kind: "theme", refId: theme.id, label: theme.label, price: THEME_UNLOCK_COST });
      });

      if (!polarizedOwned) {
        useUserStore.getState().unlockPolarized();
        recordPurchase({ kind: "polarized", refId: "polarized", label: "High-contrast variants", price: POLARIZED_UNLOCK_COST });
      }

      showToast({ variant: "success", title: "Every theme unlocked", description: `-${themesTotal.toLocaleString()} credits` });
    });
  }

  return (
    <section className="content-panel shop-panel">
      <div className="page-heading">
        <div>
          <h3>Shop</h3>
          <p className="muted">Everything unlockable in one place — by credits, missions, or plans.</p>
        </div>
      </div>

      {/* Flagship: booster opening. */}
      <section className="shop-hero">
        <div className="shop-hero__icon">
          <PackageOpen size={30} />
        </div>
        <div className="shop-hero__meta">
          <h4>Boosters</h4>
          <p className="muted">Open them as tappable puzzles — rarity climbs with your combo.</p>
          <p className="shop-hero__pity" data-guaranteed={floorNow || undefined}>
            {boostersOpened === 0 || floorNow ? <Sparkles size={13} /> : null}
            {boostersOpened === 0
              ? "First opening: RARE minimum guaranteed"
              : floorNow
                ? "Next opening: RARE minimum guaranteed"
                : `Pity ${sinceRare}/10 — a Rare+ is guaranteed within ${10 - sinceRare} opening${10 - sinceRare > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="shop-hero__count">
          <strong>{account.boosters}</strong>
          <span>owned</span>
        </div>
        <div className="shop-hero__actions">
          <Button disabled={busyBuy} onClick={() => void buyBoosters(1, BOOSTER_PRICE)} type="button" variant="secondary">
            <Gift size={15} /> Buy ×1 · {BOOSTER_PRICE} <Zap size={12} />
          </Button>
          <Button disabled={busyBuy} loading={busyBuy} onClick={() => void buyBoosters(10, BOOSTER_PACK_PRICE)} type="button" variant="secondary">
            <Package size={15} /> Buy ×10 · {BOOSTER_PACK_PRICE.toLocaleString()} <Zap size={12} />
          </Button>
          <Button disabled={busyOpen || account.boosters < 1} loading={busyOpen} onClick={() => void openBoosters(1)} type="button">
            <PackageOpen size={15} /> Open ×1
          </Button>
          <Button disabled={busyOpen || account.boosters < 10} onClick={() => void openBoosters(10)} type="button">
            <PackageOpen size={15} /> Open ×10
          </Button>
        </div>
      </section>

      <ShopSection
        icon={PawPrint}
        title="Personas"
        subtitle={paidPlan ? "Each parser answers with its own random knowledge." : "Using personas needs a paid plan — bought ones stay on your account."}
        aside={
          missingPersonas.length === 0 ? (
            <Badge>All owned</Badge>
          ) : (
            <Button onClick={buyAllPersonas} size="sm" type="button" variant="secondary">
              Buy all · {personasTotal.toLocaleString()} <Zap size={12} />
            </Button>
          )
        }
      >
        {personas.map((persona) => {
          const owned = persona.cost === 0 || unlockedPersonas.includes(persona.id);

          return (
            <ShopRow
              description={persona.description}
              key={persona.id}
              name={persona.label}
              right={
                persona.cost === 0 ? (
                  <Badge>Included</Badge>
                ) : owned ? (
                  <Badge>Owned</Badge>
                ) : (
                  <>
                    <Price amount={persona.cost} />
                    <Button onClick={() => buyPersona(persona)} size="sm" type="button" variant="secondary">
                      Buy
                    </Button>
                  </>
                )
              }
              visual={<persona.icon size={17} />}
            />
          );
        })}
      </ShopSection>

      <ShopSection
        icon={Palette}
        title="Themes"
        subtitle="Whole-app identities — pick your vibe, keep it on your account."
        aside={
          themesTotal === 0 ? (
            <Badge>All owned</Badge>
          ) : (
            <Button onClick={buyAllThemes} size="sm" type="button" variant="secondary">
              Buy all · {themesTotal.toLocaleString()} <Zap size={12} />
            </Button>
          )
        }
      >
        {themes.map((theme) => {
          const owned = theme.id === "default-ai" || user.themes.includes(theme.id);
          const active = activeTheme.themeId === theme.id;
          const base = theme.variants.dark;

          return (
            <ShopRow
              description={`${base.primary.toUpperCase()} · ${base.secondary.toUpperCase()}`}
              key={theme.id}
              name={theme.label}
              right={
                active ? (
                  <Badge>Active</Badge>
                ) : owned ? (
                  <>
                    {theme.id === "default-ai" ? <Badge>Included</Badge> : <Badge>Owned</Badge>}
                    <Button
                      onClick={() => useThemeStore.getState().setActiveTheme({ themeId: theme.id, mode: activeTheme.mode })}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Use
                    </Button>
                  </>
                ) : (
                  <>
                    <Price amount={THEME_UNLOCK_COST} />
                    <Button onClick={() => buyTheme(theme.id, theme.label)} size="sm" type="button" variant="secondary">
                      Buy
                    </Button>
                  </>
                )
              }
              visual={<span aria-hidden className="shop-swatch" style={{ background: `linear-gradient(135deg, ${base.primary}, ${base.secondary})` }} />}
            />
          );
        })}
        <ShopRow
          description="Polarized light & dark for every theme — one unlock covers them all."
          name="High-contrast variants"
          right={
            polarizedOwned ? (
              <Badge>Owned</Badge>
            ) : (
              <>
                <Price amount={POLARIZED_UNLOCK_COST} />
                <Button onClick={buyPolarized} size="sm" type="button" variant="secondary">
                  Buy
                </Button>
              </>
            )
          }
          visual={<SunMoon size={17} />}
        />
      </ShopSection>

      <ShopSection icon={CreditCard} title="Plan perks" subtitle={`Included with paid plans — you are on ${planLabels[account.plan] ?? account.plan}.`}>
        <ShopRow
          description="Attach images and files to your prompts."
          name="File attachments"
          right={
            paidPlan ? (
              <Badge>In your plan</Badge>
            ) : (
              <Button onClick={() => setView("plans")} size="sm" type="button" variant="ghost">
                See plans →
              </Button>
            )
          }
          visual={<Paperclip size={17} />}
        />
        <ShopRow
          description="Stack prompts and let the agent chain them."
          name="Message queue"
          right={
            paidPlan ? (
              <Badge>In your plan</Badge>
            ) : (
              <Button onClick={() => setView("plans")} size="sm" type="button" variant="ghost">
                See plans →
              </Button>
            )
          }
          visual={<ListPlus size={17} />}
        />
        <ShopRow
          description="Pro, Max and Max+ unlock with credits — no card, ever."
          name="Plans"
          right={
            <Button onClick={() => setView("plans")} size="sm" type="button" variant="ghost">
              {paidPlan ? `Current: ${planLabels[account.plan]}` : "Choose a plan"} →
            </Button>
          }
          visual={<CreditCard size={17} />}
        />
      </ShopSection>

      <ShopSection icon={Trophy} title="Free & missions" subtitle="Earn instead of spend — dailies and 600+ achievements pay credits back.">
        <ShopRow
          description="One free booster every day — claim it without leaving the shop."
          name="Daily booster"
          right={
            dailyClaimed ? (
              <Badge>Claimed today</Badge>
            ) : (
              <Button disabled={busyDaily} loading={busyDaily} onClick={() => void claimDaily()} size="sm" type="button">
                Claim
              </Button>
            )
          }
          visual={<Puzzle size={17} />}
        />
        <ShopRow
          description="600+ tiered quests that pay credits back."
          name="Achievements"
          right={
            <Button onClick={() => setView("quests")} size="sm" type="button" variant="ghost">
              Open quests →
            </Button>
          }
          visual={<Trophy size={17} />}
        />
      </ShopSection>
    </section>
  );
}
