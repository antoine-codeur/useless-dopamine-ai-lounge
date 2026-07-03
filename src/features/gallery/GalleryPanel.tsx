import { FileText, Paperclip } from "lucide-react";
import { useChatStore } from "../chat/chat.store";

/**
 * Grid of every file/image attached across all conversations. Attachments live
 * on their messages, so the panel derives its own list straight from the chat
 * store — no props needed.
 */
export function GalleryPanel() {
  const threads = useChatStore((state) => state.threads);
  const items = threads.flatMap((thread) =>
    thread.messages.flatMap((message) =>
      (message.attachments ?? []).map((attachment) => ({ ...attachment, threadTitle: thread.title })),
    ),
  );

  return (
    <section className="content-panel">
      <h3>Gallery</h3>
      <p className="muted">Files and images attached to messages are stored locally with their conversations and shown here.</p>
      <div className="gallery-grid">
        {items.length === 0 ? (
          <article className="empty-state">
            <Paperclip size={22} />
            <strong>No files yet</strong>
            <span>Attach images or files from the composer to populate the gallery.</span>
          </article>
        ) : (
          items.map((item) => (
            <a className="gallery-item" href={item.dataUrl} download={item.name} key={item.id}>
              {item.type.startsWith("image/") ? <img alt="" src={item.dataUrl} /> : <FileText size={28} />}
              <strong>{item.name}</strong>
              <span>{item.threadTitle}</span>
            </a>
          ))
        )}
      </div>
    </section>
  );
}
