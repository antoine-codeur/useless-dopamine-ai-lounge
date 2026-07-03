import { BookmarkCheck, BookmarkX, ThumbsUp } from "lucide-react";
import { useChatStore } from "../chat/chat.store";
import "./LibraryPanel.css";

export type LibraryItem = {
  threadId: string;
  threadTitle: string;
  messageId: string;
  variantIndex: number;
  content: string;
  savedAt: string;
};

type LibraryPanelProps = {
  onOpen: (item: LibraryItem) => void;
  onRemoveBookmark: (item: LibraryItem) => void;
};

function titleOf(content: string) {
  const heading = content.match(/^#{1,6}\s+(.+)$/m)?.[1];
  const firstLine = content.split("\n").find((line) => line.trim().length > 0) ?? "Untitled";
  return (heading ?? firstLine).replace(/[#*_`[\]()]/g, "").slice(0, 80);
}

function snippetOf(content: string) {
  return content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`>-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
}

/**
 * The Library gathers buds worth keeping: the read-later playlist
 * (bookmarked results) and everything you liked. Click re-opens the thread
 * with that exact bud selected.
 */
export function LibraryPanel({ onOpen, onRemoveBookmark }: LibraryPanelProps) {
  const threads = useChatStore((state) => state.threads);

  const saved: LibraryItem[] = [];
  const liked: LibraryItem[] = [];

  threads.forEach((thread) => {
    thread.messages.forEach((message) => {
      const variants = message.variants ?? [message.content];

      Object.entries(message.bookmarks ?? {}).forEach(([index, savedAt]) => {
        const variantIndex = Number(index);
        saved.push({
          threadId: thread.id,
          threadTitle: thread.title,
          messageId: message.id,
          variantIndex,
          content: variants[variantIndex] ?? message.content,
          savedAt,
        });
      });

      Object.entries(message.reactions ?? {}).forEach(([index, reaction]) => {
        if (reaction !== "up") {
          return;
        }

        const variantIndex = Number(index);
        liked.push({
          threadId: thread.id,
          threadTitle: thread.title,
          messageId: message.id,
          variantIndex,
          content: variants[variantIndex] ?? message.content,
          savedAt: message.createdAt,
        });
      });
    });
  });

  saved.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  liked.sort((a, b) => b.savedAt.localeCompare(a.savedAt));

  const sections = [
    {
      key: "later",
      icon: BookmarkCheck,
      title: "Read later",
      hint: "Bookmark any result from the chat to queue it here.",
      items: saved,
      removable: true,
    },
    {
      key: "liked",
      icon: ThumbsUp,
      title: "Liked",
      hint: "Every bud you thumbed up, across all branches.",
      items: liked,
      removable: false,
    },
  ];

  return (
    <section className="content-panel library-panel">
      <h3>Library</h3>
      <p className="muted">Your favorite buds and the ones saved for later — click to reopen them exactly where they grew.</p>

      {sections.map((section) => (
        <section className="library-section" key={section.key}>
          <header className="library-section__header">
            <section.icon size={16} />
            <h4>{section.title}</h4>
            <span>{section.items.length}</span>
          </header>

          {section.items.length === 0 ? (
            <article className="empty-state">
              <section.icon size={20} />
              <strong>Nothing here yet</strong>
              <span>{section.hint}</span>
            </article>
          ) : (
            <div className="library-grid">
              {section.items.map((item) => (
                <article className="library-card" key={`${item.messageId}-${item.variantIndex}`}>
                  <button className="library-card__open" onClick={() => onOpen(item)} type="button">
                    <strong>{titleOf(item.content)}</strong>
                    <p>{snippetOf(item.content)}</p>
                    <small>
                      {item.threadTitle} · {item.savedAt.slice(0, 10)}
                      {item.variantIndex > 0 ? ` · bud ${item.variantIndex + 1}` : ""}
                    </small>
                  </button>
                  {section.removable ? (
                    <button
                      aria-label="Remove from read later"
                      className="library-card__remove"
                      data-tooltip="Remove from read later"
                      onClick={() => onRemoveBookmark(item)}
                      type="button"
                    >
                      <BookmarkX size={15} />
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
    </section>
  );
}
