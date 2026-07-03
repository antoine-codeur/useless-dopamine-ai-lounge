import { ArrowLeft, Check, Zap } from "lucide-react";
import { Button } from "../../components/Button/Button";
import { PlanIcon } from "../account/PlanIcon";
import { planContent } from "./plans.content";
import { useAccountStore } from "../profile/account.store";
import { useShellStore } from "../shell/shell.store";
import type { Account } from "../../types";

type BillingCycle = Account["planBillingCycle"];

type PlansPanelProps = {
  limitReached: boolean;
  billingCycle: BillingCycle;
  onBillingCycleChange: (cycle: BillingCycle) => void;
  onChoosePlan: (planId: Account["plan"]) => void;
};

/** ChatGPT-style plan chooser: price hero, tagline, CTA, and feature lists. */
export function PlansPanel({ limitReached, billingCycle, onBillingCycleChange, onChoosePlan }: PlansPanelProps) {
  const plans = useAccountStore((state) => state.plans);
  const account = useAccountStore((state) => state.account);
  const setView = useShellStore((state) => state.setView);
  const yearly = billingCycle === "yearly";

  return (
    <section className="content-panel plans-panel">
      <button className="plans-panel__back" onClick={() => setView("chat")} type="button">
        <ArrowLeft size={16} />
        Back
      </button>
      <div className="plans-panel__heading">
        <h3>{limitReached ? "Credit limit reached — pick your next plan" : "Choose your plan"}</h3>
        <p className="muted">Plans unlock with credits. Monthly renews in a month, yearly in a year.</p>
        <div aria-label="Billing cycle" className="billing-toggle plans-panel__cycle" role="tablist">
          <button aria-selected={!yearly} data-active={!yearly} onClick={() => onBillingCycleChange("monthly")} role="tab" type="button">
            Monthly
          </button>
          <button aria-selected={yearly} data-active={yearly} onClick={() => onBillingCycleChange("yearly")} role="tab" type="button">
            Yearly
          </button>
        </div>
      </div>

      <div className="plan-grid">
        {plans.map((plan) => {
          const content = planContent[plan.id];
          const unlockCost = yearly ? plan.upgradeCost * 10 : plan.upgradeCost;
          const isCurrent = !!account && plan.id === account.plan && billingCycle === (account.planBillingCycle ?? "monthly");
          const locked = !!account && !isCurrent && account.creditsRemaining < unlockCost;
          const missing = locked && account ? unlockCost - account.creditsRemaining : 0;

          return (
            <article className="plan-card" data-active={isCurrent} data-recommended={content?.recommended || undefined} key={plan.id}>
              {content?.recommended ? <span className="plan-card__badge">Recommended</span> : null}
              <div className="plan-card__header">
                <span className="plan-card__icon"><PlanIcon planId={plan.id} /></span>
                <strong>{plan.label}</strong>
              </div>

              <div className="plan-card__price">
                <Zap aria-hidden="true" size={18} />
                <strong>{unlockCost === 0 ? "0" : unlockCost.toLocaleString()}</strong>
                <span>
                  credits to unlock
                  <br />
                  {plan.monthlyCredits.toLocaleString()} credits / {yearly ? "year" : "month"}
                </span>
              </div>

              {content ? <p className="plan-card__tagline">{content.tagline}</p> : null}

              <Button
                className="plan-card__cta"
                disabled={isCurrent || locked}
                onClick={() => onChoosePlan(plan.id)}
                type="button"
                variant={content?.recommended && !isCurrent ? "primary" : "secondary"}
              >
                {isCurrent ? (
                  <>
                    <Check size={16} />
                    Current plan
                  </>
                ) : (
                  `Switch to ${plan.label}`
                )}
              </Button>

              {locked ? <small className="plan-card__missing">Missing {missing.toLocaleString()} credits — complete quests or open boosters</small> : null}

              <ul className="plan-card__features">
                {content?.inherits ? <li className="plan-card__inherits">Everything in {content.inherits} and:</li> : null}
                {content?.features.map((feature) => (
                  <li key={feature.label}>
                    <feature.icon aria-hidden="true" size={15} />
                    {feature.label}
                  </li>
                ))}
              </ul>

              {isCurrent && account?.planRenewsAt ? <small className="plan-card__renews">Renews {account.planRenewsAt}</small> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
