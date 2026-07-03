export type Badge = {
  id: string;
  label: string;
  kind: "static" | "animated" | "seasonal" | "parody";
};

export type ThemeId =
  | "default-ai"
  | "neon-terminal"
  | "cosmic-purple"
  | "candy-fake-premium"
  | "brawl-pop"
  | "corporate-dystopia";

export type ThemeMode = "dark" | "dark-polarized" | "light" | "light-polarized";

export type ThemeVariant = {
  themeId: ThemeId;
  mode: ThemeMode;
};

export type User = {
  id: string;
  username: string;
  handle?: string;
  plan?: "free" | "pro" | "max" | "max-plus";
  credits: number;
  weeklyCreditsUsed: number;
  hourlyCreditsUsed: number;
  boosters: number;
  badges: Badge[];
  /** Unlocked theme identities (credits unlock the rest). */
  themes: ThemeId[];
  /** Polarized (high-contrast) variants are a one-time credit unlock. */
  polarizedUnlocked?: boolean;
  activeTheme: ThemeVariant;
  activityByDate: Record<string, number>;
  lastCreditGrantAt: string;
};

export type Account = {
  id: string;
  username: string;
  handle: string;
  email: string;
  plan: "free" | "pro" | "max" | "max-plus";
  planBillingCycle: "monthly" | "yearly";
  planRenewsAt: string;
  creditsRemaining: number;
  creditsUsed: number;
  boosters: number;
  /** Backend-persisted day (YYYY-MM-DD) of the last daily-booster claim. */
  dailyBoosterDay?: string | null;
  /** Backend-persisted day (YYYY-MM-DD) of the last fortune-wheel spin. */
  wheelSpinDay?: string | null;
  promptCount: number;
  createdAt: string;
  avatarDataUrl: string;
  birthDate: string;
  onboardingStep: "credentials" | "profile" | "avatar" | "birthday" | "complete";
  birthdayGiftYear: number | null;
  activityByDate: Record<string, number>;
  questClaims: Record<string, string | boolean>;
  settings: {
    themeId: ThemeId;
    themeMode: ThemeMode;
    keyboardShortcuts: boolean;
    reducedMotion: boolean;
  };
};

export type GuestSession = {
  id: string;
  creditsRemaining: number;
  creditsUsed: number;
  promptCount: number;
  createdAt: string;
  activityByDate: Record<string, number>;
};

export type Plan = {
  id: Account["plan"];
  label: string;
  monthlyCredits: number;
  upgradeCost: number;
};

export type Quest = {
  id: "daily-check-in" | "open-first-booster" | "send-three-prompts";
  label: string;
  rewardCredits: number;
  repeat: "daily" | "once";
};

export type Message = {
  id: string;
  author: "user" | "fake-ai" | "system";
  /** Active content — always mirrors variants[variantIndex] when buds exist. */
  content: string;
  createdAt: string;
  status: "queued" | "processing" | "done";
  cost: number;
  attachments?: Attachment[];
  /** All generated results for this message ("buds"); retry appends one. */
  variants?: string[];
  variantIndex?: number;
  /** Reactions are per bud, keyed by variant index (0 when no variants). */
  reactions?: Record<number, "up" | "down">;
  /** Read-later bookmarks per bud: variant index -> saved-at ISO date. */
  bookmarks?: Record<number, string>;
  /**
   * Stashed continuations per bud: when the active bud changes, the messages
   * that followed it are parked here and the new bud's tail is restored — the
   * whole tree lives inside one conversation.
   */
  tails?: Record<number, Message[]>;
  /** Which persona produced this answer (e.g. "Professor Poké"). */
  persona?: string;
  /** Generation timing: start of the current run, arrival, and duration. */
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  /** Transparent process log: tools/steps used to produce the answer. */
  steps?: string[];
};

export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  createdAt: string;
};

export type ChatThread = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  archived: boolean;
  /** Temporary chats are deleted on leave — saving anything keeps them. */
  temporary?: boolean;
};

export type ThemeTokens = {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  mutedText: string;
  primary: string;
  secondary: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  glow: string;
};

export type Theme = {
  id: ThemeId;
  label: string;
  variants: Record<ThemeMode, ThemeTokens>;
};
