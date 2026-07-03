import type { RefObject } from "react";
import { AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ChatBubble } from "../../components/ChatBubble/ChatBubble";
import type { Message } from "../../types";
import type { ShellView } from "../shell/shell.store";
import { prototype } from "../../app/prototype";

type MessageFeedProps = {
  view: ShellView;
  conversationEmpty: boolean;
  messages: Message[];
  feedRef: RefObject<HTMLDivElement | null>;
  handleFeedScroll: () => void;
  busy: boolean;
  onBookmark: (message: Message) => void;
  onBranch: (message: Message) => void;
  onBranchHere: (message: Message) => void;
  onCancel: (message: Message) => void;
  onEdit: (message: Message, content: string) => void;
  onReact: (message: Message, reaction: "up" | "down") => void;
  onRetry: (message: Message) => void;
  onVariant: (message: Message, index: number) => void;
};

/** The chat scroll body: the empty-state intro and the message feed. Presentational —
 *  scroll wiring and every message callback are owned by ChatPage and passed in. */
export function MessageFeed({
  view,
  conversationEmpty,
  messages,
  feedRef,
  handleFeedScroll,
  busy,
  onBookmark,
  onBranch,
  onBranchHere,
  onCancel,
  onEdit,
  onReact,
  onRetry,
  onVariant,
}: MessageFeedProps) {
  return (
    <>
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
              busy={busy}
              key={message.id}
              message={message}
              onBookmark={onBookmark}
              onBranch={onBranch}
              onBranchHere={onBranchHere}
              onCancel={onCancel}
              onEdit={onEdit}
              onReact={onReact}
              onRetry={onRetry}
              onVariant={onVariant}
            />
          ))}
        </AnimatePresence>
        </div>
      </div> : null}
    </>
  );
}
