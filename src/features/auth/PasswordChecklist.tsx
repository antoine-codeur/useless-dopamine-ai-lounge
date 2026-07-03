import { Check, CircleDashed } from "lucide-react";
import { passwordRules } from "./validation";

/** Live checklist that ticks off each password rule as the value satisfies it. */
export function PasswordChecklist({ value }: { value: string }) {
  return (
    <div className="password-checklist" aria-live="polite">
      {passwordRules.map((rule) => {
        const passed = rule.test(value);
        return (
          <span data-valid={passed} key={rule.id}>
            {passed ? <Check size={13} /> : <CircleDashed size={13} />}
            {rule.label}
          </span>
        );
      })}
    </div>
  );
}
