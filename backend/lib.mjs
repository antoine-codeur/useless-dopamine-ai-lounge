import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

export const plans = {
  free: { id: "free", label: "Free", monthlyCredits: 100, upgradeCost: 0 },
  pro: { id: "pro", label: "Pro", monthlyCredits: 1500, upgradeCost: 25 },
  max: { id: "max", label: "Max", monthlyCredits: 6000, upgradeCost: 150 },
  "max-plus": { id: "max-plus", label: "Max +", monthlyCredits: 20000, upgradeCost: 500 },
};

export const quests = {
  "daily-check-in": { id: "daily-check-in", label: "Daily check-in", rewardCredits: 15, repeat: "daily" },
  "open-first-booster": { id: "open-first-booster", label: "Open a booster", rewardCredits: 20, repeat: "once" },
  "send-three-prompts": { id: "send-three-prompts", label: "Send three prompts", rewardCredits: 35, repeat: "once" },
};

/**
 * Daily fortune wheel. Order + ids MUST stay in sync with the client layout in
 * src/features/earn/wheel.ts (the client animates the pointer to this segment).
 * The server owns the weighted draw so the reward can't be tampered with.
 */
export const WHEEL_SEGMENTS = [
  { id: "credits-10", kind: "credits", amount: 10, weight: 26 },
  { id: "booster-1", kind: "booster", amount: 1, weight: 14 },
  { id: "credits-25", kind: "credits", amount: 25, weight: 20 },
  { id: "none", kind: "none", amount: 0, weight: 12 },
  { id: "credits-50", kind: "credits", amount: 50, weight: 10 },
  { id: "xp-100", kind: "xp", amount: 100, weight: 14 },
  { id: "booster-2", kind: "booster", amount: 2, weight: 3 },
  { id: "jackpot-200", kind: "credits", amount: 200, weight: 1 },
];

/** The very first spin is rigged to a strong, motivating win (the hook). The
 *  top jackpot stays rare so there's still something to chase afterwards. */
export const WHEEL_FIRST_SPIN_ID = "credits-50";

/** Weighted, crypto-random segment pick (no client influence on the outcome). */
export function pickWheelSegment() {
  const total = WHEEL_SEGMENTS.reduce((sum, seg) => sum + seg.weight, 0);
  // randomInt is uniform in [0, total); walk the cumulative weights.
  let roll = randomInt(total);

  for (const segment of WHEEL_SEGMENTS) {
    if (roll < segment.weight) {
      return segment;
    }

    roll -= segment.weight;
  }

  return WHEEL_SEGMENTS[0];
}

/** Opaque session tokens: the account id is NOT a credential and may be public. */
export function newSessionToken() {
  return randomBytes(32).toString("hex");
}

export function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

/** A plan's monthly allotment doubles as the hard ceiling on a balance. */
export function allotmentFor(plan) {
  return plans[plan]?.monthlyCredits ?? plans.free.monthlyCredits;
}

/** Refill the monthly credits once the renewal date has passed. */
export function applyRenewal(account) {
  const renewsAt = account.planRenewsAt;

  if (!renewsAt || todayKey() < renewsAt) {
    return false;
  }

  account.creditsRemaining = allotmentFor(account.plan);
  account.planRenewsAt = renewalDateForCycle(account.planBillingCycle ?? "monthly");
  return true;
}

/** Tiny in-memory per-IP throttle for auth endpoints (brute force / spam). */
export const authHits = new Map();
export function rateLimited(request, bucket, max, windowMs = 15 * 60 * 1000) {
  const ip = String(request.headers["x-forwarded-for"] ?? "").split(",")[0].trim() || request.socket.remoteAddress || "unknown";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = authHits.get(key);

  if (!entry || now > entry.resetAt) {
    authHits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count += 1;
  return entry.count > max;
}

export function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

/** Success response carrying the shared plans + quests catalogs (~most routes). */
export function ok(response, status, extra = {}) {
  sendJson(response, status, { ok: true, ...extra, plans: Object.values(plans), quests: Object.values(quests) });
}

/** Error response carrying the shared plans + quests catalogs. */
export function fail(response, status, error, extra = {}) {
  sendJson(response, status, { ok: false, error, ...extra, plans: Object.values(plans), quests: Object.values(quests) });
}

export async function readJson(request, limitBytes = 2_000_000) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;

    // Bound memory: avatar data-urls cap at 700 KB, so 2 MB is generous. Past
    // that, stop buffering and drop the body rather than risk OOM.
    if (size > limitBytes) {
      request.destroy();
      return {};
    }

    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function renewalDateForCycle(cycle) {
  const date = new Date();

  if (cycle === "yearly") {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }

  return date.toISOString().slice(0, 10);
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash = "") {
  const [salt, hash] = storedHash.split(":");

  if (!salt || !hash) {
    return false;
  }

  const candidate = scryptSync(password, salt, 64);
  const original = Buffer.from(hash, "hex");
  return original.length === candidate.length && timingSafeEqual(original, candidate);
}

export function tokenFromRequest(request) {
  const auth = request.headers.authorization ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

export function guestIdFromRequest(request) {
  const value = request.headers["x-guest-id"];
  return Array.isArray(value) ? value[0] : String(value ?? "");
}

export function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function normalizeHandle(handle) {
  return String(handle ?? "").trim().replace(/^@/, "").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 28);
}

export function isEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export function isStrongPassword(password) {
  return (
    password.length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password)
  );
}

export function handleFromEmail(email) {
  const [localPart] = email.split("@");
  const normalized = normalizeHandle(localPart || "user");
  return normalized.length >= 2 ? normalized : `user_${randomBytes(2).toString("hex")}`;
}

export function uniqueHandle(state, desiredHandle) {
  const base = normalizeHandle(desiredHandle);
  let candidate = base.length >= 2 ? base : `user_${randomBytes(2).toString("hex")}`;
  let suffix = 1;

  while (state.accounts.some((account) => account.handle === candidate)) {
    const nextSuffix = String(suffix);
    candidate = `${candidate.slice(0, Math.max(2, 28 - nextSuffix.length - 1))}_${nextSuffix}`;
    suffix += 1;
  }

  return candidate;
}

export function isValidBirthDate(value) {
  if (value === "" || value === null || typeof value === "undefined") {
    return true;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date <= new Date();
}

export function isValidAvatarDataUrl(value) {
  return (
    value === ""
    || (
      typeof value === "string"
      && value.length <= 700_000
      && /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
    )
  );
}

export function isValidOnboardingStep(value) {
  return ["credentials", "profile", "avatar", "birthday", "complete"].includes(value);
}

export function publicAccount(account) {
  return {
    id: account.id,
    username: account.username,
    handle: account.handle,
    email: account.email,
    plan: account.plan,
    planBillingCycle: account.planBillingCycle ?? "monthly",
    planRenewsAt: account.planRenewsAt ?? renewalDateForCycle("monthly"),
    creditsRemaining: account.creditsRemaining,
    creditsUsed: account.creditsUsed,
    boosters: account.boosters ?? 0,
    dailyBoosterDay: account.dailyBoosterDay ?? null,
    wheelSpinDay: account.wheelSpinDay ?? null,
    promptCount: account.promptCount ?? 0,
    createdAt: account.createdAt,
    avatarDataUrl: account.avatarDataUrl ?? "",
    birthDate: account.birthDate ?? "",
    onboardingStep: account.onboardingStep ?? "complete",
    birthdayGiftYear: account.birthdayGiftYear ?? null,
    activityByDate: account.activityByDate ?? {},
    questClaims: account.questClaims ?? {},
    settings: account.settings ?? {},
  };
}

export function publicGuest(guest) {
  return {
    id: guest.id,
    creditsRemaining: guest.creditsRemaining,
    creditsUsed: guest.creditsUsed,
    promptCount: guest.promptCount ?? 0,
    createdAt: guest.createdAt,
    activityByDate: guest.activityByDate ?? {},
  };
}

export function agentResponse(prompt) {
  const normalized = String(prompt ?? "").toLowerCase();

  if (normalized.includes("design") || normalized.includes("ux")) {
    return "Simulated AI agent: the strongest UX move here is to remove friction, make every action reversible, and keep keyboard and touch controls equally polished.";
  }

  if (normalized.includes("credit") || normalized.includes("plan")) {
    return "Simulated AI agent: credit limits should be visible before they become blockers. Upgrades should feel earned, clear, and pressure-free.";
  }

  return "Simulated AI agent: the product, account, credits, settings, quests, and boosters are real. Only this generated answer is simulated.";
}

export function canClaimQuest(account, questId) {
  const quest = quests[questId];

  if (!quest) {
    return false;
  }

  const claimed = account.questClaims?.[questId];

  if (quest.repeat === "daily") {
    return claimed !== todayKey();
  }

  if (questId === "send-three-prompts" && (account.promptCount ?? 0) < 3) {
    return false;
  }

  if (questId === "open-first-booster" && (account.boostersOpened ?? 0) < 1) {
    return false;
  }

  return !claimed;
}

/** Steps are decided client-side (the visible process log): 1 credit per step. */
export function promptCost(steps) {
  const parsed = Number.isFinite(Number(steps)) ? Math.round(Number(steps)) : 4;
  return Math.min(12, Math.max(1, parsed));
}

/** Paid plans boost every credit gain — mirrored in src/lib/planPerks.ts. */
export const PLAN_GAIN_MULTIPLIER = { free: 1, pro: 1.05, max: 1.1, "max-plus": 1.2 };

export function boostGain(amount, plan) {
  return Math.round(amount * (PLAN_GAIN_MULTIPLIER[plan] ?? 1));
}

/** Day-bucketed gains feed the leaderboard periods. */
export function recordGain(account, amount) {
  account.gainsByDate = account.gainsByDate ?? {};
  account.gainsByDate[todayKey()] = (account.gainsByDate[todayKey()] ?? 0) + amount;
}

/** Sum a {YYYY-MM-DD: n} map over the last N days (null = all time). */
export function sumSince(byDate, days) {
  const entries = Object.entries(byDate ?? {});

  if (days === null) {
    return entries.reduce((sum, [, value]) => sum + value, 0);
  }

  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  return entries.reduce((sum, [day, value]) => (day >= cutoff ? sum + value : sum), 0);
}

export function periodSums(byDate) {
  return {
    today: sumSince(byDate, 0),
    week: sumSince(byDate, 6),
    month: sumSince(byDate, 29),
    year: sumSince(byDate, 364),
    total: sumSince(byDate, null),
  };
}
