import http from "node:http";
import { randomInt, randomUUID } from "node:crypto";
import {
  plans,
  quests,
  WHEEL_SEGMENTS,
  WHEEL_FIRST_SPIN_ID,
  pickWheelSegment,
  newSessionToken,
  hashToken,
  allotmentFor,
  applyRenewal,
  rateLimited,
  sendJson,
  ok,
  fail,
  readJson,
  todayKey,
  renewalDateForCycle,
  hashPassword,
  verifyPassword,
  tokenFromRequest,
  normalizeEmail,
  normalizeHandle,
  isEmail,
  isStrongPassword,
  handleFromEmail,
  uniqueHandle,
  isValidBirthDate,
  isValidAvatarDataUrl,
  isValidOnboardingStep,
  publicAccount,
  publicGuest,
  agentResponse,
  canClaimQuest,
  promptCost,
  boostGain,
  recordGain,
  periodSums,
} from "./lib.mjs";
import {
  loadState,
  saveState,
  serialize,
  findAccount,
  findOrCreateGuest,
} from "./state.mjs";

const port = Number(process.env.PORT ?? 8080);
const startedAt = new Date().toISOString();

async function handleRequest(request, response) {
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
      fail(response, 401, "account_required");
      return;
    }

    ok(response, 200, { account: publicAccount(account) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/v1/guest-session") {
    const { guest } = await findOrCreateGuest(request);
    sendJson(response, 200, { ok: true, guest: publicGuest(guest), plans: Object.values(plans) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/accounts") {
    if (rateLimited(request, "signup", 5)) {
      fail(response, 429, "too_many_attempts");
      return;
    }

    const body = await readJson(request);
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? "");

    if (!isEmail(email) || !isStrongPassword(password)) {
      fail(response, 400, "invalid_account");
      return;
    }

    const state = await loadState();

    if (state.accounts.some((account) => account.email === email)) {
      fail(response, 409, "email_taken");
      return;
    }

    const usernameInput = String(body.username ?? "").trim();
    const username = (usernameInput.length >= 2 ? usernameInput : email.split("@")[0]).slice(0, 40);
    const requestedHandle = normalizeHandle(body.handle) || handleFromEmail(email);
    const handle = uniqueHandle(state, requestedHandle);
    const now = new Date().toISOString();
    const sessionToken = newSessionToken();
    const account = {
      id: randomUUID(),
      username,
      handle,
      email,
      passwordHash: hashPassword(password),
      tokenHash: hashToken(sessionToken),
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
    ok(response, 201, { token: sessionToken, account: publicAccount(account) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/auth/login") {
    if (rateLimited(request, "login", 10)) {
      fail(response, 429, "too_many_attempts");
      return;
    }

    const body = await readJson(request);
    const state = await loadState();
    const account = state.accounts.find((item) => item.email === normalizeEmail(body.email) && !item.deletedAt);

    if (!account || !verifyPassword(String(body.password ?? ""), account.passwordHash)) {
      fail(response, 401, "invalid_credentials");
      return;
    }

    // Issue a fresh session token on every login (rotation invalidates any
    // previously leaked token; the account id is no longer a credential).
    const sessionToken = newSessionToken();
    account.tokenHash = hashToken(sessionToken);
    applyRenewal(account);
    account.updatedAt = new Date().toISOString();
    await saveState(state);
    ok(response, 200, { token: sessionToken, account: publicAccount(account) });
    return;
  }

  if (request.method === "PATCH" && url.pathname === "/api/v1/account") {
    const body = await readJson(request);
    const { state, account } = await findAccount(request);

    if (!account) {
      fail(response, 401, "account_required");
      return;
    }

    if (typeof body.username === "string" && body.username.trim().length >= 2) {
      account.username = body.username.trim().slice(0, 40);
    }

    if (typeof body.handle === "string") {
      const nextHandle = normalizeHandle(body.handle);
      if (nextHandle.length < 2 || state.accounts.some((item) => item.id !== account.id && item.handle === nextHandle)) {
        fail(response, 409, "handle_unavailable", { account: publicAccount(account) });
        return;
      }
      account.handle = nextHandle;
    }

    if (typeof body.avatarDataUrl === "string") {
      if (!isValidAvatarDataUrl(body.avatarDataUrl)) {
        fail(response, 400, "invalid_avatar", { account: publicAccount(account) });
        return;
      }
      account.avatarDataUrl = body.avatarDataUrl;
    }

    if (typeof body.birthDate !== "undefined") {
      if (!isValidBirthDate(body.birthDate)) {
        fail(response, 400, "invalid_birth_date", { account: publicAccount(account) });
        return;
      }
      account.birthDate = String(body.birthDate ?? "");
    }

    if (typeof body.onboardingStep === "string") {
      if (!isValidOnboardingStep(body.onboardingStep)) {
        fail(response, 400, "invalid_onboarding_step", { account: publicAccount(account) });
        return;
      }
      account.onboardingStep = body.onboardingStep;
    }

    if (typeof body.currentPassword === "string" || typeof body.newPassword === "string") {
      if (!verifyPassword(String(body.currentPassword ?? ""), account.passwordHash) || !isStrongPassword(String(body.newPassword ?? ""))) {
        fail(response, 400, "invalid_password", { account: publicAccount(account) });
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
        fail(response, 402, "upgrade_credit_limit", { account: publicAccount(account) });
        return;
      }

      account.plan = body.plan;
      account.planBillingCycle = billingCycle;
      account.planRenewsAt = renewalDateForCycle(billingCycle);
      account.creditsRemaining -= upgradeCost;
      account.creditsRemaining += Math.max(0, nextLimit - currentLimit);
      // The plan's allotment is a hard ceiling: without this, upgrading then
      // downgrading in a loop would mint credits every cycle.
      account.creditsRemaining = Math.min(account.creditsRemaining, nextLimit);
    }

    if (body.settings && typeof body.settings === "object") {
      account.settings = { ...(account.settings ?? {}), ...body.settings };
    }

    account.updatedAt = new Date().toISOString();
    await saveState(state);
    ok(response, 200, { account: publicAccount(account) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/steps-refund") {
    // Cancelling mid-generation: unexecuted steps come back (1 credit each).
    const body = await readJson(request);
    const refund = Math.min(11, Math.max(0, Math.round(Number(body.credits ?? 0)) || 0));
    const { state, account } = await findAccount(request);

    if (account) {
      // Cap at the plan allotment: a refund can only return spent credits, never
      // push the balance above what the plan grants (blocks refund-loop minting).
      account.creditsRemaining = Math.min(account.creditsRemaining + refund, allotmentFor(account.plan));
      account.creditsUsed = Math.max(0, (account.creditsUsed ?? 0) - refund);
      account.activityByDate[todayKey()] = Math.max(0, (account.activityByDate[todayKey()] ?? 0) - refund);
      account.updatedAt = new Date().toISOString();
      await saveState(state);
      ok(response, 200, { account: publicAccount(account), refunded: refund });
      return;
    }

    const { state: guestState, guest } = await findOrCreateGuest(request);
    guest.creditsRemaining = Math.min(guest.creditsRemaining + refund, 40);
    guest.creditsUsed = Math.max(0, (guest.creditsUsed ?? 0) - refund);
    guest.activityByDate[todayKey()] = Math.max(0, (guest.activityByDate[todayKey()] ?? 0) - refund);
    guest.updatedAt = new Date().toISOString();
    await saveState(guestState);
    sendJson(response, 200, { ok: true, guest: publicGuest(guest), plans: Object.values(plans), refunded: refund });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/v1/leaderboard") {
    const state = await loadState();
    const requesterHash = hashToken(tokenFromRequest(request));
    // Public, sanitized: never ship emails, avatar blobs, or the id/token to everyone.
    const rows = state.accounts
      .filter((account) => !account.deletedAt)
      .map((account) => ({
        you: Boolean(account.tokenHash) && account.tokenHash === requesterHash,
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
      fail(response, 401, "account_required");
      return;
    }

    const today = todayKey();
    const year = Number(today.slice(0, 4));
    const birthday = String(account.birthDate ?? "").slice(5, 10);

    if (!birthday || birthday !== today.slice(5, 10) || account.birthdayGiftYear === year) {
      fail(response, 409, "birthday_gift_unavailable", { account: publicAccount(account) });
      return;
    }

    const rewardCredits = 120;
    account.birthdayGiftYear = year;
    account.creditsRemaining += rewardCredits;
    recordGain(account, rewardCredits);
    account.updatedAt = new Date().toISOString();
    await saveState(state);
    ok(response, 200, { account: publicAccount(account), rewardCredits });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/quests/claim") {
    const body = await readJson(request);
    const questId = String(body.questId ?? "");
    const { state, account } = await findAccount(request);

    if (!account) {
      fail(response, 401, "account_required");
      return;
    }

    if (!canClaimQuest(account, questId)) {
      fail(response, 409, "quest_unavailable", { account: publicAccount(account) });
      return;
    }

    account.questClaims = account.questClaims ?? {};
    account.questClaims[questId] = quests[questId].repeat === "daily" ? todayKey() : true;
    const rewardCredits = boostGain(quests[questId].rewardCredits, account.plan);
    account.creditsRemaining += rewardCredits;
    recordGain(account, rewardCredits);
    account.updatedAt = new Date().toISOString();
    await saveState(state);
    ok(response, 200, { account: publicAccount(account), rewardCredits });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/boosters/open") {
    const { state, account } = await findAccount(request);

    if (!account) {
      fail(response, 401, "account_required");
      return;
    }

    if ((account.boosters ?? 0) <= 0) {
      fail(response, 409, "no_boosters", { account: publicAccount(account) });
      return;
    }

    // The very first booster a player ever opens is a guaranteed strong pull —
    // it's the hook. Every one after that is a crypto-random weighted draw.
    let base;

    if ((account.boostersOpened ?? 0) === 0) {
      base = 100;
    } else {
      const roll = randomInt(100);
      base = roll >= 98 ? 250 : roll >= 90 ? 100 : roll >= 65 ? 35 : 15;
    }

    const rewardCredits = boostGain(base, account.plan);
    account.boosters -= 1;
    account.boostersOpened = (account.boostersOpened ?? 0) + 1;
    account.creditsRemaining += rewardCredits;
    recordGain(account, rewardCredits);
    account.updatedAt = new Date().toISOString();
    await saveState(state);
    ok(response, 200, { account: publicAccount(account), rewardCredits });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/boosters/buy") {
    const body = await readJson(request);
    const count = Number(body.count ?? 0);
    const prices = { 1: 120, 10: 1000 };
    const price = prices[count];
    const { state, account } = await findAccount(request);

    if (!account) {
      fail(response, 401, "account_required");
      return;
    }

    if (!price) {
      fail(response, 400, "invalid_count", { account: publicAccount(account) });
      return;
    }

    if (account.creditsRemaining < price) {
      fail(response, 402, "credit_limit", { account: publicAccount(account) });
      return;
    }

    account.boosters = (account.boosters ?? 0) + count;
    // Track purchased count + credits spent so refunds can only return real
    // purchases (never free/daily boosters) and never more than was paid.
    account.boostersPurchased = (account.boostersPurchased ?? 0) + count;
    account.boosterSpent = (account.boosterSpent ?? 0) + price;
    // Shop spending is not "usage" — creditsUsed tracks chat prompts only.
    account.creditsRemaining -= price;
    account.updatedAt = new Date().toISOString();
    await saveState(state);
    ok(response, 200, { account: publicAccount(account), count, price });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/boosters/daily") {
    const { state, account } = await findAccount(request);

    if (!account) {
      fail(response, 401, "account_required");
      return;
    }

    if (account.dailyBoosterDay === todayKey()) {
      fail(response, 409, "already_claimed", { account: publicAccount(account) });
      return;
    }

    account.dailyBoosterDay = todayKey();
    account.boosters = (account.boosters ?? 0) + 1;
    account.updatedAt = new Date().toISOString();
    await saveState(state);
    ok(response, 200, { account: publicAccount(account) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/wheel/spin") {
    const { state, account } = await findAccount(request);

    if (!account) {
      fail(response, 401, "account_required");
      return;
    }

    if (account.wheelSpinDay === todayKey()) {
      fail(response, 409, "already_spun", { account: publicAccount(account) });
      return;
    }

    const firstSpin = (account.wheelSpins ?? 0) === 0;
    const segment = firstSpin
      ? WHEEL_SEGMENTS.find((seg) => seg.id === WHEEL_FIRST_SPIN_ID)
      : pickWheelSegment();
    account.wheelSpins = (account.wheelSpins ?? 0) + 1;
    account.wheelSpinDay = todayKey();

    if (segment.kind === "credits") {
      account.creditsRemaining += segment.amount;
      recordGain(account, segment.amount);
    } else if (segment.kind === "booster") {
      account.boosters = (account.boosters ?? 0) + segment.amount;
    }
    // "xp" is applied client-side (the season pass lives in a client store);
    // "none" grants nothing. The daily guard above is the anti-abuse control.

    account.updatedAt = new Date().toISOString();
    await saveState(state);
    ok(response, 200, {
      segmentId: segment.id,
      reward: { kind: segment.kind, amount: segment.amount },
      account: publicAccount(account),
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/v1/agent-response") {
    const body = await readJson(request);
    const { state, account } = await findAccount(request);
    const cost = promptCost(body.steps);

    if (!account) {
      fail(response, 401, "account_required");
      return;
    }

    if (account.creditsRemaining < cost) {
      fail(response, 402, "credit_limit", { account: publicAccount(account) });
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

    ok(response, 200, { account: publicAccount(account), message, cost });
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
      fail(response, 401, "account_required");
      return;
    }

    if (!price) {
      fail(response, 400, "invalid_count", { account: publicAccount(account) });
      return;
    }

    // Only refund boosters that were actually PURCHASED (not signup/daily gifts),
    // and only unopened ones. This blocks minting credits from free boosters.
    const purchased = account.boostersPurchased ?? 0;
    const refundable = Math.min(count, account.boosters ?? 0, purchased);

    if (refundable < count) {
      fail(response, 409, "boosters_opened", { account: publicAccount(account) });
      return;
    }

    // Pay back the average price actually paid — never more than was spent, so
    // buy-bulk-refund-singly arbitrage can't net free credits.
    const payout = purchased > 0 ? Math.round(((account.boosterSpent ?? 0) * refundable) / purchased) : 0;
    account.boosters -= refundable;
    account.boostersPurchased = purchased - refundable;
    account.boosterSpent = Math.max(0, (account.boosterSpent ?? 0) - payout);
    account.creditsRemaining = Math.min(account.creditsRemaining + payout, allotmentFor(account.plan));
    account.updatedAt = new Date().toISOString();
    await saveState(state);
    ok(response, 200, { account: publicAccount(account), count: refundable, price: payout });
    return;
  }

  if (request.method === "DELETE" && url.pathname === "/api/v1/account") {
    const { state, account } = await findAccount(request);

    if (!account) {
      fail(response, 401, "account_required");
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
}

const server = http.createServer((request, response) => {
  // Serialize every request so the JSON state file's read-modify-write cycles
  // can't interleave. A handler that throws still returns a 500, never hangs.
  serialize(() => handleRequest(request, response)).catch((error) => {
    console.error("request failed", error);

    if (!response.headersSent) {
      sendJson(response, 500, { ok: false, error: "server_error" });
    }
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`useless-dopamine-ai backend listening on ${port}`);
});
