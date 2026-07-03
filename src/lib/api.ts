import type { Account, GuestSession, Plan, Quest } from "../types";

type ApiResult<T> = T & {
  ok: boolean;
  error?: string;
};

const accountIdKey = "uda:account-id";
const guestIdKey = "uda:guest-id";

export function getStoredAccountId(): string | null {
  return localStorage.getItem(accountIdKey);
}

export function storeAccountId(accountId: string): void {
  localStorage.setItem(accountIdKey, accountId);
}

export function clearStoredAccountId(): void {
  localStorage.removeItem(accountIdKey);
}

export function getStoredGuestId(): string {
  const existing = localStorage.getItem(guestIdKey);

  if (existing) {
    return existing;
  }

  const created = globalThis.crypto?.randomUUID?.() ?? `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(guestIdKey, created);
  return created;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const accountId = getStoredAccountId();
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accountId ? { Authorization: `Bearer ${accountId}` } : {}),
      ...(!accountId ? { "X-Guest-Id": getStoredGuestId() } : {}),
      ...(options.headers ?? {}),
    },
  });
  const payload = (await response.json()) as ApiResult<T>;

  return { ...payload, ok: response.ok && payload.ok !== false };
}

export function loadSession() {
  return request<{ account: Account; plans: Plan[]; quests: Quest[] }>("/api/v1/session");
}

export function loadGuestSession() {
  return request<{ guest: GuestSession; plans: Plan[] }>("/api/v1/guest-session");
}

export function createAccount(input: { username?: string; handle?: string; email: string; password: string }) {
  return request<{ account: Account; plans: Plan[]; quests: Quest[] }>("/api/v1/accounts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: { email: string; password: string }) {
  return request<{ account: Account; plans: Plan[]; quests: Quest[] }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAccount(input: {
  username?: string;
  handle?: string;
  avatarDataUrl?: string;
  birthDate?: string;
  onboardingStep?: Account["onboardingStep"];
  plan?: Account["plan"];
  billingCycle?: Account["planBillingCycle"];
  currentPassword?: string;
  newPassword?: string;
  settings?: Partial<Account["settings"]>;
}) {
  return request<{ account: Account; plans: Plan[]; quests: Quest[] }>("/api/v1/account", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function requestAgentResponse(prompt: string, steps?: number) {
  return request<{ account: Account; plans: Plan[]; quests: Quest[]; message: { id: string; content: string; createdAt: string }; cost: number }>(
    "/api/v1/agent-response",
    {
      method: "POST",
      body: JSON.stringify({ prompt, steps }),
    },
  );
}

export function requestGuestAgentResponse(prompt: string, steps?: number) {
  return request<{ guest: GuestSession; plans: Plan[]; message: { id: string; content: string; createdAt: string }; cost: number }>(
    "/api/v1/guest-agent-response",
    {
      method: "POST",
      body: JSON.stringify({ prompt, steps }),
    },
  );
}

export function claimQuest(questId: Quest["id"]) {
  return request<{ account: Account; plans: Plan[]; quests: Quest[]; rewardCredits: number }>("/api/v1/quests/claim", {
    method: "POST",
    body: JSON.stringify({ questId }),
  });
}

export function openBooster() {
  return request<{ account: Account; plans: Plan[]; quests: Quest[]; rewardCredits: number }>("/api/v1/boosters/open", {
    method: "POST",
  });
}

export function buyBoosters(count: number) {
  return request<{ account: Account; plans: Plan[]; quests: Quest[]; count: number; price: number }>("/api/v1/boosters/buy", {
    method: "POST",
    body: JSON.stringify({ count }),
  });
}

export function claimDailyBooster() {
  return request<{ account: Account; plans: Plan[]; quests: Quest[] }>("/api/v1/boosters/daily", {
    method: "POST",
  });
}

export function refundBoosters(count: number) {
  return request<{ account: Account; plans: Plan[]; quests: Quest[]; count: number; price: number }>("/api/v1/boosters/refund", {
    method: "POST",
    body: JSON.stringify({ count }),
  });
}

export function deleteAccount() {
  return request<{ anonymized: boolean }>("/api/v1/account", {
    method: "DELETE",
  });
}

export function refundSteps(credits: number) {
  return request<{ account?: Account; guest?: GuestSession; plans: Plan[]; quests?: Quest[]; refunded: number }>("/api/v1/steps-refund", {
    method: "POST",
    body: JSON.stringify({ credits }),
  });
}

export type PeriodSums = { today: number; week: number; month: number; year: number; total: number };

export type LeaderboardRow = {
  id: string;
  you: boolean;
  username: string;
  handle: string;
  plan: Account["plan"];
  creditsUsed: number;
  usage: PeriodSums;
  gains: PeriodSums;
};

export function fetchLeaderboard() {
  return request<{ leaderboard: LeaderboardRow[] }>("/api/v1/leaderboard");
}

export function claimBirthdayGift() {
  return request<{ account: Account; plans: Plan[]; quests: Quest[]; rewardCredits: number }>("/api/v1/birthday-gift", {
    method: "POST",
  });
}
