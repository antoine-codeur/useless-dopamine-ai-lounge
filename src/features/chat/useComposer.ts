import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type KeyboardEvent,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import type { Account, Attachment, GuestSession, Message } from "../../types";
import { useChatStore } from "./chat.store";
import { getProcessingPlan, PROMPT_COST, promptCostFor, visibleStepsFor } from "./chat.logic";
import { randomDelay } from "../../lib/random";
import { refundSteps, requestAgentResponse, requestGuestAgentResponse } from "../../lib/api";
import { recordCredit } from "../stats/ledger.store";
import { addSeasonXp } from "../season/season.store";
import { applyAccountResult, useAccountStore } from "../profile/account.store";
import { useShellStore } from "../shell/shell.store";
import { bumpQuest } from "../quests/quest.store";
import { getPersona } from "../personas/personas";
import { usePersonaStore } from "../personas/persona.store";
import { isoNow } from "../../lib/date";
import { showToast } from "../../components/Toast/toast.store";

const composerDictionary = [
  "accessibility",
  "animation",
  "architecture",
  "booster",
  "credits",
  "dashboard",
  "delight",
  "interaction",
  "keyboard",
  "latency",
  "layout",
  "onboarding",
  "polish",
  "profile",
  "responsive",
  "settings",
  "shortcuts",
  "upgrade",
];

interface UseComposerArgs {
  account: Account | null;
  guest: GuestSession | null;
  setGuest: Dispatch<SetStateAction<GuestSession | null>>;
  messages: Message[];
  promptRef: RefObject<HTMLTextAreaElement | null>;
  pendingAttachments: Attachment[];
  setPendingAttachments: Dispatch<SetStateAction<Attachment[]>>;
  stickToBottomRef: MutableRefObject<boolean>;
  setLimitReached: Dispatch<SetStateAction<boolean>>;
}

/** Owns the composer/generation engine: prompt state, the message queue, the
 *  fake processing plan, live billing/refunds, retries, edits and the composer
 *  keyboard. Reads the chat/account/shell/persona stores directly; takes the
 *  ChatPage-owned refs and account/guest state it can't own as arguments. */
export function useComposer({
  account,
  guest,
  setGuest,
  messages,
  promptRef,
  pendingAttachments,
  setPendingAttachments,
  stickToBottomRef,
  setLimitReached,
}: UseComposerArgs) {
  const [prompt, setPrompt] = useState("");
  /** When set, submitting EDITS that earlier prompt in place (regrows the branch). */
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  /** Pro+ message queue: prompts waiting for the current generation to end. */
  const [queuedPrompts, setQueuedPrompts] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [activeAiMessageId, setActiveAiMessageId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const timeoutIds = useRef<number[]>([]);
  /** ArrowUp/Down position while walking the prompt history (-1 = not walking). */
  const promptHistoryIndexRef = useRef(-1);
  /** Tracks where we were, to delete temporary chats on leave. */
  const temporaryContextRef = useRef<{ threadId: string; inChat: boolean }>({ threadId: "", inChat: true });
  /** Generations the user cancelled — late results get discarded. */
  const cancelledGenerationsRef = useRef<Set<string>>(new Set());
  /** Live billing per running generation: the user stamp ticks with the steps,
      and a cancel refunds whatever never ran (keyed by AI message id). */
  const billingRef = useRef<Map<string, { userMessageId: string; total: number; done: number }>>(new Map());

  const addUserMessage = useChatStore((state) => state.addUserMessage);
  const addAiPlaceholder = useChatStore((state) => state.addAiPlaceholder);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const addVariant = useChatStore((state) => state.addVariant);
  const updateTitleFromPrompt = useChatStore((state) => state.updateTitleFromPrompt);
  const setAccount = useAccountStore((state) => state.setAccount);
  const setPlans = useAccountStore((state) => state.setPlans);
  const setView = useShellStore((state) => state.setView);
  const activePersonaId = usePersonaStore((state) => state.activePersonaId);

  const activeCredits = account?.creditsRemaining ?? guest?.creditsRemaining ?? 0;

  // Composer text matching an existing prompt (e.g. recalled with ArrowUp)
  // offers in-place editing; depth = how many prompts back it sits.
  const trimmedPrompt = prompt.trim();
  const editCandidate = trimmedPrompt
    ? [...messages].reverse().find((message) => message.author === "user" && message.content === trimmedPrompt)
    : undefined;
  const editCandidateDepth = editCandidate
    ? [...messages].reverse().filter((message) => message.author === "user").findIndex((message) => message.id === editCandidate.id) + 1
    : 0;
  const canSend = useMemo(() => (prompt.trim().length > 0 || pendingAttachments.length > 0) && activeCredits >= PROMPT_COST && !isProcessing, [
    activeCredits,
    account,
    guest,
    isProcessing,
    pendingAttachments.length,
    prompt,
  ]);
  const currentWord = prompt.match(/(?:^|\s)([a-zA-Z]{2,})$/)?.[1].toLowerCase() ?? "";
  const composerSuggestions = currentWord
    ? composerDictionary.filter((word) => word.startsWith(currentWord) && word !== currentWord).slice(0, 5)
    : [];

  useEffect(() => {
    return () => {
      timeoutIds.current.forEach(window.clearTimeout);
    };
  }, []);

  function clearTimers() {
    timeoutIds.current.forEach(window.clearTimeout);
    timeoutIds.current = [];
  }

  function finishAiMessage(aiMessageId: string, content: string, durationMs?: number) {
    clearTimers();
    updateMessage(aiMessageId, {
      content,
      status: "done",
      completedAt: isoNow(),
      ...(durationMs !== undefined ? { durationMs } : {}),
    });
    setActiveAiMessageId(null);
    setIsProcessing(false);
  }

  function completePromptWord(word: string) {
    setPrompt((value) => value.replace(/([a-zA-Z]{2,})$/, word));
    setSuggestionIndex(0);
    window.requestAnimationFrame(() => promptRef.current?.focus());
  }

  /** Calls the agent backend, syncs credits, and returns the final markdown. */
  async function generateContent(promptText: string, stepCount: number): Promise<string | null> {
    const result = account ? await requestAgentResponse(promptText, stepCount) : await requestGuestAgentResponse(promptText, stepCount);

    if (!result.ok) {
      if ("account" in result && result.error === "credit_limit" && result.account) {
        applyAccountResult(result);
        setLimitReached(true);
        setView("plans");
      }
      if ("guest" in result && result.error === "guest_credit_limit" && result.guest) {
        setGuest(result.guest);
        setPlans(result.plans);
        setLimitReached(true);
        setView("plans");
      }
      return null;
    }

    if ("account" in result) {
      applyAccountResult(result);
    } else {
      setGuest(result.guest);
      setPlans(result.plans);
    }

    // Useful output: the active persona parses its wiki (Wikipedia, Poképédia,
    // Yugipedia…) into markdown, with the simulated-agent note as a footer.
    const persona = getPersona(activePersonaId);
    recordCredit(-(result.cost ?? PROMPT_COST), `Prompt · ${persona.label}`, "prompt");
    const parsed = await persona.fetchMarkdown();

    if (parsed) {
      bumpQuest(persona.questKey);
    }

    return parsed ? `${parsed}\n\n---\n\n*${result.message.content}*` : result.message.content;
  }

  /** Stages the fake processing plan then resolves an AI message. */
  function runGeneration(promptText: string, planOverride?: string[], billingArg?: { userMessageId: string; total: number }) {
    const aiMessage = addAiPlaceholder();
    const persona = getPersona(activePersonaId);
    // Transparent process log: every step lands on the message itself.
    const steps: string[] = [`Using ${persona.label} — ${persona.description}`];
    updateMessage(aiMessage.id, { persona: persona.label, startedAt: isoNow(), steps: [...steps], content: steps[0] });
    const plan = planOverride ?? getProcessingPlan(promptText);
    // Step 1 (the persona intro) is on screen: the stamp starts ticking at 1.
    const billing = billingArg ? { ...billingArg, done: 1 } : null;

    if (billing) {
      billingRef.current.set(aiMessage.id, billing);
    }

    const tickBilling = () => {
      if (billing) {
        billing.done = Math.min(billing.total, billing.done + 1);
        updateMessage(billing.userMessageId, { cost: billing.done });
      }
    };

    setIsProcessing(true);
    setActiveAiMessageId(aiMessage.id);

    // Feels like real work: 2–15s. The parse starts NOW in parallel; if it is
    // genuinely slower than the target, we wait for it to finish.
    const startedAtMs = Date.now();
    const target = randomDelay(2_000, 15_000);
    const contentPromise = generateContent(promptText, visibleStepsFor(plan.length));

    let elapsed = 240;
    const stepWindow = (target * 0.72) / Math.max(1, plan.length + 1);
    plan.forEach((step, index) => {
      elapsed += randomDelay(Math.floor(stepWindow * 0.5), Math.floor(stepWindow * 1.1));
      const id = window.setTimeout(() => {
        steps.push(step);
        updateMessage(aiMessage.id, {
          steps: [...steps],
          content: step,
          status: index === 0 ? "queued" : "processing",
        });
        tickBilling();
      }, elapsed);
      timeoutIds.current.push(id);
    });

    const finalId = window.setTimeout(async () => {
      steps.push("Rendering markdown response…");
      updateMessage(aiMessage.id, { steps: [...steps] });
      tickBilling();
      billingRef.current.delete(aiMessage.id);
      // Watchdog: 120s without a new step (this was the last one) = timeout.
      const outcome = await Promise.race([
        contentPromise,
        new Promise<"__timeout__">((resolve) => window.setTimeout(() => resolve("__timeout__"), 120_000)),
      ]);

      if (cancelledGenerationsRef.current.has(aiMessage.id)) {
        return;
      }

      if (outcome === "__timeout__") {
        finishAiMessage(aiMessage.id, "Request timed out after 2 minutes without progress. Retry to grow a new bud.", Date.now() - startedAtMs);
        return;
      }

      finishAiMessage(aiMessage.id, outcome ?? "Credit limit reached. Choose a plan to continue without friction.", Date.now() - startedAtMs);
    }, target);
    timeoutIds.current.push(finalId);
  }

  /** Sends a queued prompt (text only — attachments go through the composer). */
  function sendPromptText(text: string) {
    stickToBottomRef.current = true;
    // The plan is drawn first: the VISIBLE step count decides the price.
    const plan = getProcessingPlan(text);
    const cost = promptCostFor(visibleStepsFor(plan.length));
    // The stamp starts at 1 and ticks up as each step lands on screen.
    const userMessage = addUserMessage(text, 1, []);
    updateTitleFromPrompt(text);
    bumpQuest("messages");
    bumpQuest("ink", text.length);
    bumpQuest("credits-spent", cost);
    addSeasonXp(5);
    runGeneration(text, plan, { userMessageId: userMessage.id, total: cost });
  }

  function handleQueue() {
    const cleaned = prompt.trim();

    if (!cleaned) {
      return;
    }

    setQueuedPrompts((current) => [...current, cleaned]);
    setPrompt("");
    promptHistoryIndexRef.current = -1;
    bumpQuest("queued");
    window.requestAnimationFrame(() => promptRef.current?.focus());
  }

  /** Cancel a running generation (main flow or retry). */
  function cancelGeneration(message: Message) {
    cancelledGenerationsRef.current.add(message.id);
    const billing = billingRef.current.get(message.id);
    billingRef.current.delete(message.id);
    // Cancelled at step 3/5 = 3 credits: the unexecuted steps come back.
    const refund = billing ? Math.max(0, billing.total - billing.done) : 0;

    if (billing) {
      updateMessage(billing.userMessageId, { cost: billing.done });
    }

    if (activeAiMessageId === message.id) {
      finishAiMessage(message.id, "Generation cancelled — no additional credit consumed.");
    } else {
      // Retry path: restore the bubble to its previous done state.
      updateMessage(message.id, { status: "done" });
      setIsProcessing(false);
    }

    if (billing && refund > 0) {
      bumpQuest("credits-spent", -refund);
      void refundSteps(refund).then((result) => {
        if (!result.ok) {
          return;
        }

        if (result.account && result.quests) {
          // Narrowed here (steps-refund returns account OR guest), so the
          // explicit call is needed — the result object type stays optional.
          setAccount(result.account, result.plans, result.quests);
        } else if (result.guest) {
          setGuest(result.guest);
          setPlans(result.plans);
        }

        recordCredit(refund, `Cancelled at step ${billing.done}/${billing.total}`, "refund");
      });
    }

    // The refund itself stays invisible: the stamp simply stops at what ran.
    showToast({ variant: "info", title: "Generation cancelled" });
  }

  function submitPrompt(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const cleanedPrompt = prompt.trim();

    if ((!cleanedPrompt && pendingAttachments.length === 0) || (!account && !guest) || isProcessing) {
      return;
    }

    // Edit mode: rewrite the targeted prompt and regrow the branch from there.
    if (editTargetId && cleanedPrompt) {
      const target = messages.find((message) => message.id === editTargetId);
      setEditTargetId(null);

      if (target) {
        setPrompt("");
        promptHistoryIndexRef.current = -1;
        handleEditPrompt(target, cleanedPrompt);
        return;
      }
    }

    if (activeCredits < PROMPT_COST) {
      setLimitReached(true);
      setView("plans");
      return;
    }

    stickToBottomRef.current = true;
    promptHistoryIndexRef.current = -1;
    // The plan is drawn first: the VISIBLE step count decides the price.
    const plan = getProcessingPlan(cleanedPrompt);
    const cost = promptCostFor(visibleStepsFor(plan.length));
    // The stamp starts at 1 and ticks up as each step lands on screen.
    const userMessage = addUserMessage(cleanedPrompt || "Shared files", 1, pendingAttachments);
    updateTitleFromPrompt(cleanedPrompt || pendingAttachments[0]?.name || "Shared files");
    bumpQuest("messages");
    bumpQuest("ink", cleanedPrompt.length);
    bumpQuest("credits-spent", cost);
    addSeasonXp(5);
    if (pendingAttachments.length > 0) {
      bumpQuest("attachments", pendingAttachments.length);
    }
    setPrompt("");
    setPendingAttachments([]);
    runGeneration(cleanedPrompt, plan, { userMessageId: userMessage.id, total: cost });
  }

  /** Retry an AI answer: grows a new bud on the same message. */
  async function retryMessage(message: Message) {
    if (isProcessing) {
      return;
    }

    if (activeCredits < PROMPT_COST) {
      setLimitReached(true);
      setView("plans");
      return;
    }

    const index = messages.findIndex((candidate) => candidate.id === message.id);
    const sourcePrompt = [...messages.slice(0, Math.max(0, index))].reverse().find((candidate) => candidate.author === "user")?.content ?? "";

    setIsProcessing(true);
    updateMessage(message.id, {
      status: "processing",
      startedAt: isoNow(),
      steps: [`Regenerating with ${getPersona(activePersonaId).label} — growing a new bud…`],
    });
    const startedAtMs = Date.now();
    const target = randomDelay(2_000, 8_000);
    const outcome = await Promise.race([
      // A retry shows a single step — so it costs a single credit.
      Promise.all([generateContent(sourcePrompt, 1), new Promise((resolve) => window.setTimeout(resolve, target))]).then(
        ([content]) => content,
      ),
      new Promise<"__timeout__">((resolve) => window.setTimeout(() => resolve("__timeout__"), 120_000)),
    ]);

    if (cancelledGenerationsRef.current.has(message.id)) {
      cancelledGenerationsRef.current.delete(message.id);
      return;
    }

    if (outcome === "__timeout__") {
      updateMessage(message.id, { status: "done" });
      showToast({ variant: "warning", title: "Retry timed out", description: "No progress after 2 minutes — the previous result is untouched." });
      setIsProcessing(false);
      return;
    }

    if (outcome) {
      addVariant(message.id, outcome);
      updateMessage(message.id, { completedAt: isoNow(), durationMs: Date.now() - startedAtMs });
      bumpQuest("buds");
      bumpQuest("credits-spent", PROMPT_COST);
    } else {
      updateMessage(message.id, { status: "done" });
    }

    setIsProcessing(false);
  }

  /**
   * Edit a prompt: the new text becomes a NEW VERSION of that message (the old
   * one keeps its whole continuation), then the branch grows from the edit.
   */
  function handleEditPrompt(message: Message, content: string) {
    if (isProcessing) {
      return;
    }

    if (activeCredits < PROMPT_COST) {
      setLimitReached(true);
      setView("plans");
      return;
    }

    stickToBottomRef.current = true;
    addVariant(message.id, content);
    bumpQuest("versions");
    bumpQuest("credits-spent", PROMPT_COST);
    runGeneration(content);
  }

  function skipProcessing() {
    if (!activeAiMessageId) {
      return;
    }

    finishAiMessage(activeAiMessageId, "Generation stopped. No additional credit was consumed.");
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape" && editTargetId) {
      event.preventDefault();
      setEditTargetId(null);
      return;
    }

    if (event.key === "Tab" && composerSuggestions.length > 0) {
      event.preventDefault();
      completePromptWord(composerSuggestions[suggestionIndex] ?? composerSuggestions[0]);
      return;
    }

    if (event.key === "ArrowDown" && composerSuggestions.length > 0) {
      event.preventDefault();
      setSuggestionIndex((index) => (index + 1) % composerSuggestions.length);
      return;
    }

    if (event.key === "ArrowUp" && composerSuggestions.length > 0) {
      event.preventDefault();
      setSuggestionIndex((index) => (index - 1 + composerSuggestions.length) % composerSuggestions.length);
      return;
    }

    // ArrowUp on an empty composer recalls prompt history (terminal-style);
    // repeated presses walk older prompts, ArrowDown walks back to empty.
    const walkingHistory = promptHistoryIndexRef.current >= 0;

    if (event.key === "ArrowUp" && (prompt === "" || walkingHistory)) {
      const history = [...messages].filter((message) => message.author === "user").reverse();

      if (history.length === 0) {
        return;
      }

      event.preventDefault();
      const next = Math.min(promptHistoryIndexRef.current + 1, history.length - 1);
      promptHistoryIndexRef.current = next;
      setPrompt(history[next].content);
      return;
    }

    if (event.key === "ArrowDown" && walkingHistory) {
      event.preventDefault();
      const history = [...messages].filter((message) => message.author === "user").reverse();
      const next = promptHistoryIndexRef.current - 1;
      promptHistoryIndexRef.current = next;
      setPrompt(next < 0 ? "" : history[next]?.content ?? "");
      return;
    }

    // Enter sends (the chat standard); Shift+Enter inserts a newline. IME-safe.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submitPrompt();
    }
  }

  return {
    prompt,
    setPrompt,
    editTargetId,
    setEditTargetId,
    queuedPrompts,
    setQueuedPrompts,
    suggestionIndex,
    isProcessing,
    promptHistoryIndexRef,
    temporaryContextRef,
    trimmedPrompt,
    editCandidate,
    editCandidateDepth,
    canSend,
    composerSuggestions,
    finishAiMessage,
    completePromptWord,
    runGeneration,
    sendPromptText,
    handleQueue,
    cancelGeneration,
    submitPrompt,
    retryMessage,
    handleEditPrompt,
    skipProcessing,
    handleComposerKeyDown,
  };
}
