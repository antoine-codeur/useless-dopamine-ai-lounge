import {
  Bookmark,
  BookmarkCheck,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Clock,
  Compass,
  Copy,
  Crown,
  ExternalLink,
  Feather,
  Flame,
  Ghost,
  Gift,
  Gem,
  GitBranch,
  KeyRound,
  Medal,
  MessageSquare,
  MessageSquarePlus,
  MousePointerClick,
  Palette,
  Paperclip,
  Pencil,
  Puzzle,
  Repeat,
  RotateCcw,
  Save,
  Star,
  Sprout,
  SunMoon,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react";
import type { ActivityStats } from "../activity/activity.stats";
import type { User } from "../../types";

export type QuestCategory = "chat" | "tree" | "learning" | "customize" | "economy" | "activity" | "profile";

export const questCategories: { id: QuestCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "chat", label: "Chat" },
  { id: "tree", label: "Branches" },
  { id: "learning", label: "Learning" },
  { id: "customize", label: "Customize" },
  { id: "economy", label: "Economy" },
  { id: "activity", label: "Activity" },
  { id: "profile", label: "Profile" },
];

export type QuestCtx = {
  counters: Record<string, number>;
  stats: ActivityStats;
  user: User;
  /** From the telemetry store — the stats page feeds the quest engine. */
  telemetry: { totalClicks: number; appMinutes: number; planChanges: number };
};

/** Measures tagged with their counter key can notify live on bumps. */
export type QuestMeasure = ((ctx: QuestCtx) => number) & { counterKey?: string };

export type QuestSeries = {
  id: string;
  category: QuestCategory;
  icon: typeof Trophy;
  name: string;
  /** "Send 25 messages" — the tier title. */
  describe: (target: number) => string;
  /** Why this action matters — onboarding/sensibilisation line. */
  lesson: string;
  tiers: number[];
  measure: QuestMeasure;
};

/** The long capstone ladder — most series climb all 18 steps. */
const LADDER = [1, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 250, 500, 750, 1000, 1500, 2000];
const ONE = [1];

const fromCounter = (key: string): QuestMeasure => Object.assign((ctx: QuestCtx) => ctx.counters[key] ?? 0, { counterKey: key });

/** Reward grows with the tier index: 10, 15, 20 … 95 credits. */
export function rewardForTier(tierIndex: number) {
  return 10 + tierIndex * 5;
}

export const questSeries: QuestSeries[] = [
  // --- Chat -----------------------------------------------------------------
  { id: "messages", category: "chat", icon: MessageSquare, name: "Messenger", describe: (n) => `Send ${n} message${n > 1 ? "s" : ""}`, lesson: "The loop starts with a prompt.", tiers: LADDER, measure: fromCounter("messages") },
  { id: "ink", category: "chat", icon: Feather, name: "Wordsmith", describe: (n) => `Write ${n * 100} characters of prompts`, lesson: "Longer prompts, richer answers.", tiers: LADDER, measure: Object.assign((ctx: QuestCtx) => Math.floor((ctx.counters.ink ?? 0) / 100), { counterKey: "ink" }) },
  { id: "sessions", category: "chat", icon: MessageSquarePlus, name: "Conversation starter", describe: (n) => `Start ${n} conversation${n > 1 ? "s" : ""}`, lesson: "Fresh context, fresh ideas.", tiers: LADDER, measure: fromCounter("sessions") },
  { id: "queued", category: "chat", icon: MessageSquarePlus, name: "Batch thinker", describe: (n) => `Queue ${n} message${n > 1 ? "s" : ""}`, lesson: "Pro perk: stack prompts, let the agent chain them.", tiers: [1, 5, 10, 25, 50, 100, 250], measure: fromCounter("queued") },
  { id: "wikis", category: "chat", icon: BookOpen, name: "Wiki wanderer", describe: (n) => `Receive ${n} wiki article${n > 1 ? "s" : ""}`, lesson: "Every answer teaches something random.", tiers: LADDER, measure: fromCounter("wikis") },
  { id: "attachments", category: "chat", icon: Paperclip, name: "File courier", describe: (n) => `Attach ${n} file${n > 1 ? "s" : ""}`, lesson: "Context beats description.", tiers: LADDER, measure: fromCounter("attachments") },
  { id: "temp-chats", category: "chat", icon: Ghost, name: "Ghost rider", describe: (n) => `Use ${n} temporary chat${n > 1 ? "s" : ""}`, lesson: "Some thoughts deserve to vanish.", tiers: LADDER, measure: fromCounter("temp-chats") },

  // --- Branches (the tree) ---------------------------------------------------
  { id: "buds", category: "tree", icon: Sprout, name: "Gardener", describe: (n) => `Grow ${n} bud${n > 1 ? "s" : ""} (retry or local branch)`, lesson: "A bud is a branch tip you can always grow.", tiers: LADDER, measure: fromCounter("buds") },
  { id: "versions", category: "tree", icon: Pencil, name: "Reviser", describe: (n) => `Edit prompts into ${n} new version${n > 1 ? "s" : ""}`, lesson: "Editing is non-destructive — old branches stay.", tiers: LADDER, measure: fromCounter("versions") },
  { id: "branches", category: "tree", icon: GitBranch, name: "Arborist", describe: (n) => `Branch ${n} conversation${n > 1 ? "s" : ""} into new chats`, lesson: "Duplicate everything, diverge freely.", tiers: LADDER, measure: fromCounter("branches") },

  // --- Learning / sensibilisation -------------------------------------------
  { id: "sources", category: "learning", icon: ExternalLink, name: "Fact checker", describe: (n) => `Open ${n} source link${n > 1 ? "s" : ""}`, lesson: "Never believe an AI blindly — click through and verify the source.", tiers: LADDER, measure: fromCounter("sources") },
  { id: "likes", category: "learning", icon: ThumbsUp, name: "Curator", describe: (n) => `Like ${n} result${n > 1 ? "s" : ""}`, lesson: "Feedback shapes what you keep.", tiers: LADDER, measure: fromCounter("likes") },
  { id: "dislikes", category: "learning", icon: ThumbsDown, name: "Honest critic", describe: (n) => `Flag ${n} weak result${n > 1 ? "s" : ""}`, lesson: "Bad answers exist — say so.", tiers: LADDER, measure: fromCounter("dislikes") },
  { id: "bookmarks", category: "learning", icon: Bookmark, name: "Librarian", describe: (n) => `Save ${n} result${n > 1 ? "s" : ""} for later`, lesson: "Reading later only works if you save now.", tiers: LADDER, measure: fromCounter("bookmarks") },
  { id: "library-opens", category: "learning", icon: BookmarkCheck, name: "Returning reader", describe: (n) => `Reopen ${n} saved result${n > 1 ? "s" : ""}`, lesson: "A library you never reopen is a graveyard.", tiers: LADDER, measure: fromCounter("library-opens") },
  { id: "copies", category: "learning", icon: Copy, name: "Scribe", describe: (n) => `Copy ${n} result${n > 1 ? "s" : ""} as markdown`, lesson: "Take the knowledge with you.", tiers: LADDER, measure: fromCounter("copies") },
  { id: "exports", category: "learning", icon: Copy, name: "Data exporter", describe: (n) => `Export ${n} table${n > 1 ? "s" : ""} as CSV/JSON`, lesson: "Structured data belongs in your tools.", tiers: [1, 5, 10, 25, 50, 100], measure: fromCounter("exports") },
  { id: "expands", category: "learning", icon: Compass, name: "Deep reader", describe: (n) => `Expand ${n} long message${n > 1 ? "s" : ""}`, lesson: "The fold hides the details.", tiers: LADDER, measure: fromCounter("expands") },
  { id: "pokemon", category: "learning", icon: BookOpen, name: "Pokédex builder", describe: (n) => `Collect ${n} Pokémon card${n > 1 ? "s" : ""}`, lesson: "Professor Poké parses Poképédia for you.", tiers: LADDER, measure: fromCounter("pokemon") },
  { id: "yugioh", category: "learning", icon: BookOpen, name: "Duel librarian", describe: (n) => `Draw ${n} Yu-Gi-Oh! card${n > 1 ? "s" : ""}`, lesson: "The Duelist parses Yugipedia for you.", tiers: LADDER, measure: fromCounter("yugioh") },
  { id: "onepiece", category: "learning", icon: BookOpen, name: "Grand Line scholar", describe: (n) => `Meet ${n} One Piece character${n > 1 ? "s" : ""}`, lesson: "The Pirate parses the One Piece Wiki.", tiers: LADDER, measure: fromCounter("onepiece") },
  { id: "beer", category: "learning", icon: BookOpen, name: "Beer sommelier", describe: (n) => `Discover ${n} brew${n > 1 ? "s" : ""}`, lesson: "The Brewmaster parses the Beer Wiki.", tiers: LADDER, measure: fromCounter("beer") },
  { id: "starwars", category: "learning", icon: BookOpen, name: "Holocron keeper", describe: (n) => `Consult ${n} Wookieepedia entr${n > 1 ? "ies" : "y"}`, lesson: "The Holocron Keeper parses Wookieepedia.", tiers: LADDER, measure: fromCounter("starwars") },
  { id: "minecraft", category: "learning", icon: BookOpen, name: "Block archivist", describe: (n) => `Mine ${n} Minecraft article${n > 1 ? "s" : ""}`, lesson: "The Miner parses the Minecraft Wiki.", tiers: LADDER, measure: fromCounter("minecraft") },

  // --- Customize --------------------------------------------------------------
  { id: "theme-switches", category: "customize", icon: Palette, name: "Shape shifter", describe: (n) => `Switch themes ${n} time${n > 1 ? "s" : ""}`, lesson: "Your lounge, your colors.", tiers: LADDER, measure: fromCounter("theme-switches") },
  { id: "mode-switches", category: "customize", icon: SunMoon, name: "Day & night", describe: (n) => `Switch appearance ${n} time${n > 1 ? "s" : ""}`, lesson: "Light for day, dark for late loops.", tiers: LADDER, measure: fromCounter("mode-switches") },
  { id: "themes-owned", category: "customize", icon: Trophy, name: "Collector", describe: (n) => `Unlock ${n} theme${n > 1 ? "s" : ""}`, lesson: "Spend credits on identity.", tiers: [1, 2, 3, 4, 5], measure: (ctx) => Math.max(0, ctx.user.themes.length - 1) },

  // --- Economy ----------------------------------------------------------------
  { id: "credits-spent", category: "economy", icon: Zap, name: "Big spender", describe: (n) => `Spend ${n * 5} credits`, lesson: "Credits exist to be burned.", tiers: LADDER, measure: (ctx) => Math.floor((ctx.counters["credits-spent"] ?? 0) / 5) },
  { id: "credits-earned", category: "economy", icon: TrendingUp, name: "Earner", describe: (n) => `Earn ${n * 10} credits from rewards`, lesson: "Quests and boosters pay you back.", tiers: LADDER, measure: (ctx) => Math.floor((ctx.counters["credits-earned"] ?? 0) / 10) },
  { id: "boosters", category: "economy", icon: Gift, name: "Unboxer", describe: (n) => `Open ${n} booster${n > 1 ? "s" : ""}`, lesson: "The reveal is the reward.", tiers: LADDER, measure: fromCounter("boosters") },
  { id: "puzzle-taps", category: "economy", icon: Puzzle, name: "Puzzle addict", describe: (n) => `Tap ${n.toLocaleString()} puzzle pieces`, lesson: "Tap fast during the frenzy — rarity loves speed.", tiers: [10, 50, 100, 250, 500, 1000, 2500, 5000], measure: fromCounter("puzzle-taps") },
  { id: "daily-booster", category: "economy", icon: Puzzle, name: "Daily unboxer", describe: (n) => `Claim ${n} daily booster${n > 1 ? "s" : ""}`, lesson: "One free puzzle every day.", tiers: [1, 5, 10, 25, 50, 100, 250], measure: fromCounter("daily-booster") },
  { id: "booster-buys", category: "economy", icon: Gift, name: "Shopper", describe: (n) => `Buy ${n} booster${n > 1 ? "s" : ""} from the shop`, lesson: "The shop sells the reveal, not the loot.", tiers: [1, 5, 10, 25, 50, 100, 250], measure: fromCounter("booster-buys") },
  { id: "mythic-pulls", category: "economy", icon: Gem, name: "Jackpot", describe: (n) => `Pull ${n} MYTHIC booster${n > 1 ? "s" : ""}`, lesson: "0.5% odds — when it hits, it pays 2000.", tiers: [1, 2, 3, 5, 10], measure: fromCounter("mythic-pulls") },
  { id: "legendary-pulls", category: "economy", icon: Star, name: "Gilded", describe: (n) => `Pull ${n} legendary booster${n > 1 ? "s" : ""}`, lesson: "Just below the jackpot, still golden.", tiers: [1, 3, 5, 10, 25, 50], measure: fromCounter("legendary-pulls") },
  { id: "refunds", category: "economy", icon: RotateCcw, name: "Second thoughts", describe: (n) => `Use ${n} of your 3 lifetime refunds`, lesson: "Buyer's remorse has a safety net — a small one.", tiers: [1, 2, 3], measure: fromCounter("refunds-used") },
  { id: "check-ins", category: "activity", icon: CalendarCheck, name: "Regular", describe: (n) => `Check in ${n} day${n > 1 ? "s" : ""} on the season pass`, lesson: "Presence is the cheapest XP there is.", tiers: [1, 3, 7, 14, 30, 60, 100, 200, 365], measure: fromCounter("check-ins") },
  { id: "streaks", category: "activity", icon: Flame, name: "On fire", describe: (n) => `Reach a ${n}-day check-in streak`, lesson: "Streaks multiply the XP — don't break the chain.", tiers: [2, 3, 5, 7, 14, 30], measure: fromCounter("best-streak") },
  { id: "season-levels", category: "economy", icon: Crown, name: "Pass climber", describe: (n) => `Gain ${n} season level${n > 1 ? "s" : ""}`, lesson: "Every action feeds the pass.", tiers: [1, 2, 5, 10, 15, 20, 25, 29], measure: fromCounter("season-levels") },
  { id: "season-claims", category: "economy", icon: Trophy, name: "Tier collector", describe: (n) => `Claim ${n} season tier reward${n > 1 ? "s" : ""}`, lesson: "Reached tiers pay nothing until you claim them.", tiers: [1, 5, 10, 20, 30, 60], measure: fromCounter("season-claims") },
  { id: "ranking-views", category: "activity", icon: Medal, name: "Competitor", describe: (n) => `Check the ranking ${n} time${n > 1 ? "s" : ""}`, lesson: "Know where you stand — then climb.", tiers: [1, 5, 10, 25, 50, 100], measure: fromCounter("ranking-visits") },
  { id: "dailies", category: "economy", icon: CalendarCheck, name: "Regular", describe: (n) => `Claim ${n} daily quest${n > 1 ? "s" : ""}`, lesson: "Showing up compounds.", tiers: LADDER, measure: fromCounter("dailies") },
  { id: "quests-claimed", category: "economy", icon: Trophy, name: "Quest hunter", describe: (n) => `Claim ${n} achievement${n > 1 ? "s" : ""}`, lesson: "Yes, claiming quests is itself a quest.", tiers: LADDER, measure: fromCounter("quests-claimed") },

  // --- Activity ----------------------------------------------------------------
  { id: "active-days", category: "activity", icon: CalendarDays, name: "Present", describe: (n) => `Be active ${n} day${n > 1 ? "s" : ""}`, lesson: "The grid remembers.", tiers: [1, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 250, 365], measure: (ctx) => ctx.stats.activeDays },
  { id: "best-streak", category: "activity", icon: Flame, name: "Streak keeper", describe: (n) => `Reach a ${n}-day streak`, lesson: "Consistency beats intensity.", tiers: [1, 3, 5, 7, 10, 14, 21, 30, 50, 75, 100], measure: (ctx) => ctx.stats.longestStreak },
  { id: "total-points", category: "activity", icon: TrendingUp, name: "Point machine", describe: (n) => `Accumulate ${n * 10} activity points`, lesson: "Every action leaves a mark.", tiers: LADDER, measure: (ctx) => Math.floor(ctx.stats.total / 10) },
  { id: "page-visits", category: "activity", icon: Compass, name: "Explorer", describe: (n) => `Visit ${n} page${n > 1 ? "s" : ""}`, lesson: "Every corner hides a feature.", tiers: LADDER, measure: fromCounter("page-visits") },
  { id: "clicks", category: "activity", icon: MousePointerClick, name: "Button masher", describe: (n) => `Click ${n.toLocaleString()} buttons`, lesson: "Every click is counted — check your Statistics page.", tiers: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000], measure: (ctx) => ctx.telemetry.totalClicks },
  { id: "app-time", category: "activity", icon: Clock, name: "Time traveler", describe: (n) => `Spend ${n >= 60 ? `${Math.round(n / 60)}h` : `${n}min`} in the lounge`, lesson: "Time flies when everything rewards you.", tiers: [1, 5, 10, 30, 60, 120, 300, 600, 1200, 3000], measure: (ctx) => ctx.telemetry.appMinutes },
  { id: "plan-changes", category: "economy", icon: Repeat, name: "Plan hopper", describe: (n) => `Change plan ${n} time${n > 1 ? "s" : ""}`, lesson: "Your plan journey is tracked to the second.", tiers: [1, 2, 3, 5, 10, 25], measure: (ctx) => ctx.telemetry.planChanges },

  // --- Profile (onboarding one-shots + care) -----------------------------------
  { id: "avatar-set", category: "profile", icon: UserRound, name: "Face on", describe: () => "Set a profile picture", lesson: "Be someone in the lounge.", tiers: ONE, measure: fromCounter("avatar-set") },
  { id: "handle-set", category: "profile", icon: UserRound, name: "Named", describe: () => "Save your handle", lesson: "Claim your @.", tiers: ONE, measure: fromCounter("handle-set") },
  { id: "password-changed", category: "profile", icon: KeyRound, name: "Locked down", describe: () => "Change your password", lesson: "Hygiene, even in a simulation.", tiers: ONE, measure: fromCounter("password-changed") },
  { id: "birthday-set", category: "profile", icon: CalendarDays, name: "Cake day", describe: () => "Set your birthday", lesson: "Unlock the yearly gift.", tiers: ONE, measure: fromCounter("birthday-set") },
  { id: "profile-saves", category: "profile", icon: Save, name: "Well groomed", describe: (n) => `Save your profile ${n} time${n > 1 ? "s" : ""}`, lesson: "Details age; refresh them.", tiers: [1, 5, 10, 25, 50], measure: fromCounter("profile-saves") },
];

export const totalQuestCount = questSeries.reduce((sum, series) => sum + series.tiers.length, 0);

export type SeriesProgress = {
  series: QuestSeries;
  value: number;
  claimedCount: number;
  nextTierIndex: number;
  nextTarget: number | null;
  claimable: boolean;
  mastered: boolean;
};

export function seriesProgress(series: QuestSeries, ctx: QuestCtx, claims: Record<string, true>): SeriesProgress {
  const value = series.measure(ctx);
  const nextTierIndex = series.tiers.findIndex((target) => !claims[`${series.id}:${target}`]);
  const mastered = nextTierIndex === -1;
  const nextTarget = mastered ? null : series.tiers[nextTierIndex];

  return {
    series,
    value,
    claimedCount: mastered ? series.tiers.length : nextTierIndex,
    nextTierIndex: mastered ? series.tiers.length : nextTierIndex,
    nextTarget,
    claimable: !mastered && nextTarget !== null && value >= nextTarget,
    mastered,
  };
}
