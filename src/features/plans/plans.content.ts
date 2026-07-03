import {
  BookOpen,
  CalendarDays,
  Crown,
  Gift,
  ImagePlus,
  MessageSquare,
  Paperclip,
  Rocket,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import type { Account } from "../../types";

type PlanFeature = { icon: typeof Zap; label: string };

export type PlanContent = {
  tagline: string;
  /** Name of the tier this plan inherits from ("Everything in X and:"). */
  inherits?: string;
  recommended?: boolean;
  features: PlanFeature[];
};

/** Marketing copy per tier — the numbers still come from the plans API. */
export const planContent: Record<Account["plan"], PlanContent> = {
  free: {
    tagline: "Start the loop with real guest credits",
    features: [
      { icon: MessageSquare, label: "Core simulated chat" },
      { icon: BookOpen, label: "Random wiki answers in markdown" },
      { icon: CalendarDays, label: "Activity tracking and streaks" },
      { icon: ImagePlus, label: "Gallery of everything you share" },
    ],
  },
  pro: {
    tagline: "Unlock the full experience",
    inherits: "Free",
    features: [
      { icon: Paperclip, label: "File attachments in messages" },
      { icon: Zap, label: "4× more monthly credits" },
      { icon: Gift, label: "Booster drops from quests" },
      { icon: Star, label: "Priority simulated model" },
      { icon: Trophy, label: "Daily quest multipliers" },
    ],
  },
  max: {
    tagline: "Go further, feel more",
    inherits: "Pro",
    recommended: true,
    features: [
      { icon: TrendingUp, label: "5× more usage than Pro" },
      { icon: Rocket, label: "Frontier simulated reasoning" },
      { icon: Sparkles, label: "Faster, shinier celebrations" },
      { icon: Gift, label: "Bonus booster every cycle" },
    ],
  },
  "max-plus": {
    tagline: "Maximize your dopamine",
    inherits: "Max",
    features: [
      { icon: Crown, label: "Everything, without limits" },
      { icon: Zap, label: "20× credit ceiling" },
      { icon: Sparkles, label: "Early access to experiments" },
      { icon: Trophy, label: "Exclusive birthday multiplier" },
    ],
  },
};
