import type { ChangeEvent, ClipboardEvent, RefObject } from "react";
import { motion } from "framer-motion";
import { ChevronDown, FileText, ListPlus, Lock, Mic, MicOff, Paperclip, Pencil, Send, X } from "lucide-react";
import { Button, IconButton } from "../../components/Button/Button";
import type { Account, Attachment } from "../../types";
import type { ShellView } from "../shell/shell.store";
import { showToast } from "../../components/Toast/toast.store";
import { PersonaMenu } from "../personas/PersonaMenu";
import { ModeMenu } from "../themes/ModeMenu";
import { PROMPT_COST, quickPrompts } from "./chat.logic";
import type { useComposer } from "./useComposer";
import type { useSpeechToText } from "./useSpeechToText";

type ComposerProps = {
  composer: ReturnType<typeof useComposer>;
  speech: ReturnType<typeof useSpeechToText>;
  canAttach: boolean;
  canQueue: boolean;
  conversationEmpty: boolean;
  setView: (view: ShellView) => void;
  promptRef: RefObject<HTMLTextAreaElement | null>;
  attachmentInputRef: RefObject<HTMLInputElement | null>;
  account: Account | null;
  activeCredits: number;
  pendingAttachments: Attachment[];
  addFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  handleComposerPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  removePendingAttachment: (id: string) => void;
  showJumpToBottom: boolean;
  jumpToBottom: () => void;
};

/** The prompt dock: quick prompts, queue strip, attachment strip, the textarea,
 *  and the footer tools (mic, attach, persona, mode, edit, suggestions, queue,
 *  skip, send). Presentational — all state/handlers come from ChatPage's hooks. */
export function Composer({
  composer,
  speech,
  canAttach,
  canQueue,
  conversationEmpty,
  setView,
  promptRef,
  attachmentInputRef,
  account,
  activeCredits,
  pendingAttachments,
  addFiles,
  handleComposerPaste,
  removePendingAttachment,
  showJumpToBottom,
  jumpToBottom,
}: ComposerProps) {
  return (
    <div
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
              onClick={() => composer.setPrompt(quickPrompt)}
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              {quickPrompt.replace(/^@\w+\s/, "")}
            </motion.button>
          ))}
        </div>
      ) : null}
      <form className="prompt-form" onSubmit={composer.submitPrompt}>
        {composer.queuedPrompts.length > 0 ? (
          <div aria-label="Queued messages" className="queue-strip">
            {composer.queuedPrompts.map((queued, index) => (
              <span className="queue-pill" key={`${index}-${queued.slice(0, 12)}`}>
                <ListPlus size={12} />
                {queued.slice(0, 34)}
                {queued.length > 34 ? "…" : ""}
                <button
                  aria-label="Remove from queue"
                  onClick={() => composer.setQueuedPrompts((current) => current.filter((_, itemIndex) => itemIndex !== index))}
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
            composer.promptHistoryIndexRef.current = -1;
            composer.setPrompt(event.currentTarget.value);
          }}
          onKeyDown={composer.handleComposerKeyDown}
          onPaste={handleComposerPaste}
          placeholder="Write a message..."
          ref={promptRef}
          rows={1}
          spellCheck
          value={composer.prompt}
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
          {composer.editCandidate || composer.editTargetId ? (
            <IconButton
              className="composer-tool"
              data-active={!!composer.editTargetId}
              label={composer.editTargetId ? "Editing in place — Esc to cancel" : `Edit from last ${composer.editCandidateDepth} message${composer.editCandidateDepth > 1 ? "s" : ""}`}
              onClick={() => {
                if (composer.editTargetId) {
                  composer.setEditTargetId(null);
                  return;
                }

                if (composer.editCandidate) {
                  composer.setEditTargetId(composer.editCandidate.id);
                }
              }}
              type="button"
            >
              <Pencil size={17} />
            </IconButton>
          ) : null}
          {composer.composerSuggestions.length > 0 ? (
            <div className="composer-suggestions" id="composer-suggestions" role="listbox" aria-label="Autocomplete suggestions">
              {composer.composerSuggestions.map((word, index) => (
                <button
                  aria-selected={index === composer.suggestionIndex}
                  data-active={index === composer.suggestionIndex}
                  key={word}
                  onClick={() => composer.completePromptWord(word)}
                  role="option"
                  type="button"
                >
                  {word}
                </button>
              ))}
            </div>
          ) : (
            <span className="composer-hint" data-editing={!!composer.editTargetId || undefined} id="composer-help">
              {composer.editTargetId ? "Editing an earlier prompt — Enter regenerates from there · Esc cancels" : "Enter to send"}
            </span>
          )}
          <div className="prompt-form__send">
            {canQueue ? (
              <IconButton
                className="composer-tool"
                disabled={!composer.trimmedPrompt}
                label={`Add to queue${composer.queuedPrompts.length > 0 ? ` (${composer.queuedPrompts.length} waiting)` : ""}`}
                onClick={composer.handleQueue}
                type="button"
              >
                <ListPlus size={18} />
              </IconButton>
            ) : null}
            {composer.isProcessing ? (
              <Button onClick={composer.skipProcessing} size="sm" type="button" variant="secondary">
                Skip
              </Button>
            ) : null}
            <Button aria-label="Send" className="send-button" disabled={!composer.canSend} loading={composer.isProcessing} size="icon" type="submit">
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
    </div>
  );
}
