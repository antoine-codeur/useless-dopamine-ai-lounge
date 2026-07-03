import { KeyboardEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy, FileText, GitBranch, MessageSquarePlus, Pencil, RefreshCw, Sprout, ThumbsDown, ThumbsUp, Timer, Wrench, X } from "lucide-react";
import { Markdown } from "../Markdown/Markdown";
import { showToast } from "../Toast/toast.store";
import { bumpQuest } from "../../features/quests/quest.store";
import { formatDuration } from "../../lib/duration";
import { exportSlug } from "../../lib/tableExport";
import { useDismiss } from "../../lib/useDismiss";
import type { Message } from "../../types";
import "./ChatBubble.css";

/** Long pasted prompts collapse past this size; a toggle reveals the rest. */
const COLLAPSE_THRESHOLD = 420;

type ChatBubbleProps = {
  message: Message;
  busy?: boolean;
  onReact?: (message: Message, reaction: "up" | "down") => void;
  onRetry?: (message: Message) => void;
  /** Branch in a NEW conversation (full duplicate). */
  onBranch?: (message: Message) => void;
  /** Branch IN this conversation (duplicate the current bud, fresh tail). */
  onBranchHere?: (message: Message) => void;
  onVariant?: (message: Message, index: number) => void;
  onEdit?: (message: Message, content: string) => void;
  onBookmark?: (message: Message) => void;
  onCancel?: (message: Message) => void;
};

/** ‹ i/n › navigation between buds/versions — each keeps its own continuation. */
function BudPager({
  label,
  variantIndex,
  variantCount,
  onSelect,
}: {
  label: string;
  variantIndex: number;
  variantCount: number;
  onSelect: (index: number) => void;
}) {
  return (
    <span className="chat-bubble__pager" data-tooltip={label}>
      <button aria-label="Previous version" disabled={variantIndex === 0} onClick={() => onSelect(variantIndex - 1)} type="button">
        <ChevronLeft size={14} />
      </button>
      {variantIndex + 1}/{variantCount}
      <button aria-label="Next version" disabled={variantIndex === variantCount - 1} onClick={() => onSelect(variantIndex + 1)} type="button">
        <ChevronRight size={14} />
      </button>
    </span>
  );
}

/** Live elapsed seconds while the agent is processing. */
function LiveTimer({ since }: { since: string }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((tick) => tick + 1), 100);
    return () => window.clearInterval(id);
  }, []);

  return <>{formatDuration(Math.max(0, Date.now() - new Date(since).getTime()))}</>;
}

async function copyMarkdown(content: string) {
  await navigator.clipboard?.writeText(content);
  bumpQuest("copies");
  showToast({ variant: "success", title: "Copied as markdown" });
}

export function ChatBubble({ message, busy, onReact, onRetry, onBranch, onBranchHere, onVariant, onEdit, onBookmark, onCancel }: ChatBubbleProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const branchMenuRef = useDismiss<HTMLSpanElement>(branchMenuOpen, () => setBranchMenuOpen(false));
  const collapsible = message.author === "user" && !editing && message.content.length > COLLAPSE_THRESHOLD;
  const collapsed = collapsible && !expanded;
  const variants = message.variants ?? [];
  const variantIndex = message.variantIndex ?? 0;
  /** The reaction of the bud currently displayed — each bud has its own. */
  const budReaction = message.reactions?.[variantIndex];
  const budBookmarked = !!message.bookmarks?.[variantIndex];
  const done = message.status === "done";

  function startEdit() {
    setDraft(message.content);
    setEditing(true);
  }

  function saveEdit() {
    const cleaned = draft.trim();

    if (cleaned && cleaned !== message.content) {
      onEdit?.(message, cleaned);
    }

    setEditing(false);
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      saveEdit();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setEditing(false);
    }
  }

  return (
    <motion.article
      className={clsx("chat-bubble", `chat-bubble--${message.author}`, {
        "chat-bubble--processing": message.status !== "done",
      })}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
    >
      {message.author !== "user" ? (
        <div className="chat-bubble__meta">
          <span>{message.author === "fake-ai" ? message.persona ?? "AI Agent" : "System"}</span>
          {message.author === "fake-ai" && !done ? (
            <span className="chat-bubble__timing" data-processing="true">
              <Timer size={11} />
              <LiveTimer since={message.startedAt ?? message.createdAt} />
            </span>
          ) : null}
          {message.author === "fake-ai" && done && message.completedAt ? (
            <span className="chat-bubble__timing" data-tooltip={new Date(message.completedAt).toLocaleString()}>
              {new Date(message.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {message.durationMs !== undefined ? ` · ${formatDuration(message.durationMs)}` : ""}
            </span>
          ) : null}
        </div>
      ) : null}

      {message.author === "fake-ai" && done && (message.steps?.length ?? 0) > 0 ? (
        <details className="chat-bubble__process">
          <summary>
            <Wrench size={12} />
            {message.persona ?? "Agent"} · {message.steps?.length} steps
            {message.durationMs !== undefined ? ` · ${formatDuration(message.durationMs)}` : ""}
          </summary>
          <ul>
            {message.steps?.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {editing ? (
        <div className="chat-bubble__edit">
          <textarea aria-label="Edit prompt" autoFocus onChange={(event) => setDraft(event.currentTarget.value)} onKeyDown={handleEditKeyDown} rows={3} value={draft} />
          <div className="chat-bubble__edit-actions">
            <button className="chat-bubble__action chat-bubble__action--labelled" onClick={() => setEditing(false)} type="button">
              <X size={14} /> Cancel
            </button>
            <button className="chat-bubble__action chat-bubble__action--labelled chat-bubble__action--primary" onClick={saveEdit} type="button">
              <Check size={14} /> Save & regenerate
            </button>
          </div>
        </div>
      ) : message.author === "fake-ai" && !done ? (
        // Live transparent process: each step appears as the agent "works".
        <div aria-live="polite" className="chat-bubble__steps">
          {(message.steps ?? [message.content]).map((step, index, list) => (
            <div className="chat-bubble__step" data-active={index === list.length - 1 || undefined} key={index}>
              <span className="chat-bubble__step-dot" />
              {step}
            </div>
          ))}
          {onCancel ? (
            <button className="chat-bubble__action chat-bubble__action--labelled chat-bubble__cancel" onClick={() => onCancel(message)} type="button">
              <X size={13} /> Cancel
            </button>
          ) : null}
        </div>
      ) : message.author === "user" ? (
        <div className="chat-bubble__card">
          <div className="chat-bubble__content" data-collapsed={collapsed || undefined}>
            <Markdown content={message.content} exportName={exportSlug(message.content)} />
          </div>
        </div>
      ) : (
        <div className="chat-bubble__content" data-collapsed={collapsed || undefined}>
          <Markdown content={message.content} exportName={exportSlug(message.content)} />
        </div>
      )}

      {collapsible ? (
        <button
          className="chat-bubble__expand"
          onClick={() =>
            setExpanded((value) => {
              if (!value) {
                bumpQuest("expands");
              }
              return !value;
            })
          }
          type="button"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? "Show less" : "Show full message"}
        </button>
      ) : null}

      {message.attachments?.length ? (
        <div className="chat-bubble__attachments">
          {message.attachments.map((attachment) => (
            <a download={attachment.name} href={attachment.dataUrl} key={attachment.id}>
              {attachment.type.startsWith("image/") ? <img alt="" src={attachment.dataUrl} /> : <FileText size={18} />}
              <span>{attachment.name}</span>
            </a>
          ))}
        </div>
      ) : null}

      {message.author === "fake-ai" && done ? (
        <div className="chat-bubble__actions">
          {variants.length > 1 ? (
            <BudPager
              label="Buds — each keeps its own continuation"
              onSelect={(index) => onVariant?.(message, index)}
              variantCount={variants.length}
              variantIndex={variantIndex}
            />
          ) : null}
          <button aria-label="Copy markdown" className="chat-bubble__action" data-tooltip="Copy markdown" onClick={() => void copyMarkdown(message.content)} type="button">
            <Copy size={14} />
          </button>
          <button
            aria-label="Good response"
            aria-pressed={budReaction === "up"}
            className="chat-bubble__action"
            data-active={budReaction === "up"}
            data-tooltip="Good response (this bud)"
            onClick={() => onReact?.(message, "up")}
            type="button"
          >
            <ThumbsUp size={14} />
          </button>
          <button
            aria-label="Bad response"
            aria-pressed={budReaction === "down"}
            className="chat-bubble__action"
            data-active={budReaction === "down"}
            data-tooltip="Bad response (this bud)"
            onClick={() => onReact?.(message, "down")}
            type="button"
          >
            <ThumbsDown size={14} />
          </button>
          <button
            aria-label={budBookmarked ? "Remove from read later" : "Save for later"}
            aria-pressed={budBookmarked}
            className="chat-bubble__action"
            data-active={budBookmarked}
            data-tooltip={budBookmarked ? "Remove from Library" : "Read later (this bud)"}
            onClick={() => onBookmark?.(message)}
            type="button"
          >
            <Bookmark size={14} />
          </button>
          <button aria-label="Retry" className="chat-bubble__action" data-tooltip="Retry — grow a new bud" disabled={busy} onClick={() => onRetry?.(message)} type="button">
            <RefreshCw size={14} />
          </button>
          <span className="chat-bubble__branch" ref={branchMenuRef}>
            <button
              aria-expanded={branchMenuOpen}
              aria-label="Branch"
              className="chat-bubble__action"
              data-active={branchMenuOpen}
              data-tooltip="Branch…"
              onClick={() => setBranchMenuOpen((value) => !value)}
              type="button"
            >
              <GitBranch size={14} />
            </button>
            {branchMenuOpen ? (
              <div className="chat-bubble__branch-menu" role="menu">
                <button
                  onClick={() => {
                    setBranchMenuOpen(false);
                    onBranchHere?.(message);
                  }}
                  role="menuitem"
                  type="button"
                >
                  <Sprout size={15} />
                  In this conversation
                </button>
                <button
                  onClick={() => {
                    setBranchMenuOpen(false);
                    onBranch?.(message);
                  }}
                  role="menuitem"
                  type="button"
                >
                  <MessageSquarePlus size={15} />
                  In a new conversation
                </button>
              </div>
            ) : null}
          </span>
        </div>
      ) : null}

      {message.author === "user" && !editing ? (
        <div className="chat-bubble__actions chat-bubble__actions--user">
          <span className="chat-bubble__stamp">
            {message.cost > 0 ? `-${message.cost} credits · ` : ""}
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {variants.length > 1 ? (
            <BudPager
              label="Prompt versions — each keeps its own branch"
              onSelect={(index) => onVariant?.(message, index)}
              variantCount={variants.length}
              variantIndex={variantIndex}
            />
          ) : null}
          <button aria-label="Copy prompt" className="chat-bubble__action" data-tooltip="Copy markdown" onClick={() => void copyMarkdown(message.content)} type="button">
            <Copy size={14} />
          </button>
          {onEdit ? (
            <button aria-label="Edit message" className="chat-bubble__action" data-tooltip="Edit — new version, new branch" disabled={busy} onClick={startEdit} type="button">
              <Pencil size={14} />
            </button>
          ) : null}
        </div>
      ) : null}
    </motion.article>
  );
}
