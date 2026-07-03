import type { ChatThread, Message } from "../../types";
import { showToast } from "../../components/Toast/toast.store";
import { useShellStore } from "../shell/shell.store";
import { bumpQuest } from "../quests/quest.store";
import { useChatStore } from "./chat.store";

/** Owns the per-message actions (react, bookmark, branch) and the temporary-chat
 *  guard that first asks to keep a temporary conversation before saving into it.
 *  `setKeepPrompt` surfaces that confirmation to ChatPage, which renders it. */
export function useMessageActions(
  activeThread: ChatThread | undefined,
  setKeepPrompt: (value: { run: () => void } | null) => void,
) {
  const setView = useShellStore((state) => state.setView);
  const addVariant = useChatStore((state) => state.addVariant);
  const setReaction = useChatStore((state) => state.setReaction);
  const toggleBookmark = useChatStore((state) => state.toggleBookmark);
  const branchFromMessage = useChatStore((state) => state.branchFromMessage);
  const setThreadTemporary = useChatStore((state) => state.setThreadTemporary);

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

  return { handleReact, handleBookmark, handleBranch, handleBranchHere, guardTemporarySave, toggleTemporary };
}
