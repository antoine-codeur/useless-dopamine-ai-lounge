import { CSSProperties, DragEvent as ReactDragEvent, FocusEvent as ReactFocusEvent, FormEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  CircleDashed,
  FileText,
  Ghost,
  Gift,
  ImagePlus,
  Mic,
  MicOff,
  Lock,
  ListPlus,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  Pencil,
  Send,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { Button, IconButton } from "../../components/Button/Button";
import { ChatBubble } from "../../components/ChatBubble/ChatBubble";
import { threadHasConversationContent, useChatStore } from "./chat.store";
import { PROMPT_COST, quickPrompts } from "./chat.logic";
import type { Account, GuestSession, Message } from "../../types";
import { prototype } from "../../app/prototype";
import {
  claimBirthdayGift,
  claimQuest,
  deleteAccount,
  getAuthToken,
  loadGuestSession,
  loadSession,
  openBooster,
  updateAccount,
} from "../../lib/api";
import { recordCredit } from "../stats/ledger.store";
import { addSeasonXp } from "../season/season.store";
import { SeasonPanel } from "../season/SeasonPanel";
import { RankingPanel } from "../ranking/RankingPanel";
import { useSpeechToText } from "./useSpeechToText";
import { applyAccountResult, useAccountStore } from "../profile/account.store";
import { isHandle, isStrongPassword, isValidOptionalBirthDate } from "../auth/validation";
import { useShellStore } from "../shell/shell.store";
import { SettingsPanel } from "../settings/SettingsPanel";
import { ActivityPanel } from "../activity/ActivityPanel";
import { computeActivityStats } from "../activity/activity.stats";
import { GalleryPanel } from "../gallery/GalleryPanel";
import { PlansPanel } from "../plans/PlansPanel";
import { EarnPanel } from "../earn/EarnPanel";
import { QuestsPanel } from "../quests/QuestsPanel";
import { LibraryPanel } from "../library/LibraryPanel";
import { ConfirmModal } from "../../components/ConfirmModal/ConfirmModal";
import { bumpQuest } from "../quests/quest.store";
import { PersonaMenu } from "../personas/PersonaMenu";
import { StatsPanel } from "../stats/StatsPanel";
import { useTelemetryStore } from "../stats/telemetry.store";
import { Inspector } from "./Inspector";
import { ModeMenu } from "../themes/ModeMenu";
import { AuthModal } from "../auth/AuthModal";
import { ThumbBar } from "./ThumbBar";
import { OnboardingScreen } from "./OnboardingScreen";
import { ProfileSettings } from "./ProfileSettings";
import { AccountMenu } from "./AccountMenu";
import { Sidebar } from "./Sidebar";
import { useAvatarEditor } from "./useAvatarEditor";
import { useThreadMenu } from "./useThreadMenu";
import { useAttachments } from "./useAttachments";
import { useAuthFlow } from "./useAuthFlow";
import { useFeedScroll } from "./useFeedScroll";
import { useComposer } from "./useComposer";
import { AvatarModal } from "../onboarding/AvatarModal";
import { FloatingTooltip } from "../../components/FloatingTooltip/FloatingTooltip";
import type { TooltipAnchor } from "../../components/FloatingTooltip/FloatingTooltip";
import { showToast } from "../../components/Toast/toast.store";
import { celebrate, useRewardStore } from "../rewards/reward.store";
import { openBoosterPuzzle } from "../rewards/puzzle.store";
import { creditGain } from "../rewards/creditCombo.store";
import { purgeScopeData, scopeIsNew, switchDataScope } from "../../lib/accountScope";
import { ShopPanel } from "../shop/ShopPanel";
import { nextBoosterFloor } from "../shop/shop.store";
import { useDismiss } from "../../lib/useDismiss";
import "./ChatPage.css";

// Profile and Settings are absent on purpose: the account menu owns them.
// railHidden pages are informative/optional — expanded sidebar only.
// Plans left the nav on purpose: it lives in Profile › Billing and behind
// the Upgrade actions.
export function ChatPage() {
  /** Pending save action awaiting the "keep temporary chat?" confirmation. */
  const [keepPrompt, setKeepPrompt] = useState<{ run: () => void } | null>(null);
  /** Virtual keyboard heuristic: an editable element has focus (mobile). */
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const view = useShellStore((state) => state.view);
  const setView = useShellStore((state) => state.setView);
  const actionMessage = useShellStore((state) => state.actionMessage);
  const setActionMessage = useShellStore((state) => state.setActionMessage);
  const {
    authMode,
    setAuthMode,
    signup,
    setSignup,
    loginForm,
    setLoginForm,
    signupError,
    authMessage,
    showAuthModal,
    setShowAuthModal,
    signupReady,
    openAuth,
    submitSignup,
    submitLogin,
  } = useAuthFlow();
  const [guest, setGuest] = useState<GuestSession | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileHandle, setProfileHandle] = useState("");
  const [profileBirthDate, setProfileBirthDate] = useState("");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const { avatarEditor, avatarScale, setAvatarScale, openAvatarImageFile, openAvatarFile, closeAvatarEditor, saveAvatar } = useAvatarEditor();
  const [showArchivedThreads, setShowArchivedThreads] = useState(false);
  const [billingCycle, setBillingCycle] = useState<Account["planBillingCycle"]>("monthly");
  const [profileDragActive, setProfileDragActive] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  // Phone-only: the sidebar becomes a drawer (threads, nav, account menu).
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Drag & drop from the OS (Explorer…) straight onto the chat stage.
  const [dropActive, setDropActive] = useState(false);
  const dragDepthRef = useRef(0);
  const speech = useSpeechToText((text) => {
    setPrompt((current) => (current ? `${current.trimEnd()} ${text}` : text));
    promptRef.current?.focus();
  });
  const [accountMenuPosition, setAccountMenuPosition] = useState<{ left: number; bottom: number } | null>(null);
  const accountButtonRef = useRef<HTMLButtonElement | null>(null);
  const accountHoverTimer = useRef<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("uda:sidebar-collapsed") === "true");
  const {
    threadMenuId,
    setThreadMenuId,
    threadMenuPosition,
    setThreadMenuPosition,
    renameThreadId,
    setRenameThreadId,
    renameValue,
    setRenameValue,
    threadMenuRef,
    startRename,
    commitRename,
    handleDeleteThread,
  } = useThreadMenu(() => setSidebarCollapsed(false));
  const [inspectorCollapsed, setInspectorCollapsed] = useState(() => localStorage.getItem("uda:inspector-collapsed") === "true");
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem("uda:sidebar-width") ?? 280));
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [isBooting, setIsBooting] = useState(true);
  const [limitReached, setLimitReached] = useState(false);
  const [floatingTooltip, setFloatingTooltip] = useState<TooltipAnchor | null>(null);
  const threads = useChatStore((state) => state.threads);
  const activeThreadId = useChatStore((state) => state.activeThreadId);
  const addVariant = useChatStore((state) => state.addVariant);
  const setActiveVariant = useChatStore((state) => state.setActiveVariant);
  const setReaction = useChatStore((state) => state.setReaction);
  const toggleBookmark = useChatStore((state) => state.toggleBookmark);
  const branchFromMessage = useChatStore((state) => state.branchFromMessage);
  const clearChat = useChatStore((state) => state.clearChat);
  const createThread = useChatStore((state) => state.createThread);
  const setActiveThread = useChatStore((state) => state.setActiveThread);
  const deleteThread = useChatStore((state) => state.deleteThread);
  const restoreThread = useChatStore((state) => state.restoreThread);
  const setThreadTemporary = useChatStore((state) => state.setThreadTemporary);
  const account = useAccountStore((state) => state.account);
  const plans = useAccountStore((state) => state.plans);
  const setAccount = useAccountStore((state) => state.setAccount);
  const setPlans = useAccountStore((state) => state.setPlans);
  const signOut = useAccountStore((state) => state.signOut);
  const accountMenuRef = useDismiss<HTMLDivElement>(showAccountMenu, () => setShowAccountMenu(false));
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const profileAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const onboardingAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? threads[0];
  const messages = activeThread?.messages ?? [];
  const { feedRef, stickToBottomRef, showJumpToBottom, handleFeedScroll, jumpToBottom } = useFeedScroll(messages, activeThreadId, view);
  const title = activeThread?.title ?? "New conversation";
  const conversationEmpty = messages.every((message) => message.author === "system");
  /** Attachments are a paid capability: locked for guests and the Free plan. */
  const canAttach = !!account && account.plan !== "free";
  const { pendingAttachments, setPendingAttachments, addFiles, handleComposerPaste, removePendingAttachment, attachFiles } = useAttachments(canAttach, promptRef);
  /** Message queueing unlocks with the Pro plan. */
  const canQueue = !!account && account.plan !== "free";
  const threadHasSaves =
    activeThread?.messages.some(
      (message) => Object.keys(message.bookmarks ?? {}).length > 0 || Object.keys(message.reactions ?? {}).length > 0,
    ) ?? false;
  /** The ghost toggle only shows while it can actually do something. */
  const canToggleTemporary = !!activeThread && (activeThread.temporary || !threadHasSaves);
  const {
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
    sendPromptText,
    handleQueue,
    cancelGeneration,
    submitPrompt,
    retryMessage,
    handleEditPrompt,
    skipProcessing,
    handleComposerKeyDown,
    completePromptWord,
  } = useComposer({
    account,
    guest,
    setGuest,
    messages,
    promptRef,
    pendingAttachments,
    setPendingAttachments,
    stickToBottomRef,
    setLimitReached,
  });
  const visibleThreads = [...threads]
    .filter(threadHasConversationContent)
    .filter((thread) => showArchivedThreads || !thread.archived || thread.id === activeThreadId)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));

  useEffect(() => {
    if (!getAuthToken()) {
      // Guest identity: make sure the guest data bucket is the live one.
      if (switchDataScope("guest")) {
        window.location.reload();
        return;
      }

      loadGuestSession().then((result) => {
        if (result.ok && result.guest) {
          setGuest(result.guest);
          setPlans(result.plans);
        }
        setIsBooting(false);
      });
      return;
    }

    loadSession().then((result) => {
      if (result.ok && result.account) {
        // Bind every unlock/conversation/etc. to this account. First scoping
        // of a pre-existing session carries the accumulated data over.
        if (switchDataScope(result.account.id, scopeIsNew(result.account.id))) {
          window.location.reload();
          return;
        }

        applyAccountResult(result);
      } else {
        loadGuestSession().then((guestResult) => {
          if (guestResult.ok && guestResult.guest) {
            setGuest(guestResult.guest);
            setPlans(guestResult.plans);
          }
        });
      }
      setIsBooting(false);
    });
  }, [setAccount, setPlans]);

  useEffect(() => {
    if (!account) {
      return;
    }

    setProfileName(account.username ?? "");
    setProfileHandle(account.handle ?? "");
    setProfileBirthDate(account.birthDate ?? "");
  }, [account]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/v1/health", { signal: controller.signal })
      .then((response) => {
        setBackendStatus(response.ok ? "online" : "offline");
      })
      .catch(() => {
        setBackendStatus("offline");
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!promptRef.current) {
      return;
    }

    promptRef.current.style.height = "0px";
    promptRef.current.style.height = `${Math.min(promptRef.current.scrollHeight, 160)}px`;
  }, [prompt]);

  useEffect(() => {
    if (!showAuthModal) {
      return;
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowAuthModal(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showAuthModal]);

  useEffect(() => {
    localStorage.setItem("uda:sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem("uda:inspector-collapsed", String(inspectorCollapsed));
  }, [inspectorCollapsed]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setSidebarCollapsed((value) => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    // Focused plans view: Escape triggers the "← Back" (unless an overlay owns it).
    if (view !== "plans") {
      return;
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (showAuthModal || showAccountMenu || threadMenuId || avatarEditor || useRewardStore.getState().celebration) {
        return;
      }

      event.preventDefault();
      setView("chat");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view, showAuthModal, showAccountMenu, threadMenuId, avatarEditor, setView]);

  useEffect(() => {
    // Global interaction telemetry: every button click, classified by region.
    useTelemetryStore.getState().recordBoot();

    const regionOf = (element: Element) => {
      if (element.closest(".sidebar")) return "sidebar";
      if (element.closest(".topbar")) return "topbar";
      if (element.closest(".prompt-form") || element.closest(".prompt-dock")) return "composer";
      if (element.closest(".inspector")) return "inspector";
      if (element.closest(".chat-bubble")) return "chat";
      if (element.closest(".account-popover")) return "account-menu";
      if (element.closest(".mode-menu__popover") || element.closest(".thread-menu")) return "menus";
      if (element.closest(".toaster")) return "toasts";
      if (element.closest(".modal-backdrop") || element.closest(".reward-backdrop")) return "modals";
      if (element.closest(".content-panel")) return "pages";
      return "app";
    };

    const onClick = (event: globalThis.MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("button, a") : null;

      if (!target) {
        return;
      }

      const label = (target.getAttribute("aria-label") ?? target.textContent ?? "button").trim().slice(0, 32) || "button";
      useTelemetryStore.getState().recordClick(`${regionOf(target)}/${label}`);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- installed once
  }, []);

  useEffect(() => {
    // Time spent per page.
    const startedAt = Date.now();
    return () => useTelemetryStore.getState().addPageTime(view, (Date.now() - startedAt) / 1000);
  }, [view]);

  useEffect(() => {
    // Plan journey: switches and time spent per plan (guests count too).
    useTelemetryStore.getState().trackPlan(account?.plan ?? "guest");
  }, [account?.plan]);

  useEffect(() => {
    // Leftover temporary chats from a previous session don't survive boot.
    const { threads: allThreads, activeThreadId: bootActiveId } = useChatStore.getState();
    allThreads
      .filter((thread) => thread.temporary && thread.id !== bootActiveId)
      .forEach((thread) => deleteThread(thread.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot-time purge
  }, []);

  useEffect(() => {
    // Temporary chats die when you leave them (thread switch or page change).
    const previous = temporaryContextRef.current;
    const inChat = view === "chat";
    const changedThread = activeThreadId !== previous.threadId;
    const leftChat = previous.inChat && !inChat;

    if (previous.threadId && (changedThread || leftChat)) {
      const previousThread = useChatStore.getState().threads.find((thread) => thread.id === previous.threadId);

      if (previousThread?.temporary) {
        deleteThread(previousThread.id);
        showToast({ variant: "info", title: "Temporary chat deleted" });
      }
    }

    temporaryContextRef.current = { threadId: activeThreadId, inChat };
  }, [activeThreadId, view, deleteThread]);

  useEffect(() => {
    // Track editable focus so the thumb bar can duck under the virtual keyboard.
    const isEditable = (target: EventTarget | null) =>
      target instanceof HTMLElement && (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable);
    const inDock = (target: EventTarget | null) => target instanceof Element && !!target.closest(".prompt-dock");
    // Tapping a composer tool (appearance, persona, attach…) blurs the textarea
    // for a beat — the thumb bar must NOT pop back during that interaction.
    let dockInteraction = false;
    const onPointerDown = (event: PointerEvent) => {
      dockInteraction = inDock(event.target);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (isEditable(event.target)) {
        setKeyboardOpen(true);
      }
    };
    const onFocusOut = (event: FocusEvent) => {
      if (isEditable(event.target) && !inDock(event.relatedTarget) && !dockInteraction) {
        setKeyboardOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  // Navigating anywhere closes the phone drawer — selection done, get out of the way.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [view, activeThreadId]);

  // The drawer shows the FULL sidebar (labels + threads), never the icon rail.
  useEffect(() => {
    if (mobileNavOpen) {
      setSidebarCollapsed(false);
      return;
    }

    if (window.matchMedia("(max-width: 760px)").matches) {
      setSidebarCollapsed(true);
    }
  }, [mobileNavOpen]);

  useEffect(() => {
    // Phone layout keeps only the icon rail: force-collapse when entering it.
    const media = window.matchMedia("(max-width: 760px)");
    const apply = (matches: boolean) => {
      if (matches) {
        setSidebarCollapsed(true);
      }
    };

    apply(media.matches);
    const onChange = (event: MediaQueryListEvent) => apply(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    localStorage.setItem("uda:sidebar-width", String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isResizingSidebar) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.clientX <= 96) {
        setSidebarCollapsed(true);
        return;
      }

      setSidebarCollapsed(false);
      setSidebarWidth(Math.min(420, Math.max(220, event.clientX)));
    };
    const onPointerUp = () => setIsResizingSidebar(false);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isResizingSidebar]);

  const activeCredits = account?.creditsRemaining ?? guest?.creditsRemaining ?? 0;

  useEffect(() => {
    // Queue drain: as soon as the agent is free, the next prompt fires.
    if (isProcessing || queuedPrompts.length === 0 || view !== "chat") {
      return;
    }

    if (activeCredits < PROMPT_COST) {
      setQueuedPrompts([]);
      showToast({ variant: "warning", title: "Queue cleared", description: "Not enough credits to keep sending." });
      return;
    }

    const [next, ...rest] = queuedPrompts;
    setQueuedPrompts(rest);
    sendPromptText(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- drain on state change
  }, [isProcessing, queuedPrompts, view, activeCredits]);
  const activeCreditsUsed = account?.creditsUsed ?? guest?.creditsUsed ?? 0;
  const activeActivity = account?.activityByDate ?? guest?.activityByDate ?? {};
  const activeBoosters = account?.boosters ?? 0;
  const activityStats = computeActivityStats(activeActivity);
  const currentPlan = plans.find((plan) => plan.id === account?.plan);
  const activePlanLabel = account ? currentPlan?.label ?? "Free" : "Guest";
  const passwordReady = isStrongPassword(passwordForm.newPassword);
  const profileNameInvalid = profileName.length > 0 && profileName.trim().length < 2;
  const profileHandleInvalid = profileHandle.length > 0 && !isHandle(profileHandle);
  const profileBirthDateInvalid = !isValidOptionalBirthDate(profileBirthDate);
  const isGuestLanding = !account && title === "New conversation" && conversationEmpty;
  // CSS vars (not an inline grid template) so responsive media queries win.
  const sidebarWidthStyle = {
    "--sidebar-width": `${sidebarCollapsed ? 56 : sidebarWidth}px`,
    "--inspector-width": inspectorCollapsed ? "0px" : "19rem",
  } as CSSProperties;

  function showTooltipFor(element: HTMLElement) {
    // Touch fires pointerover on tap; without this guard the tooltip flashes on
    // every tap. Hover-capable pointers still get it; labels have aria fallbacks.
    if (!window.matchMedia("(hover: hover)").matches) {
      return;
    }

    const label = element.dataset.tooltip;

    if (!label) {
      return;
    }

    const rect = element.getBoundingClientRect();
    setFloatingTooltip({ label, left: rect.left, top: rect.top, bottom: rect.bottom, width: rect.width });
  }

  function tooltipTarget(target: EventTarget | null) {
    return target instanceof Element ? target.closest<HTMLElement>("[data-tooltip]") : null;
  }

  function handleTooltipPointerOver(event: ReactPointerEvent<HTMLElement>) {
    const element = tooltipTarget(event.target);

    if (element) {
      showTooltipFor(element);
    }
  }

  function handleTooltipPointerOut(event: ReactPointerEvent<HTMLElement>) {
    const element = tooltipTarget(event.target);
    const nextTarget = event.relatedTarget;

    if (element && nextTarget instanceof Node && element.contains(nextTarget)) {
      return;
    }

    setFloatingTooltip(null);
  }

  function handleTooltipFocus(event: ReactFocusEvent<HTMLElement>) {
    const element = tooltipTarget(event.target);

    if (element) {
      showTooltipFor(element);
    }
  }

  function handleTooltipBlur() {
    setFloatingTooltip(null);
  }

  function newThread() {
    createThread();
    setView("chat");
    setThreadMenuId(null);
    bumpQuest("sessions");
  }


  function handleClearChat() {
    if (!activeThread) {
      return;
    }

    const snapshot = { id: activeThread.id, title: activeThread.title, messages: activeThread.messages };
    clearChat();
    showToast({
      title: "Conversation cleared",
      variant: "info",
      actionLabel: "Undo",
      onAction: () => restoreThread(snapshot.id, snapshot.title, snapshot.messages),
    });
  }



  /** Branch "in this conversation": duplicate the current bud as a fresh one. */
  function handleBranchHere(message: Message) {
    addVariant(message.id, message.content);
    bumpQuest("buds");
    showToast({
      variant: "success",
      title: "New bud grown",
      description: "Same result, fresh branch — the previous bud keeps its continuation.",
    });
  }

  /** "Branch in new chat": duplicates the whole conversation (buds included). */
  function handleBranch(message: Message) {
    const branchedId = branchFromMessage(message.id);

    if (branchedId) {
      setView("chat");
      bumpQuest("branches");
      showToast({
        variant: "success",
        title: "Branched in a new chat",
        description: "Full conversation duplicated — switch buds freely here.",
      });
    }
  }

  /** Saving inside a temporary chat first asks to keep the conversation. */
  function guardTemporarySave(run: () => void) {
    if (activeThread?.temporary) {
      setKeepPrompt({ run });
      return;
    }

    run();
  }

  function handleReact(message: Message, reaction: "up" | "down") {
    guardTemporarySave(() => {
      const budIndex = message.variantIndex ?? 0;
      const current = message.reactions?.[budIndex];
      const clearing = current === reaction;
      setReaction(message.id, budIndex, clearing ? undefined : reaction);

      if (!clearing) {
        bumpQuest(reaction === "up" ? "likes" : "dislikes");
      }
    });
  }

  function handleBookmark(message: Message) {
    guardTemporarySave(() => {
      const budIndex = message.variantIndex ?? 0;
      const alreadySaved = !!message.bookmarks?.[budIndex];
      toggleBookmark(message.id, budIndex);

      if (!alreadySaved) {
        bumpQuest("bookmarks");
      }

      showToast(
        alreadySaved
          ? { variant: "info", title: "Removed from Library" }
          : { variant: "success", title: "Saved to Library", description: "Find it under Read later." },
      );
    });
  }

  function toggleTemporary() {
    if (!activeThread) {
      return;
    }

    if (activeThread.temporary) {
      setThreadTemporary(activeThread.id, false);
      showToast({ variant: "success", title: "Conversation saved", description: "It will stick around now." });
      return;
    }

    const hasSaves = activeThread.messages.some(
      (message) =>
        Object.keys(message.bookmarks ?? {}).length > 0 || Object.keys(message.reactions ?? {}).length > 0,
    );

    if (hasSaves) {
      showToast({ variant: "warning", title: "Can't make this temporary", description: "It already holds saved items (likes or bookmarks)." });
      return;
    }

    setThreadTemporary(activeThread.id, true);
    bumpQuest("temp-chats");
    showToast({ variant: "info", title: "Temporary chat", description: "Deleted when you leave — saving anything keeps it." });
  }

  async function saveOnboardingProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (profileName.trim().length < 2 || !isHandle(profileHandle)) {
      setActionMessage("Fix the highlighted fields before continuing.");
      return;
    }

    const result = await updateAccount({ username: profileName, handle: profileHandle, onboardingStep: "avatar" });

    if (!result.ok) {
      setActionMessage(result.error === "handle_unavailable" ? "That handle is unavailable." : "Profile could not be saved.");
      return;
    }

    applyAccountResult(result);
    setActionMessage("");
  }

  async function skipOnboardingStep(step: Account["onboardingStep"]) {
    setActionMessage("");
    const result = await updateAccount({ onboardingStep: step });

    if (result.ok) {
      applyAccountResult(result);
    }
  }

  async function finishBirthdayStep(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!isValidOptionalBirthDate(profileBirthDate)) {
      setActionMessage("Use a valid past date or leave it empty.");
      return;
    }

    const result = await updateAccount({ birthDate: profileBirthDate, onboardingStep: "complete" });

    if (!result.ok) {
      setActionMessage("Use a valid past date or leave it empty.");
      return;
    }

    applyAccountResult(result);
    setActionMessage("");

    if (profileBirthDate) {
      bumpQuest("birthday-set");
    }
  }

  async function saveProfile() {
    if (profileName.trim().length < 2 || !isHandle(profileHandle) || !isValidOptionalBirthDate(profileBirthDate)) {
      setActionMessage("Fix the highlighted fields before saving.");
      return;
    }

    const result = await updateAccount({ username: profileName, handle: profileHandle, birthDate: profileBirthDate });

    if (!result.ok) {
      setActionMessage(result.error === "handle_unavailable" ? "That handle is unavailable." : "Profile could not be saved.");
      return;
    }

    applyAccountResult(result);
    setActionMessage("");
    bumpQuest("profile-saves");
    bumpQuest("handle-set");
    showToast({ variant: "success", title: "Profile saved" });
  }

  async function changePassword() {
    setActionMessage("");
    const result = await updateAccount(passwordForm);

    if (!result.ok) {
      setActionMessage("Password update failed. Check your current password and satisfy every requirement.");
      return;
    }

    applyAccountResult(result);
    setPasswordForm({ currentPassword: "", newPassword: "" });
    setActionMessage("");
    bumpQuest("password-changed");
    showToast({ variant: "success", title: "Password updated" });
  }

  async function choosePlan(planId: Account["plan"]) {
    if (!account) {
      setLimitReached(false);
      openAuth("signup", `Create an account to unlock ${plans.find((plan) => plan.id === planId)?.label ?? "a plan"} with credits.`);
      return;
    }

    const planChanged = planId !== account.plan || billingCycle !== account.planBillingCycle;
    const result = await updateAccount({ plan: planId, billingCycle });

    if (result.ok) {
      const upgradeCost = (plans.find((plan) => plan.id === planId)?.upgradeCost ?? 0) * (billingCycle === "yearly" ? 10 : 1);

      if (planChanged && upgradeCost > 0) {
        recordCredit(-upgradeCost, `Plan: ${plans.find((plan) => plan.id === planId)?.label ?? planId}`, "plan");
      }

      applyAccountResult(result);
      setLimitReached(false);
      setView("chat");
      return;
    }

    if (result.error === "upgrade_credit_limit" && result.account) {
      applyAccountResult(result);
      setLimitReached(true);
    }
  }

  async function claim(questId: "daily-check-in" | "open-first-booster" | "send-three-prompts") {
    const result = await claimQuest(questId);

    if (!result.ok) {
      showToast({ variant: "warning", title: "Quest not ready yet", description: "Complete the action first, then claim." });
      return;
    }

    applyAccountResult(result);
    bumpQuest("dailies");
    bumpQuest("credits-earned", result.rewardCredits);
    recordCredit(result.rewardCredits, `Quest: ${result.quests.find((quest) => quest.id === questId)?.label ?? questId}`, "quest");
    addSeasonXp(10);
    creditGain(result.rewardCredits);
    celebrate({ title: "Quest complete!", credits: result.rewardCredits, icon: "trophy" });
  }

  async function openCreditBooster() {
    const result = await openBooster();

    if (!result.ok) {
      showToast({ variant: "warning", title: "No boosters available", description: "Complete quests to earn more." });
      return;
    }

    applyAccountResult(result);
    bumpQuest("boosters");
    bumpQuest("credits-earned", result.rewardCredits);
    recordCredit(result.rewardCredits, "Booster opening", "booster");
    addSeasonXp(10);
    creditGain(result.rewardCredits);
    // The booster opens as a tappable puzzle — rarity climbs with fast taps,
    // never below the pity floor (first ever / one per batch of 10 = Rare+).
    openBoosterPuzzle([result.rewardCredits], nextBoosterFloor());
  }

  async function claimBirthday() {
    const result = await claimBirthdayGift();

    if (!result.ok) {
      showToast({ variant: "warning", title: "Birthday gift not available today", description: "It unlocks once a year, on your birthday." });
      return;
    }

    applyAccountResult(result);
    bumpQuest("credits-earned", result.rewardCredits);
    recordCredit(result.rewardCredits, "Birthday gift", "gift");
    creditGain(result.rewardCredits);
    celebrate({ title: "Happy birthday!", credits: result.rewardCredits, icon: "cake" });
  }

  async function handleDeleteAccount() {
    const scope = account?.id;
    setConfirmDeleteAccount(false);
    const result = await deleteAccount().catch(() => null);

    if (!result?.ok) {
      showToast({ variant: "warning", title: "Deletion failed", description: "The server did not confirm — your account is untouched." });
      return;
    }

    showToast({
      variant: "success",
      title: result.anonymized ? "Account anonymized" : "Account deleted",
      description: result.anonymized ? "Your identity is now “Deleted User” — nothing links back to you." : "Everything about this account is gone.",
    });
    signOut();
    switchDataScope("guest");

    if (scope) {
      // The parked bucket dies with the account — no ghost data on this device.
      purgeScopeData(scope);
    }

    window.setTimeout(() => window.location.reload(), 900);
  }

  async function handleSignOut() {
    setShowAccountMenu(false);
    signOut();

    // Back to the guest bucket — the account's data stays parked under its id.
    if (switchDataScope("guest")) {
      window.location.reload();
      return;
    }

    const result = await loadGuestSession();

    if (result.ok && result.guest) {
      setGuest(result.guest);
      setPlans(result.plans);
    }

    setView("chat");
  }


  function handleProfileDragOver(event: ReactDragEvent<HTMLElement>) {
    if (!account || !Array.from(event.dataTransfer.items).some((item) => item.type.startsWith("image/"))) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setProfileDragActive(true);
  }

  function handleProfileDragLeave(event: ReactDragEvent<HTMLElement>) {
    const nextTarget = event.relatedTarget;

    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setProfileDragActive(false);
    }
  }

  function handleProfileDrop(event: ReactDragEvent<HTMLElement>) {
    if (!account) {
      return;
    }

    event.preventDefault();
    setProfileDragActive(false);
    openAvatarImageFile(Array.from(event.dataTransfer.files).find((file) => file.type.startsWith("image/")));
  }

  async function copyAccountId() {
    const value = account ? account.handle : guest?.id ?? "guest";
    await navigator.clipboard?.writeText(value);
    showToast({ variant: "success", title: "User ID copied", description: value });
    setShowAccountMenu(false);
  }

  function openAccountView(nextView: typeof view) {
    setView(nextView);
    setShowAccountMenu(false);
  }

  /** Anchored above the account button; fixed so the icon rail can't clip it. */
  function openAccountMenu(anchor: HTMLElement) {
    const rect = anchor.getBoundingClientRect();
    setAccountMenuPosition({ left: Math.max(8, rect.left), bottom: Math.max(8, window.innerHeight - rect.top + 8) });
    setShowAccountMenu(true);
  }

  function clearAccountHoverTimer() {
    if (accountHoverTimer.current) {
      window.clearTimeout(accountHoverTimer.current);
      accountHoverTimer.current = null;
    }
  }

  function handleAccountHoverEnter() {
    if (!window.matchMedia("(hover: hover)").matches) {
      return;
    }

    clearAccountHoverTimer();

    if (!showAccountMenu && accountButtonRef.current) {
      openAccountMenu(accountButtonRef.current);
    }
  }

  function handleAccountHoverLeave() {
    if (!window.matchMedia("(hover: hover)").matches) {
      return;
    }

    clearAccountHoverTimer();
    accountHoverTimer.current = window.setTimeout(() => setShowAccountMenu(false), 220);
  }


  if (isBooting) {
    return (
      <main className="auth-screen">
        <Sparkles size={32} />
        <p>Loading account...</p>
      </main>
    );
  }

  if (account && account.onboardingStep !== "complete") {
    return (
      <OnboardingScreen
        account={account}
        actionMessage={actionMessage}
        avatarEditor={avatarEditor}
        avatarScale={avatarScale}
        closeAvatarEditor={closeAvatarEditor}
        finishBirthdayStep={finishBirthdayStep}
        onboardingAvatarInputRef={onboardingAvatarInputRef}
        openAvatarFile={openAvatarFile}
        profileBirthDate={profileBirthDate}
        profileBirthDateInvalid={profileBirthDateInvalid}
        profileHandle={profileHandle}
        profileHandleInvalid={profileHandleInvalid}
        profileName={profileName}
        profileNameInvalid={profileNameInvalid}
        saveAvatar={saveAvatar}
        saveOnboardingProfile={saveOnboardingProfile}
        setAvatarScale={setAvatarScale}
        setProfileBirthDate={setProfileBirthDate}
        setProfileHandle={setProfileHandle}
        setProfileName={setProfileName}
        skipOnboardingStep={skipOnboardingStep}
      />
    );
  }

  return (
    <main
      className="app-shell"
      data-empty={view === "chat" && conversationEmpty}
      data-focus={view === "plans"}
      data-guest={!account}
      data-inspector-collapsed={inspectorCollapsed}
      data-keyboard={keyboardOpen}
      data-landing={isGuestLanding}
      data-mobile-nav={mobileNavOpen || undefined}
      data-sidebar-collapsed={sidebarCollapsed}
      onBlur={handleTooltipBlur}
      onFocus={handleTooltipFocus}
      onPointerOut={handleTooltipPointerOut}
      onPointerOver={handleTooltipPointerOver}
      style={sidebarWidthStyle}
    >
      {mobileNavOpen ? (
        <button aria-label="Close navigation" className="mobile-nav-backdrop" onClick={() => setMobileNavOpen(false)} type="button" />
      ) : null}
      <Sidebar
        accountMenu={
          <AccountMenu
            account={account}
            accountButtonRef={accountButtonRef}
            accountMenuPosition={accountMenuPosition}
            accountMenuRef={accountMenuRef}
            copyAccountId={copyAccountId}
            currentPlan={currentPlan}
            handleAccountHoverEnter={handleAccountHoverEnter}
            handleAccountHoverLeave={handleAccountHoverLeave}
            handleSignOut={handleSignOut}
            openAccountMenu={openAccountMenu}
            openAccountView={openAccountView}
            openAuth={openAuth}
            setShowAccountMenu={setShowAccountMenu}
            showAccountMenu={showAccountMenu}
          />
        }
        activeThreadId={activeThreadId}
        commitRename={commitRename}
        handleDeleteThread={handleDeleteThread}
        newThread={newThread}
        renameThreadId={renameThreadId}
        renameValue={renameValue}
        setIsResizingSidebar={setIsResizingSidebar}
        setMobileNavOpen={setMobileNavOpen}
        setRenameThreadId={setRenameThreadId}
        setRenameValue={setRenameValue}
        setShowArchivedThreads={setShowArchivedThreads}
        setSidebarCollapsed={setSidebarCollapsed}
        setThreadMenuId={setThreadMenuId}
        setThreadMenuPosition={setThreadMenuPosition}
        setView={setView}
        showArchivedThreads={showArchivedThreads}
        sidebarCollapsed={sidebarCollapsed}
        startRename={startRename}
        view={view}
        threadMenuId={threadMenuId}
        threadMenuPosition={threadMenuPosition}
        threadMenuRef={threadMenuRef}
        visibleThreads={visibleThreads}
      />

      <section
        className="chat-stage"
        onDragEnter={(event) => {
          if (view !== "chat" || !event.dataTransfer?.types.includes("Files")) {
            return;
          }

          event.preventDefault();
          dragDepthRef.current += 1;
          setDropActive(true);
        }}
        onDragLeave={() => {
          if (!dropActive) {
            return;
          }

          dragDepthRef.current -= 1;

          if (dragDepthRef.current <= 0) {
            dragDepthRef.current = 0;
            setDropActive(false);
          }
        }}
        onDragOver={(event) => {
          if (dropActive || event.dataTransfer?.types.includes("Files")) {
            event.preventDefault();
          }
        }}
        onDrop={(event) => {
          dragDepthRef.current = 0;
          setDropActive(false);

          if (view !== "chat" || !event.dataTransfer) {
            return;
          }

          event.preventDefault();
          const files = Array.from(event.dataTransfer.files);

          if (files.length > 0) {
            void attachFiles(files);
          }
        }}
      >
        {dropActive ? (
          <div aria-hidden className="drop-overlay">
            <ImagePlus size={28} />
            <strong>Drop to attach</strong>
            <span>Images & files land on your prompt</span>
          </div>
        ) : null}
        <header className="topbar">
          <button className="conversation-title" data-tooltip="Rename conversation" onClick={() => activeThread && startRename(activeThread)} type="button">
            <h2>{title === "New conversation" ? prototype.chatTitle : title}</h2>
            <ChevronDown size={16} />
          </button>
          <div className="topbar__actions">
            {backendStatus !== "online" ? (
              <span className="backend-pill" data-status={backendStatus}>
                <CircleDashed size={14} />
                API {backendStatus}
              </span>
            ) : null}
            {view === "chat" && canToggleTemporary ? (
              <IconButton
                aria-pressed={!!activeThread?.temporary}
                className="compact-button compact-button--icon"
                data-active={activeThread?.temporary || undefined}
                label={activeThread?.temporary ? "Temporary chat — deleted when you leave" : "Make this chat temporary"}
                onClick={toggleTemporary}
                type="button"
              >
                <Ghost size={15} />
              </IconButton>
            ) : null}
            {account?.plan === "max-plus" ? (
              <Button className="compact-button" data-tooltip="You're on the top plan — earn credits instead" onClick={() => setView("earn")} size="sm" type="button" variant="secondary">
                <Gift size={15} />
                Earn
              </Button>
            ) : (
              <Button className="compact-button" data-tooltip="View plans" onClick={() => setView("plans")} size="sm" type="button" variant="secondary">
                <Zap size={15} />
                Upgrade
              </Button>
            )}
            {view === "chat" && !conversationEmpty ? (
              <Button aria-label="Clear chat" className="compact-button compact-button--icon" data-tooltip="Clear current conversation" onClick={handleClearChat} size="icon" type="button" variant="ghost">
                <Trash2 size={15} />
              </Button>
            ) : null}
            <IconButton
              aria-pressed={inspectorCollapsed}
              className="compact-button compact-button--icon inspector-toggle"
              label={inspectorCollapsed ? "Show side panel" : "Hide side panel"}
              onClick={() => setInspectorCollapsed((value) => !value)}
              type="button"
            >
              {inspectorCollapsed ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}
            </IconButton>
          </div>
        </header>

        <div className="chat-scroll-area">
          {view === "chat" && conversationEmpty ? <div className="chat-intro">
            <div className="intro-mark">
              <Sparkles size={28} />
            </div>
            <h3>What should feel better next?</h3>
            <p>{prototype.description}</p>
          </div> : null}

          {view === "chat" && !conversationEmpty ? <div className="message-feed" onScroll={handleFeedScroll} ref={feedRef}>
            <div className="message-feed__inner">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <ChatBubble
                  busy={isProcessing}
                  key={message.id}
                  message={message}
                  onBookmark={handleBookmark}
                  onBranch={handleBranch}
                  onBranchHere={handleBranchHere}
                  onCancel={cancelGeneration}
                  onEdit={handleEditPrompt}
                  onReact={handleReact}
                  onRetry={(target) => void retryMessage(target)}
                  onVariant={(target, index) => setActiveVariant(target.id, index)}
                />
              ))}
            </AnimatePresence>
            </div>
          </div> : null}

          {view === "profile" ? (
            <ProfileSettings
              account={account}
              actionMessage={actionMessage}
              activityStats={activityStats}
              changePassword={changePassword}
              currentPlan={currentPlan}
              handleProfileDragLeave={handleProfileDragLeave}
              handleProfileDragOver={handleProfileDragOver}
              handleProfileDrop={handleProfileDrop}
              openAuth={openAuth}
              openAvatarFile={openAvatarFile}
              passwordForm={passwordForm}
              passwordReady={passwordReady}
              profileAvatarInputRef={profileAvatarInputRef}
              profileBirthDate={profileBirthDate}
              profileBirthDateInvalid={profileBirthDateInvalid}
              profileDragActive={profileDragActive}
              profileHandle={profileHandle}
              profileHandleInvalid={profileHandleInvalid}
              profileName={profileName}
              profileNameInvalid={profileNameInvalid}
              saveProfile={saveProfile}
              setConfirmDeleteAccount={setConfirmDeleteAccount}
              setPasswordForm={setPasswordForm}
              setProfileBirthDate={setProfileBirthDate}
              setProfileHandle={setProfileHandle}
              setProfileName={setProfileName}
              setView={setView}
            />
          ) : null}

          {view === "settings" ? (
            <SettingsPanel
              onCreateAccount={() => openAuth("signup", "Create an account to keep these settings across sessions.")}
              onSignOut={handleSignOut}
            />
          ) : null}

          {view === "plans" ? (
            <PlansPanel
              billingCycle={billingCycle}
              limitReached={limitReached}
              onBillingCycleChange={setBillingCycle}
              onChoosePlan={choosePlan}
            />
          ) : null}

          {view === "library" ? (
            <LibraryPanel
              onOpen={(item) => {
                setActiveThread(item.threadId);
                setActiveVariant(item.messageId, item.variantIndex);
                setView("chat");
                bumpQuest("library-opens");
              }}
              onRemoveBookmark={(item) => toggleBookmark(item.messageId, item.variantIndex)}
            />
          ) : null}

          {view === "stats" ? <StatsPanel /> : null}

          {view === "shop" ? (
            <ShopPanel
              onCreateAccount={() => openAuth("signup", "Create an account to buy and open boosters.")}
              onLogin={() => openAuth("login")}
            />
          ) : null}

          {view === "season" ? (
            <SeasonPanel
              onCreateAccount={() => openAuth("signup", "Create an account to climb the season pass.")}
              onLogin={() => openAuth("login")}
            />
          ) : null}

          {view === "ranking" ? <RankingPanel /> : null}

          {view === "quests" ? (
            <QuestsPanel
              activityByDate={activeActivity}
              onClaimQuest={claim}
              onCreateAccount={() => openAuth("signup", "Create an account to track quests and claim credit rewards.")}
              onLogin={() => openAuth("login")}
            />
          ) : null}

          {view === "activity" ? (
            <ActivityPanel
              activityByDate={activeActivity}
              boosters={activeBoosters}
              credits={activeCredits}
              planBillingCycle={account?.planBillingCycle ?? "Free"}
              planLabel={activePlanLabel}
              planRenewsAt={account?.planRenewsAt ?? "No renewal"}
              promptCost={PROMPT_COST}
            />
          ) : null}

          {view === "gallery" ? <GalleryPanel /> : null}

          {view === "earn" ? (
            <EarnPanel
              onClaimBirthday={claimBirthday}
              onClaimQuest={claim}
              onCreateAccount={() => openAuth("signup", "Create an account to unlock quests, boosters, and credit rewards.")}
              onLogin={() => openAuth("login")}
              onOpenBooster={openCreditBooster}
            />
          ) : null}
        </div>

        {view === "chat" ? <div
          className="prompt-dock"
          onClick={(event) => {
            // Any button click in the composer zone hands focus back to the
            // textarea once its own handlers are done.
            if (event.target instanceof Element && event.target.closest("button")) {
              window.requestAnimationFrame(() => promptRef.current?.focus());
            }
          }}
        >
          {showJumpToBottom && !conversationEmpty ? (
            <button aria-label="Scroll to bottom" className="jump-to-bottom" onClick={jumpToBottom} type="button">
              <ChevronDown size={16} />
            </button>
          ) : null}
          {conversationEmpty ? (
            <div className="quick-prompts">
              {quickPrompts.slice(0, 4).map((quickPrompt) => (
                <motion.button
                  key={quickPrompt}
                  onClick={() => setPrompt(quickPrompt)}
                  type="button"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {quickPrompt.replace(/^@\w+\s/, "")}
                </motion.button>
              ))}
            </div>
          ) : null}
          <form className="prompt-form" onSubmit={submitPrompt}>
            {queuedPrompts.length > 0 ? (
              <div aria-label="Queued messages" className="queue-strip">
                {queuedPrompts.map((queued, index) => (
                  <span className="queue-pill" key={`${index}-${queued.slice(0, 12)}`}>
                    <ListPlus size={12} />
                    {queued.slice(0, 34)}
                    {queued.length > 34 ? "…" : ""}
                    <button
                      aria-label="Remove from queue"
                      onClick={() => setQueuedPrompts((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      type="button"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            {pendingAttachments.length > 0 ? (
              <div className="attachment-strip" aria-label="Pending attachments">
                {pendingAttachments.map((attachment) => (
                  <div className="attachment-pill" key={attachment.id}>
                    {attachment.type.startsWith("image/") ? <img alt="" src={attachment.dataUrl} /> : <FileText size={15} />}
                    <span>{attachment.name}</span>
                    <button aria-label={`Remove ${attachment.name}`} data-tooltip="Remove attachment" onClick={() => removePendingAttachment(attachment.id)} type="button">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <textarea
              aria-label="Prompt"
              aria-describedby="composer-help composer-suggestions"
              autoCapitalize="sentences"
              autoComplete="on"
              autoCorrect="on"
              onChange={(event) => {
                promptHistoryIndexRef.current = -1;
                setPrompt(event.currentTarget.value);
              }}
              onKeyDown={handleComposerKeyDown}
              onPaste={handleComposerPaste}
              placeholder="Write a message..."
              ref={promptRef}
              rows={1}
              spellCheck
              value={prompt}
            />
            <div className="prompt-form__footer">
              <input className="sr-only" multiple onChange={addFiles} ref={attachmentInputRef} type="file" />
              {speech.supported ? (
                <IconButton
                  className="composer-tool composer-tool--mic"
                  data-listening={speech.listening || undefined}
                  label={speech.listening ? "Stop dictation" : "Dictate — voice to text"}
                  onClick={speech.toggle}
                  type="button"
                >
                  {speech.listening ? <MicOff size={18} /> : <Mic size={18} />}
                </IconButton>
              ) : null}
              {canAttach ? (
                <IconButton className="composer-tool" label="Attach files" onClick={() => attachmentInputRef.current?.click()} type="button">
                  <Paperclip size={18} />
                </IconButton>
              ) : (
                <IconButton
                  className="composer-tool composer-tool--locked"
                  label="Attachments are a Pro feature"
                  tooltip="Unlock attachments with Pro"
                  onClick={() =>
                    showToast({
                      variant: "info",
                      title: "Attachments are a Pro feature",
                      description: "Upgrade your plan to attach files and images.",
                      actionLabel: "View plans",
                      onAction: () => setView("plans"),
                    })
                  }
                  type="button"
                >
                  <Lock size={16} />
                </IconButton>
              )}
              <PersonaMenu />
              <ModeMenu />
              {editCandidate || editTargetId ? (
                <IconButton
                  className="composer-tool"
                  data-active={!!editTargetId}
                  label={editTargetId ? "Editing in place — Esc to cancel" : `Edit from last ${editCandidateDepth} message${editCandidateDepth > 1 ? "s" : ""}`}
                  onClick={() => {
                    if (editTargetId) {
                      setEditTargetId(null);
                      return;
                    }

                    if (editCandidate) {
                      setEditTargetId(editCandidate.id);
                    }
                  }}
                  type="button"
                >
                  <Pencil size={17} />
                </IconButton>
              ) : null}
              {composerSuggestions.length > 0 ? (
                <div className="composer-suggestions" id="composer-suggestions" role="listbox" aria-label="Autocomplete suggestions">
                  {composerSuggestions.map((word, index) => (
                    <button
                      aria-selected={index === suggestionIndex}
                      data-active={index === suggestionIndex}
                      key={word}
                      onClick={() => completePromptWord(word)}
                      role="option"
                      type="button"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="composer-hint" data-editing={!!editTargetId || undefined} id="composer-help">
                  {editTargetId ? "Editing an earlier prompt — Enter regenerates from there · Esc cancels" : "Enter to send"}
                </span>
              )}
              <div className="prompt-form__send">
                {canQueue ? (
                  <IconButton
                    className="composer-tool"
                    disabled={!trimmedPrompt}
                    label={`Add to queue${queuedPrompts.length > 0 ? ` (${queuedPrompts.length} waiting)` : ""}`}
                    onClick={handleQueue}
                    type="button"
                  >
                    <ListPlus size={18} />
                  </IconButton>
                ) : null}
                {isProcessing ? (
                  <Button onClick={skipProcessing} size="sm" type="button" variant="secondary">
                    Skip
                  </Button>
                ) : null}
                <Button aria-label="Send" className="send-button" disabled={!canSend} loading={isProcessing} size="icon" type="submit">
                  <Send size={17} />
                </Button>
              </div>
            </div>
          </form>
          {activeCredits < PROMPT_COST ? (
            <motion.p className="credit-warning" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              Credit limit reached. {account ? "Unlock Pro, Max, or Max+ with credits to continue." : "Create an account to unlock more credits."}
            </motion.p>
          ) : null}
        </div> : null}
      </section>

      <Inspector
        activityByDate={activeActivity}
        boosters={activeBoosters}
        credits={activeCredits}
        creditsUsed={activeCreditsUsed}
        planLabel={activePlanLabel}
        promptCost={PROMPT_COST}
      />

      {/* Phone navigation: a thumb bar replaces the sidebar entirely. */}
      <ThumbBar
        account={account}
        accountButtonRef={accountButtonRef}
        mobileNavOpen={mobileNavOpen}
        newThread={newThread}
        openAccountMenu={openAccountMenu}
        openAuth={openAuth}
        setMobileNavOpen={setMobileNavOpen}
        setShowAccountMenu={setShowAccountMenu}
        setView={setView}
        showAccountMenu={showAccountMenu}
        view={view}
      />

      {showAuthModal ? (
        <AuthModal
          authMessage={authMessage}
          authMode={authMode}
          loginForm={loginForm}
          setAuthMode={setAuthMode}
          setLoginForm={setLoginForm}
          setShowAuthModal={setShowAuthModal}
          setSignup={setSignup}
          signup={signup}
          signupError={signupError}
          signupReady={signupReady}
          submitLogin={submitLogin}
          submitSignup={submitSignup}
        />
      ) : null}

      {avatarEditor ? (
        <AvatarModal
          scale={avatarScale}
          src={avatarEditor.src}
          onCancel={closeAvatarEditor}
          onScaleChange={setAvatarScale}
          onSave={saveAvatar}
        />
      ) : null}

      {confirmDeleteAccount ? (
        <ConfirmModal
          confirmLabel="Delete forever"
          description={`This cannot be undone. "${account?.username ?? "This account"}" will be deleted — or anonymized to "Deleted User" if it already interacted with the app. You will be signed out and its data wiped from this device.`}
          onCancel={() => setConfirmDeleteAccount(false)}
          onConfirm={() => void handleDeleteAccount()}
          title="Delete your account?"
        />
      ) : null}

      {keepPrompt ? (
        <ConfirmModal
          confirmLabel="Save & keep"
          description="Saving here makes this temporary chat permanent — it will no longer be deleted when you leave."
          onCancel={() => setKeepPrompt(null)}
          onConfirm={() => {
            if (activeThread) {
              setThreadTemporary(activeThread.id, false);
            }
            keepPrompt.run();
            setKeepPrompt(null);
            showToast({ variant: "success", title: "Conversation kept", description: "No longer temporary." });
          }}
          title="Keep this conversation?"
        />
      ) : null}

      {floatingTooltip ? <FloatingTooltip anchor={floatingTooltip} /> : null}
    </main>
  );
}
