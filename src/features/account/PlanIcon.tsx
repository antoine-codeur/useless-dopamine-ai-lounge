import { Crown, Rocket, ShieldCheck, Star } from "lucide-react";
import type { Plan } from "../../types";

/** Maps a plan tier to its emblem: Max+ crown, Max rocket, Pro star, Free shield. */
export function PlanIcon({ planId }: { planId: Plan["id"] }) {
  if (planId === "max-plus") {
    return <Crown size={18} />;
  }

  if (planId === "max") {
    return <Rocket size={18} />;
  }

  if (planId === "pro") {
    return <Star size={18} />;
  }

  return <ShieldCheck size={18} />;
}
