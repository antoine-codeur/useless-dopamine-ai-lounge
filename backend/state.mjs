import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { applyRenewal, hashToken, tokenFromRequest, guestIdFromRequest } from "./lib.mjs";

const dataFile = process.env.DATA_FILE ?? "/data/app.json";

export async function loadState() {
  try {
    const state = JSON.parse(await readFile(dataFile, "utf8"));
    return { accounts: [], messages: {}, guests: [], ...state };
  } catch {
    return { accounts: [], messages: {}, guests: [] };
  }
}

export async function saveState(state) {
  await mkdir(dirname(dataFile), { recursive: true });
  // Write to a temp file then atomically rename, so a crash mid-write can never
  // leave a half-written (corrupt) state file.
  const tmp = `${dataFile}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(state, null, 2));
  await rename(tmp, dataFile);
}

/**
 * All requests run through this single promise chain, so the read-modify-write
 * cycle on the JSON state file can never interleave between requests (no lost
 * updates / double-spend). Bodies are buffered by nginx upstream, so holding the
 * lock while reading a request body does not expose a slow-client stall here.
 */
let ioChain = Promise.resolve();
export function serialize(task) {
  const run = ioChain.then(task, task);
  ioChain = run.then(() => undefined, () => undefined);
  return run;
}

export async function findAccount(request) {
  const state = await loadState();
  const tokenHash = hashToken(tokenFromRequest(request));
  const account = state.accounts.find((item) => item.tokenHash && item.tokenHash === tokenHash && !item.deletedAt);

  if (account && applyRenewal(account)) {
    await saveState(state);
  }

  return { state, account };
}

export async function findOrCreateGuest(request) {
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
