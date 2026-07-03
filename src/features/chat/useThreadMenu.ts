import { useState } from "react";
import type { ChatThread } from "../../types";
import { useDismiss } from "../../lib/useDismiss";
import { showToast } from "../../components/Toast/toast.store";
import { useChatStore } from "./chat.store";

type ThreadMenuPosition = { left: number; top: number; up: boolean } | null;

/** Owns the per-thread action menu: open/position state, in-place rename, and
 *  delete-with-undo. `expandSidebar` runs when a rename starts (renaming in the
 *  collapsed icon rail would be unusable). */
export function useThreadMenu(expandSidebar: () => void) {
  const deleteThread = useChatStore((state) => state.deleteThread);
  const renameThread = useChatStore((state) => state.renameThread);
  const insertThread = useChatStore((state) => state.insertThread);
  const [threadMenuId, setThreadMenuId] = useState<string | null>(null);
  const [threadMenuPosition, setThreadMenuPosition] = useState<ThreadMenuPosition>(null);
  const [renameThreadId, setRenameThreadId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const threadMenuRef = useDismiss<HTMLDivElement>(threadMenuId !== null, () => setThreadMenuId(null));

  function startRename(thread: ChatThread) {
    expandSidebar();
    setRenameThreadId(thread.id);
    setRenameValue(thread.title);
    setThreadMenuId(null);
  }

  function commitRename() {
    if (renameThreadId) {
      renameThread(renameThreadId, renameValue);
    }

    setRenameThreadId(null);
    setRenameValue("");
  }

  function handleDeleteThread(thread: ChatThread) {
    setThreadMenuId(null);
    deleteThread(thread.id);
    showToast({
      title: "Conversation deleted",
      description: thread.title,
      variant: "info",
      actionLabel: "Undo",
      onAction: () => insertThread(thread),
    });
  }

  return {
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
  };
}
