import http from "node:http";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const port = Number(process.env.PORT ?? 8080);
const startedAt = new Date().toISOString();
const dataFile = process.env.DATA_FILE ?? "/data/app.json";

const plans = {
  free: { id: "free", label: "Free", monthlyCredits: 100, upgradeCost: 0 },
  pro: { id: "pro", label: "Pro", monthlyCredits: 1500, upgradeCost: 25 },
  max: { id: "max", label: "Max", monthlyCredits: 6000, upgradeCost: 150 },
  "max-plus": { id: "max-plus", label: "Max +", monthlyCredits: 20000, upgradeCost: 500 },
};

const quests = {
  "daily-check-in": { id: "daily-check-in", label: "Daily check-in", rewardCredits: 15, repeat: "daily" },
  "open-first-booster": { id: "open-first-booster", label: "Open a booster", rewardCredits: 20, repeat: "once" },
  "send-three-prompts": { id: "send-three-prompts", label: "Send three prompts", rewardCredits: 35, repeat: "once" },
};

async function loadState() {
  try {
    const state = JSON.parse(await readFile(dataFile, "utf8"));
    return { accounts: [], messages: {}, guests: [], ...state };
  } catch {
    return { accounts: [], messages: {}, guests: [] };
  }
}

async function saveState(state) {
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, JSON.stringify(state, null, 2));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
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

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function renewalDateForCycle(cycle) {
  const date = new Date();

  if (cycle === "yearly") {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }

  return date.toISOString().slice(0, 10);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash = "") {
  const [salt, hash] = storedHash.split(":");

  if (!salt || !hash) {
    return false;
  }

  const candidate = scryptSync(password, salt, 64);
  const original = Buffer.from(hash, "hex");
  return original.length === candidate.length && timingSafeEqual(original, candidate);
}

function accountIdFromRequest(request) {
  const auth = request.headers.authorization ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

function guestIdFromRequest(request) {
  const value = request.headers["x-guest-id"];
  return Array.isArray(value) ? value[0] : String(value ?? "");
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function normalizeHandle(handle) {
  return String(handle ?? "").trim().replace(/^@/, "").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 28);
}

function isEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function isStrongPassword(password) {
  return (
    password.length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password)
  );
}

function handleFromEmail(email) {
  const [localPart] = email.split("@");
  const normalized = normalizeHandle(localPart || "user");
  return normalized.length >= 2 ? normalized : `user_${randomBytes(2).toString("hex")}`;
}

function uniqueHandle(state, desiredHandle) {
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

function isValidBirthDate(value) {
  if (value === "" || value === null || typeof value === "undefined") {
    return true;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date <= new Date();
}

function isValidAvatarDataUrl(value) {
  return (
    value === ""
    || (
      typeof value === "string"
      && value.length <= 700_000
      && /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
    )
  );
}

function isValidOnboardingStep(value) {
  return ["credentials", "profile", "avatar", "birthday", "complete"].includes(value);
}

function publicAccount(account) {
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

function publicGuest(guest) {
  return {
    id: guest.id,
    creditsRemaining: guest.creditsRemaining,
    creditsUsed: guest.creditsUsed,
    promptCount: guest.promptCount ?? 0,
    createdAt: guest.createdAt,
    activityByDate: guest.activityByDate ?? {},
  };
}

function agentResponse(prompt) {
  const normalized = String(prompt ?? "").toLowerCase();

  if (normalized.includes("design") || normalized.includes("ux")) {
    return "Simulated AI agent: the strongest UX move here is to remove friction, make every action reversible, and keep keyboard and touch controls equally polished.";
  }

  if (normalized.includes("credit") || normalized.includes("plan")) {
    return "Simulated AI agent: credit limits should be visible before they become blockers. Upgrades should feel earned, clear, and pressure-free.";
  }

  return "Simulated AI agent: the product, account, credits, settings, quests, and boosters are real. Only this generated answer is simulated.";
}

function canClaimQuest(account, questId) {
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

async function findAccount(request) {
  const state = await loadState();
  const account = state.accounts.find((item) => item.id === accountIdFromRequest(request) && !item.deletedAt);
  return { state, account };
}

/** Steps are decided client-side (the visible process log): 1 credit per step. */
function promptCost(steps) {
  const parsed = Number.isFinite(Number(steps)) ? Math.round(Number(steps)) : 4;
  return Math.min(12, Math.max(1, parsed));
}

/** Paid plans boost every credit gain — mirrored in src/lib/planPerks.ts. */
const PLAN_GAIN_MULTIPLIER = { free: 1, pro: 1.05, max: 1.1, "max-plus": 1.2 };

function boostGain(amount, plan) {
  return Math.round(amount * (PLAN_GAIN_MULTIPLIER[plan] ?? 1));
}

/** Day-bucketed gains feed the leaderboard periods. */
function recordGain(account, amount) {
  account.gainsByDate = account.gainsByDate ?? {};
  account.gainsByDate[todayKey()] = (account.gainsByDate[todayKey()] ?? 0) + amount;
}

/** Sum a {YYYY-MM-DD: n} map over the last N days (null = all time). */
function sumSince(byDate, days) {
  const entries = Object.entries(byDate ?? {});

  if (days === null) {
    return entries.reduce((sum, [, value]) => sum + value, 0);
  }

  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  return entries.reduce((sum, [day, value]) => (day >= cutoff ? sum + value : sum), 0);
}

function periodSums(byDate) {
  return {
    today: sumSince(byDate, 0),
    week: sumSince(byDate, 6),
    month: sumSince(byDate, 29),
    year: sumSince(byDate, 364),
    total: sumSince(byDate, null),
  };
}

async function findOrCreateGuest(request) {
  const state = await loadState();
  state.guests = state.guests ?? [];
  const requestedId = guestIdFromRequest(request);
  let guest = state.guests.find((item) => item.id === requestedId);

  if (!guest) {
    const now = new Date().toISOString();
    guest = {
      id: requestedId && requestedId.length <= 80 ? requestedId : randomUUID(),
      creditsRemaining: 40,
      creditsUsed: 0,
      promptCount: 0,
      activityByDate: {},
      createdAt: now,
      updatedAt: now,
    };
    state.guests.push(guest);
    state.messages[guest.id] = [];
    await saveState(state);
  }

  return { state, guest };
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && url.pathname === "/api/v1/health") {
    sendJson(response, 200, {
      ok: true,
      service: "useless-dopamine-ai-backend",
      startedAt,
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/v1/session") {
    const { account } = await findAccount(request);

    if (!account) {
      sendJson(response, 401, { ok: false, error: "account_required", plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    sendJson(response, 200, { ok: true, account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/v1/guest-session") {
    const { guest } = await findOrCreateGuest(request);
    sendJson(response, 200, { ok: true, guest: publicGuest(guest), plans: Object.values(plans) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/accounts") {
    const body = await readJson(request);
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? "");

    if (!isEmail(email) || !isStrongPassword(password)) {
      sendJson(response, 400, { ok: false, error: "invalid_account", plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    const state = await loadState();

    if (state.accounts.some((account) => account.email === email)) {
      sendJson(response, 409, { ok: false, error: "email_taken", plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    const usernameInput = String(body.username ?? "").trim();
    const username = (usernameInput.length >= 2 ? usernameInput : email.split("@")[0]).slice(0, 40);
    const requestedHandle = normalizeHandle(body.handle) || handleFromEmail(email);
    const handle = uniqueHandle(state, requestedHandle);
    const now = new Date().toISOString();
    const account = {
      id: randomUUID(),
      username,
      handle,
      email,
      passwordHash: hashPassword(password),
      plan: "free",
      planBillingCycle: "monthly",
      planRenewsAt: renewalDateForCycle("monthly"),
      creditsRemaining: plans.free.monthlyCredits,
      creditsUsed: 0,
      boosters: 1,
      boostersOpened: 0,
      promptCount: 0,
      avatarDataUrl: "",
      birthDate: "",
      onboardingStep: "profile",
      birthdayGiftYear: null,
      activityByDate: {},
      questClaims: {},
      settings: {
        themeId: "candy-fake-premium",
        themeMode: "light",
        keyboardShortcuts: true,
        reducedMotion: false,
      },
      createdAt: now,
      updatedAt: now,
    };

    state.accounts.push(account);
    state.messages[account.id] = [];
    await saveState(state);
    sendJson(response, 201, { ok: true, account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/auth/login") {
    const body = await readJson(request);
    const state = await loadState();
    const account = state.accounts.find((item) => item.email === normalizeEmail(body.email));

    if (!account || !verifyPassword(String(body.password ?? ""), account.passwordHash)) {
      sendJson(response, 401, { ok: false, error: "invalid_credentials", plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    sendJson(response, 200, { ok: true, account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests) });
    return;
  }

  if (request.method === "PATCH" && url.pathname === "/api/v1/account") {
    const body = await readJson(request);
    const { state, account } = await findAccount(request);

    if (!account) {
      sendJson(response, 401, { ok: false, error: "account_required", plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    if (typeof body.username === "string" && body.username.trim().length >= 2) {
      account.username = body.username.trim().slice(0, 40);
    }

    if (typeof body.handle === "string") {
      const nextHandle = normalizeHandle(body.handle);
      if (nextHandle.length < 2 || state.accounts.some((item) => item.id !== account.id && item.handle === nextHandle)) {
        sendJson(response, 409, { ok: false, error: "handle_unavailable", account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests) });
        return;
      }
      account.handle = nextHandle;
    }

    if (typeof body.avatarDataUrl === "string") {
      if (!isValidAvatarDataUrl(body.avatarDataUrl)) {
        sendJson(response, 400, { ok: false, error: "invalid_avatar", account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests) });
        return;
      }
      account.avatarDataUrl = body.avatarDataUrl;
    }

    if (typeof body.birthDate !== "undefined") {
      if (!isValidBirthDate(body.birthDate)) {
        sendJson(response, 400, { ok: false, error: "invalid_birth_date", account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests) });
        return;
      }
      account.birthDate = String(body.birthDate ?? "");
    }

    if (typeof body.onboardingStep === "string") {
      if (!isValidOnboardingStep(body.onboardingStep)) {
        sendJson(response, 400, { ok: false, error: "invalid_onboarding_step", account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests) });
        return;
      }
      account.onboardingStep = body.onboardingStep;
    }

    if (typeof body.currentPassword === "string" || typeof body.newPassword === "string") {
      if (!verifyPassword(String(body.currentPassword ?? ""), account.passwordHash) || !isStrongPassword(String(body.newPassword ?? ""))) {
        sendJson(response, 400, { ok: false, error: "invalid_password", account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests) });
        return;
      }

      account.passwordHash = hashPassword(String(body.newPassword));
    }

    if (typeof body.plan === "string" && plans[body.plan]) {
      const billingCycle = body.billingCycle === "yearly" ? "yearly" : "monthly";
      const currentLimit = plans[account.plan]?.monthlyCredits ?? plans.free.monthlyCredits;
      const nextPlan = plans[body.plan];
      const nextLimit = nextPlan.monthlyCredits;
      const upgradeCost = billingCycle === "yearly" ? nextPlan.upgradeCost * 10 : nextPlan.upgradeCost;

      if ((body.plan !== account.plan || billingCycle !== account.planBillingCycle) && account.creditsRemaining < upgradeCost) {
        sendJson(response, 402, {
          ok: false,
          error: "upgrade_credit_limit",
          account: publicAccount(account),
          plans: Object.values(plans),
          quests: Object.values(quests),
        });
        return;
      }

      account.plan = body.plan;
      account.planBillingCycle = billingCycle;
      account.planRenewsAt = renewalDateForCycle(billingCycle);
      account.creditsRemaining -= upgradeCost;
      account.creditsRemaining += Math.max(0, nextLimit - currentLimit);
    }

    if (body.settings && typeof body.settings === "object") {
      account.settings = { ...(account.settings ?? {}), ...body.settings };
    }

    account.updatedAt = new Date().toISOString();
    await saveState(state);
    sendJson(response, 200, { ok: true, account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/steps-refund") {
    // Cancelling mid-generation: unexecuted steps come back (1 credit each).
    const body = await readJson(request);
    const refund = Math.min(11, Math.max(0, Math.round(Number(body.credits ?? 0)) || 0));
    const { state, account } = await findAccount(request);

    if (account) {
      account.creditsRemaining += refund;
      account.creditsUsed = Math.max(0, (account.creditsUsed ?? 0) - refund);
      account.activityByDate[todayKey()] = Math.max(0, (account.activityByDate[todayKey()] ?? 0) - refund);
      account.updatedAt = new Date().toISOString();
      await saveState(state);
      sendJson(response, 200, { ok: true, account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests), refunded: refund });
      return;
    }

    const { state: guestState, guest } = await findOrCreateGuest(request);
    guest.creditsRemaining += refund;
    guest.creditsUsed = Math.max(0, (guest.creditsUsed ?? 0) - refund);
    guest.activityByDate[todayKey()] = Math.max(0, (guest.activityByDate[todayKey()] ?? 0) - refund);
    guest.updatedAt = new Date().toISOString();
    await saveState(guestState);
    sendJson(response, 200, { ok: true, guest: publicGuest(guest), plans: Object.values(plans), refunded: refund });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/v1/leaderboard") {
    const state = await loadState();
    const requesterId = accountIdFromRequest(request);
    // Public, sanitized: never ship emails or avatar blobs to everyone.
    const rows = state.accounts
      .filter((account) => !account.deletedAt)
      .map((account) => ({
        id: account.id,
        you: account.id === requesterId,
        username: account.username,
        handle: account.handle,
        plan: account.plan,
        creditsUsed: account.creditsUsed ?? 0,
        usage: periodSums(account.activityByDate),
        gains: periodSums(account.gainsByDate),
      }))
      .slice(0, 200);

    sendJson(response, 200, { ok: true, leaderboard: rows });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/birthday-gift") {
    const { state, account } = await findAccount(request);

    if (!account) {
      sendJson(response, 401, { ok: false, error: "account_required", plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    const today = todayKey();
    const year = Number(today.slice(0, 4));
    const birthday = String(account.birthDate ?? "").slice(5, 10);

    if (!birthday || birthday !== today.slice(5, 10) || account.birthdayGiftYear === year) {
      sendJson(response, 409, { ok: false, error: "birthday_gift_unavailable", account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    const rewardCredits = 120;
    account.birthdayGiftYear = year;
    account.creditsRemaining += rewardCredits;
    recordGain(account, rewardCredits);
    account.updatedAt = new Date().toISOString();
    await saveState(state);
    sendJson(response, 200, { ok: true, account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests), rewardCredits });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/quests/claim") {
    const body = await readJson(request);
    const questId = String(body.questId ?? "");
    const { state, account } = await findAccount(request);

    if (!account) {
      sendJson(response, 401, { ok: false, error: "account_required", plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    if (!canClaimQuest(account, questId)) {
      sendJson(response, 409, { ok: false, error: "quest_unavailable", account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    account.questClaims = account.questClaims ?? {};
    account.questClaims[questId] = quests[questId].repeat === "daily" ? todayKey() : true;
    const rewardCredits = boostGain(quests[questId].rewardCredits, account.plan);
    account.creditsRemaining += rewardCredits;
    recordGain(account, rewardCredits);
    account.updatedAt = new Date().toISOString();
    await saveState(state);
    sendJson(response, 200, { ok: true, account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests), rewardCredits });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/boosters/open") {
    const { state, account } = await findAccount(request);

    if (!account) {
      sendJson(response, 401, { ok: false, error: "account_required", plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    if ((account.boosters ?? 0) <= 0) {
      sendJson(response, 409, { ok: false, error: "no_boosters", account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    const roll = Math.random();
    const rewardCredits = boostGain(roll > 0.98 ? 250 : roll > 0.9 ? 100 : roll > 0.65 ? 35 : 15, account.plan);
    account.boosters -= 1;
    account.boostersOpened = (account.boostersOpened ?? 0) + 1;
    account.creditsRemaining += rewardCredits;
    recordGain(account, rewardCredits);
    account.updatedAt = new Date().toISOString();
    await saveState(state);
    sendJson(response, 200, { ok: true, account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests), rewardCredits });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/boosters/buy") {
    const body = await readJson(request);
    const count = Number(body.count ?? 0);
    const prices = { 1: 120, 10: 1000 };
    const price = prices[count];
    const { state, account } = await findAccount(request);

    if (!account) {
      sendJson(response, 401, { ok: false, error: "account_required", plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    if (!price) {
      sendJson(response, 400, { ok: false, error: "invalid_count", account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    if (account.creditsRemaining < price) {
      sendJson(response, 402, { ok: false, error: "credit_limit", account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    account.boosters = (account.boosters ?? 0) + count;
    // Shop spending is not "usage" — creditsUsed tracks chat prompts only.
    account.creditsRemaining -= price;
    account.updatedAt = new Date().toISOString();
    await saveState(state);
    sendJson(response, 200, { ok: true, account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests), count, price });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/boosters/daily") {
    const { state, account } = await findAccount(request);

    if (!account) {
      sendJson(response, 401, { ok: false, error: "account_required", plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    if (account.dailyBoosterDay === todayKey()) {
      sendJson(response, 409, { ok: false, error: "already_claimed", account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    account.dailyBoosterDay = todayKey();
    account.boosters = (account.boosters ?? 0) + 1;
    account.updatedAt = new Date().toISOString();
    await saveState(state);
    sendJson(response, 200, { ok: true, account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/agent-response") {
    const body = await readJson(request);
    const { state, account } = await findAccount(request);
    const cost = promptCost(body.steps);

    if (!account) {
      sendJson(response, 401, { ok: false, error: "account_required", plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    if (account.creditsRemaining < cost) {
      sendJson(response, 402, {
        ok: false,
        error: "credit_limit",
        account: publicAccount(account),
        plans: Object.values(plans),
        quests: Object.values(quests),
      });
      return;
    }

    const now = new Date().toISOString();
    const day = todayKey();
    account.creditsRemaining -= cost;
    account.creditsUsed += cost;
    account.promptCount = (account.promptCount ?? 0) + 1;
    account.activityByDate[day] = (account.activityByDate[day] ?? 0) + cost;

    const message = {
      id: randomUUID(),
      content: agentResponse(body.prompt),
      createdAt: now,
    };
    state.messages[account.id] = [...(state.messages[account.id] ?? []), message].slice(-200);
    await saveState(state);

    sendJson(response, 200, { ok: true, account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests), message, cost });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/guest-agent-response") {
    const body = await readJson(request);
    const { state, guest } = await findOrCreateGuest(request);
    const cost = promptCost(body.steps);

    if (guest.creditsRemaining < cost) {
      sendJson(response, 402, {
        ok: false,
        error: "guest_credit_limit",
        guest: publicGuest(guest),
        plans: Object.values(plans),
      });
      return;
    }

    const now = new Date().toISOString();
    const day = todayKey();
    guest.creditsRemaining -= cost;
    guest.creditsUsed += cost;
    guest.promptCount = (guest.promptCount ?? 0) + 1;
    guest.activityByDate[day] = (guest.activityByDate[day] ?? 0) + cost;
    guest.updatedAt = now;

    const message = {
      id: randomUUID(),
      content: agentResponse(body.prompt),
      createdAt: now,
    };
    state.messages[guest.id] = [...(state.messages[guest.id] ?? []), message].slice(-80);
    await saveState(state);

    sendJson(response, 200, { ok: true, guest: publicGuest(guest), plans: Object.values(plans), message, cost });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/boosters/refund") {
    const body = await readJson(request);
    const count = Number(body.count ?? 0);
    const prices = { 1: 120, 10: 1000 };
    const price = prices[count];
    const { state, account } = await findAccount(request);

    if (!account) {
      sendJson(response, 401, { ok: false, error: "account_required", plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    if (!price) {
      sendJson(response, 400, { ok: false, error: "invalid_count", account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    // Opened boosters are gone — only unopened ones can come back.
    if ((account.boosters ?? 0) < count) {
      sendJson(response, 409, { ok: false, error: "boosters_opened", account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    account.boosters -= count;
    account.creditsRemaining += price;
    account.updatedAt = new Date().toISOString();
    await saveState(state);
    sendJson(response, 200, { ok: true, account: publicAccount(account), plans: Object.values(plans), quests: Object.values(quests), count, price });
    return;
  }

  if (request.method === "DELETE" && url.pathname === "/api/v1/account") {
    const { state, account } = await findAccount(request);

    if (!account) {
      sendJson(response, 401, { ok: false, error: "account_required", plans: Object.values(plans), quests: Object.values(quests) });
      return;
    }

    const hasInteractions = (account.promptCount ?? 0) > 0 || (state.messages[account.id] ?? []).length > 0;

    if (hasInteractions) {
      // Discord-style: traces stay coherent, identity disappears.
      account.username = "Deleted User";
      account.handle = `deleted-${account.id.slice(0, 8)}`;
      account.email = `deleted-${account.id.slice(0, 8)}@deleted.invalid`;
      account.passwordHash = hashPassword(randomUUID());
      account.avatarDataUrl = "";
      account.birthDate = "";
      account.deletedAt = new Date().toISOString();
    } else {
      state.accounts = state.accounts.filter((item) => item.id !== account.id);
      delete state.messages[account.id];
    }

    await saveState(state);
    sendJson(response, 200, { ok: true, anonymized: hasInteractions });
    return;
  }

  sendJson(response, 404, { ok: false, error: "not_found" });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`useless-dopamine-ai backend listening on ${port}`);
});
