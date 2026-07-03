import { useState, type ChangeEvent, type ClipboardEvent, type RefObject } from "react";
import type { Attachment } from "../../types";
import { showToast } from "../../components/Toast/toast.store";
import { useShellStore } from "../shell/shell.store";

function fileToAttachment(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: String(reader.result),
        createdAt: new Date().toISOString(),
      });
    };
    reader.onerror = () => reject(new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}

/** Owns the pending-attachment list and the shared attach pipeline (file dialog,
 *  clipboard paste, drag & drop). `canAttach` gates it to paid plans; promptRef
 *  is refocused after the async file work steals focus. */
export function useAttachments(canAttach: boolean, promptRef: RefObject<HTMLTextAreaElement | null>) {
  const setView = useShellStore((state) => state.setView);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);

  async function attachFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }

    if (!canAttach) {
      showToast({ variant: "info", title: "Attachments are a paid-plan feature", actionLabel: "View plans", onAction: () => setView("plans") });
      return;
    }

    const readableFiles = files.filter((file) => file.size <= 2_500_000);

    if (readableFiles.length !== files.length) {
      showToast({ variant: "warning", title: "Some files were skipped", description: "Files over 2.5 MB are not attached." });
    }

    const room = Math.max(0, 8 - pendingAttachments.length);

    if (readableFiles.length > room) {
      showToast({ variant: "warning", title: "Attachment limit reached", description: "A message carries up to 8 files." });
    }

    const attachments = await Promise.all(readableFiles.slice(0, room).map(fileToAttachment));
    setPendingAttachments((current) => [...current, ...attachments].slice(0, 8));
    // The file dialog stole focus — hand it back after the async work.
    promptRef.current?.focus();
  }

  async function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    await attachFiles(files);
  }

  /** Pasting files attaches them; a wall of text becomes a .txt attachment. */
  function handleComposerPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData?.files ?? []);

    if (files.length > 0) {
      event.preventDefault();
      void attachFiles(files);
      return;
    }

    const text = event.clipboardData?.getData("text/plain") ?? "";

    // Too long for the field: attach instead — but never eat a guest's paste.
    if (text.length > 1_500 && canAttach) {
      event.preventDefault();
      const slug = text.trim().slice(0, 28).replace(/\s+/g, " ");
      void attachFiles([new File([text], `${slug || "pasted"}….txt`, { type: "text/plain" })]);
      showToast({
        variant: "info",
        title: "Pasted as attachment",
        description: `${text.length.toLocaleString()} characters — attached to the prompt instead of flooding the field.`,
      });
    }
  }

  function removePendingAttachment(id: string) {
    setPendingAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  return { pendingAttachments, setPendingAttachments, addFiles, handleComposerPaste, removePendingAttachment, attachFiles };
}
