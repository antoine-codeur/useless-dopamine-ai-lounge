import { CSSProperties, useEffect, useRef, useState } from "react";
import { ImagePlus, Sparkles } from "lucide-react";
import { threadHasConversationContent, useChatStore } from "./chat.store";
import { PROMPT_COST } from "./chat.logic";
import type { Account, GuestSession } from "../../types";
import { SeasonPanel } from "../season/SeasonPanel";
import { RankingPanel } from "../ranking/RankingPanel";
import { useSpeechToText } from "./useSpeechToText";
import { useAccountStore } from "../profile/account.store";
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
import { StatsPanel } from "../stats/StatsPanel";
import { Inspector } from "./Inspector";
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
import { useTooltip } from "./useTooltip";
import { useMessageActions } from "./useMessageActions";
import { useRewards } from "./useRewards";
import { useAccountMenuControls } from "./useAccountMenuControls";
import { useProfileForm } from "./useProfileForm";
import { useAccountLifecycle } from "./useAccountLifecycle";
import { useBootSession } from "./useBootSession";
import { useKeyboardOpen } from "./useKeyboardOpen";
import { useTelemetryTracking } from "./useTelemetryTracking";
import { useSidebarLayout } from "./useSidebarLayout";
import { ChatTopbar } from "./ChatTopbar";
import { MessageFeed } from "./MessageFeed";
import { Composer } from "./Composer";
import { AvatarModal } from "../onboarding/AvatarModal";
import { FloatingTooltip } from "../../components/FloatingTooltip/FloatingTooltip";
import { showToast } from "../../components/Toast/toast.store";
import { useRewardStore } from "../rewards/reward.store";
import { ShopPanel } from "../shop/ShopPanel";
import "./ChatPage.css";

// Profile and Settings are absent on purpose: the account menu owns them.
// railHidden pages are informative/optional — expanded sidebar only.
// Plans left the nav on purpose: it lives in Profile › Billing and behind
// the Upgrade actions.
export function ChatPage() {
  /** Pending save action awaiting the "keep temporary chat?" confirmation. */
  const [keepPrompt, setKeepPrompt] = useState<{ run: () => void } | null>(null);
  const keyboardOpen = useKeyboardOpen();
  const view = useShellStore((state) => state.view);
  const setView = useShellStore((state) => state.setView);
  const actionMessage = useShellStore((state) => state.actionMessage);
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
  const { avatarEditor, avatarScale, setAvatarScale, openAvatarImageFile, openAvatarFile, closeAvatarEditor, saveAvatar } = useAvatarEditor();
  const [showArchivedThreads, setShowArchivedThreads] = useState(false);
  const [billingCycle, setBillingCycle] = useState<Account["planBillingCycle"]>("monthly");
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  // Drag & drop from the OS (Explorer…) straight onto the chat stage.
  const [dropActive, setDropActive] = useState(false);
  const dragDepthRef = useRef(0);
  const speech = useSpeechToText((text) => {
    composer.setPrompt((current) => (current ? `${current.trimEnd()} ${text}` : text));
    promptRef.current?.focus();
  });
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    inspectorCollapsed,
    setInspectorCollapsed,
    sidebarWidth,
    setIsResizingSidebar,
    mobileNavOpen,
    setMobileNavOpen,
  } = useSidebarLayout();
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
  const [limitReached, setLimitReached] = useState(false);
  const { floatingTooltip, handleTooltipPointerOver, handleTooltipPointerOut, handleTooltipFocus, handleTooltipBlur } = useTooltip();
  const threads = useChatStore((state) => state.threads);
  const activeThreadId = useChatStore((state) => state.activeThreadId);
  const setActiveVariant = useChatStore((state) => state.setActiveVariant);
  const toggleBookmark = useChatStore((state) => state.toggleBookmark);
  const clearChat = useChatStore((state) => state.clearChat);
  const createThread = useChatStore((state) => state.createThread);
  const setActiveThread = useChatStore((state) => state.setActiveThread);
  const deleteThread = useChatStore((state) => state.deleteThread);
  const restoreThread = useChatStore((state) => state.restoreThread);
  const setThreadTemporary = useChatStore((state) => state.setThreadTemporary);
  const account = useAccountStore((state) => state.account);
  const plans = useAccountStore((state) => state.plans);
  const { isBooting, backendStatus } = useBootSession(setGuest);
  useTelemetryTracking(view, account?.plan);
  const {
    showAccountMenu,
    setShowAccountMenu,
    accountMenuPosition,
    accountButtonRef,
    accountMenuRef,
    copyAccountId,
    openAccountView,
    openAccountMenu,
    handleAccountHoverEnter,
    handleAccountHoverLeave,
  } = useAccountMenuControls(account, guest);
  const {
    profileName,
    setProfileName,
    profileHandle,
    setProfileHandle,
    profileBirthDate,
    setProfileBirthDate,
    passwordForm,
    setPasswordForm,
    passwordReady,
    profileNameInvalid,
    profileHandleInvalid,
    profileBirthDateInvalid,
    saveOnboardingProfile,
    skipOnboardingStep,
    finishBirthdayStep,
    saveProfile,
    changePassword,
  } = useProfileForm(account);
  const {
    profileDragActive,
    handleDeleteAccount,
    handleSignOut,
    handleProfileDragOver,
    handleProfileDragLeave,
    handleProfileDrop,
  } = useAccountLifecycle({ account, setGuest, setShowAccountMenu, setConfirmDeleteAccount, openAvatarImageFile });
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
  const composer = useComposer({
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
  const { handleReact, handleBookmark, handleBranch, handleBranchHere, toggleTemporary } = useMessageActions(activeThread, setKeepPrompt);
  const { choosePlan, claim, openCreditBooster, claimBirthday } = useRewards({ account, billingCycle, setLimitReached, openAuth });
  const visibleThreads = [...threads]
    .filter(threadHasConversationContent)
    .filter((thread) => showArchivedThreads || !thread.archived || thread.id === activeThreadId)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));

  useEffect(() => {
    if (!promptRef.current) {
      return;
    }

    promptRef.current.style.height = "0px";
    promptRef.current.style.height = `${Math.min(promptRef.current.scrollHeight, 160)}px`;
  }, [composer.prompt]);

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
    // Leftover temporary chats from a previous session don't survive boot.
    const { threads: allThreads, activeThreadId: bootActiveId } = useChatStore.getState();
    allThreads
      .filter((thread) => thread.temporary && thread.id !== bootActiveId)
      .forEach((thread) => deleteThread(thread.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot-time purge
  }, []);

  useEffect(() => {
    // Temporary chats die when you leave them (thread switch or page change).
    const previous = composer.temporaryContextRef.current;
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

    composer.temporaryContextRef.current = { threadId: activeThreadId, inChat };
  }, [activeThreadId, view, deleteThread]);

  // Navigating anywhere closes the phone drawer — selection done, get out of the way.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [view, activeThreadId]);

  const activeCredits = account?.creditsRemaining ?? guest?.creditsRemaining ?? 0;

  useEffect(() => {
    // Queue drain: as soon as the agent is free, the next prompt fires.
    if (composer.isProcessing || composer.queuedPrompts.length === 0 || view !== "chat") {
      return;
    }

    if (activeCredits < PROMPT_COST) {
      composer.setQueuedPrompts([]);
      showToast({ variant: "warning", title: "Queue cleared", description: "Not enough credits to keep sending." });
      return;
    }

    const [next, ...rest] = composer.queuedPrompts;
    composer.setQueuedPrompts(rest);
    composer.sendPromptText(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- drain on state change
  }, [composer.isProcessing, composer.queuedPrompts, view, activeCredits]);
  const activeCreditsUsed = account?.creditsUsed ?? guest?.creditsUsed ?? 0;
  const activeActivity = account?.activityByDate ?? guest?.activityByDate ?? {};
  const activeBoosters = account?.boosters ?? 0;
  const activityStats = computeActivityStats(activeActivity);
  const currentPlan = plans.find((plan) => plan.id === account?.plan);
  const activePlanLabel = account ? currentPlan?.label ?? "Free" : "Guest";
  const isGuestLanding = !account && title === "New conversation" && conversationEmpty;
  // CSS vars (not an inline grid template) so responsive media queries win.
  const sidebarWidthStyle = {
    "--sidebar-width": `${sidebarCollapsed ? 56 : sidebarWidth}px`,
    "--inspector-width": inspectorCollapsed ? "0px" : "19rem",
  } as CSSProperties;

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
        <ChatTopbar
          account={account}
          activeThread={activeThread}
          backendStatus={backendStatus}
          canToggleTemporary={canToggleTemporary}
          conversationEmpty={conversationEmpty}
          handleClearChat={handleClearChat}
          inspectorCollapsed={inspectorCollapsed}
          setInspectorCollapsed={setInspectorCollapsed}
          setView={setView}
          startRename={startRename}
          title={title}
          toggleTemporary={toggleTemporary}
          view={view}
        />

        <div className="chat-scroll-area">
          <MessageFeed
            busy={composer.isProcessing}
            conversationEmpty={conversationEmpty}
            feedRef={feedRef}
            handleFeedScroll={handleFeedScroll}
            messages={messages}
            onBookmark={handleBookmark}
            onBranch={handleBranch}
            onBranchHere={handleBranchHere}
            onCancel={composer.cancelGeneration}
            onEdit={composer.handleEditPrompt}
            onReact={handleReact}
            onRetry={(target) => void composer.retryMessage(target)}
            onVariant={(target, index) => setActiveVariant(target.id, index)}
            view={view}
          />

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

        {view === "chat" ? (
          <Composer
            account={account}
            activeCredits={activeCredits}
            addFiles={addFiles}
            attachmentInputRef={attachmentInputRef}
            canAttach={canAttach}
            canQueue={canQueue}
            composer={composer}
            conversationEmpty={conversationEmpty}
            handleComposerPaste={handleComposerPaste}
            jumpToBottom={jumpToBottom}
            pendingAttachments={pendingAttachments}
            promptRef={promptRef}
            removePendingAttachment={removePendingAttachment}
            setView={setView}
            showJumpToBottom={showJumpToBottom}
            speech={speech}
          />
        ) : null}
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
