import { nanoid } from "nanoid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Attachment, ChatThread, Message } from "../../types";
import { isoNow } from "../../lib/date";

type ChatStore = {
  activeThreadId: string;
  threads: ChatThread[];
  addUserMessage: (content: string, cost: number, attachments?: Attachment[]) => Message;
  addAiPlaceholder: () => Message;
  updateMessage: (id: string, patch: Partial<Message>) => void;
  /** Appends a new result ("bud") to a message and makes it active. */
  addVariant: (id: string, content: string) => void;
  setActiveVariant: (id: string, index: number) => void;
  /** Reactions are per bud: liking result 1 says nothing about result 2. */
  setReaction: (id: string, variantIndex: number, reaction: "up" | "down" | undefined) => void;
  /** Toggles the read-later bookmark of a specific bud. */
  toggleBookmark: (id: string, variantIndex: number) => void;
  /** Drops every message after the given one (edit-and-regenerate). */
  truncateAfterMessage: (id: string) => void;
  /** Forks the active thread up to a message — the active bud becomes the branch tip. */
  branchFromMessage: (id: string) => string | null;
  updateTitleFromPrompt: (content: string) => void;
  clearChat: () => void;
  createThread: () => string;
  setActiveThread: (id: string) => void;
  deleteThread: (id: string) => void;
  /** Re-inserts a previously deleted thread (undo). */
  insertThread: (thread: ChatThread) => void;
  /** Restores a thread's title and messages in place (undo clear). */
  restoreThread: (id: string, title: string, messages: Message[]) => void;
  renameThread: (id: string, title: string) => void;
  togglePinThread: (id: string) => void;
  toggleArchiveThread: (id: string) => void;
  setThreadTemporary: (id: string, temporary: boolean) => void;
};

/** New threads start empty: the centered intro is the welcome, not a fake message. */
function starterMessages(): Message[] {
  return [];
}

function createBlankThread(): ChatThread {
  const now = isoNow();
  return {
    id: nanoid(),
    title: "New conversation",
    messages: starterMessages(),
    createdAt: now,
    updatedAt: now,
    pinned: false,
    archived: false,
  };
}

export function threadHasConversationContent(thread: ChatThread) {
  return thread.messages.some((message) => message.author !== "system" || (message.attachments?.length ?? 0) > 0);
}

function contentThreads(threads: ChatThread[]) {
  return threads.filter(threadHasConversationContent);
}

function titleFromPrompt(content: string): string {
  const cleaned = content
    .replace(/@\w+/g, "")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(" ");

  if (!cleaned) {
    return "New conversation";
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function activeThread(state: ChatStore) {
  return state.threads.find((thread) => thread.id === state.activeThreadId) ?? state.threads[0];
}

/** Deep-copies messages (and stashed bud tails) with fresh ids; bookmarks stay
 *  on the original so the Library doesn't get duplicates. */
function cloneMessages(messages: Message[]): Message[] {
  return messages.map((message) => ({
    ...message,
    id: nanoid(),
    bookmarks: undefined,
    tails: message.tails
      ? Object.fromEntries(Object.entries(message.tails).map(([index, tail]) => [index, cloneMessages(tail)]))
      : undefined,
  }));
}

function updateActiveThread(state: ChatStore, updater: (thread: ChatThread) => ChatThread) {
  const current = activeThread(state);
  return {
    threads: state.threads.map((thread) => (thread.id === current.id ? updater(thread) : thread)),
    activeThreadId: current.id,
  };
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => {
      const initialThread = createBlankThread();

      return {
        activeThreadId: initialThread.id,
        threads: [initialThread],
        addUserMessage: (content, cost, attachments = []) => {
          const message: Message = {
            id: nanoid(),
            author: "user",
            content,
            createdAt: isoNow(),
            status: "done",
            cost,
            attachments,
          };

          set((state) =>
            updateActiveThread(state, (thread) => ({
              ...thread,
              title: thread.title === "New conversation" ? titleFromPrompt(content) : thread.title,
              messages: [...thread.messages, message],
              updatedAt: isoNow(),
            })),
          );

          return message;
        },
        addAiPlaceholder: () => {
          const message: Message = {
            id: nanoid(),
            author: "fake-ai",
            content: "Queued...",
            createdAt: isoNow(),
            status: "queued",
            cost: 0,
          };

          set((state) =>
            updateActiveThread(state, (thread) => ({
              ...thread,
              messages: [...thread.messages, message],
              updatedAt: isoNow(),
            })),
          );

          return message;
        },
        updateMessage: (id, patch) => {
          set((state) =>
            updateActiveThread(state, (thread) => ({
              ...thread,
              messages: thread.messages.map((message) => (message.id === id ? { ...message, ...patch } : message)),
              updatedAt: isoNow(),
            })),
          );
        },
        addVariant: (id, content) => {
          set((state) =>
            updateActiveThread(state, (thread) => {
              const index = thread.messages.findIndex((message) => message.id === id);

              if (index < 0) {
                return thread;
              }

              const message = thread.messages[index];
              const variants = [...(message.variants ?? [message.content]), content];
              const previousIndex = message.variantIndex ?? 0;
              const tails = { ...(message.tails ?? {}) };
              const liveTail = thread.messages.slice(index + 1);

              // The old bud keeps its continuation; the new bud starts fresh.
              if (liveTail.length > 0) {
                tails[previousIndex] = liveTail;
              }

              const updated: Message = {
                ...message,
                variants,
                variantIndex: variants.length - 1,
                content,
                status: "done",
                tails: Object.keys(tails).length > 0 ? tails : undefined,
              };

              return { ...thread, messages: [...thread.messages.slice(0, index), updated], updatedAt: isoNow() };
            }),
          );
        },
        setActiveVariant: (id, index) => {
          set((state) =>
            updateActiveThread(state, (thread) => {
              const messageIndex = thread.messages.findIndex((message) => message.id === id);

              if (messageIndex < 0) {
                return thread;
              }

              const message = thread.messages[messageIndex];
              const variants = message.variants ?? [];
              const previousIndex = message.variantIndex ?? 0;

              if (index < 0 || index >= variants.length || index === previousIndex) {
                return thread;
              }

              // Swap continuations: park the live tail under the old bud and
              // bring back the selected bud's own branch.
              const tails = { ...(message.tails ?? {}) };
              const liveTail = thread.messages.slice(messageIndex + 1);

              if (liveTail.length > 0) {
                tails[previousIndex] = liveTail;
              } else {
                delete tails[previousIndex];
              }

              const nextTail = tails[index] ?? [];
              delete tails[index];

              const updated: Message = {
                ...message,
                variantIndex: index,
                content: variants[index],
                tails: Object.keys(tails).length > 0 ? tails : undefined,
              };

              return {
                ...thread,
                messages: [...thread.messages.slice(0, messageIndex), updated, ...nextTail],
                updatedAt: isoNow(),
              };
            }),
          );
        },
        setReaction: (id, variantIndex, reaction) => {
          set((state) =>
            updateActiveThread(state, (thread) => ({
              ...thread,
              messages: thread.messages.map((message) => {
                if (message.id !== id) {
                  return message;
                }

                const reactions = { ...(message.reactions ?? {}) };

                if (reaction) {
                  reactions[variantIndex] = reaction;
                } else {
                  delete reactions[variantIndex];
                }

                return { ...message, reactions };
              }),
            })),
          );
        },
        toggleBookmark: (id, variantIndex) => {
          // Global scan: the Library manages bookmarks across every thread.
          set((state) => ({
            threads: state.threads.map((thread) => ({
              ...thread,
              messages: thread.messages.map((message) => {
                if (message.id !== id) {
                  return message;
                }

                const bookmarks = { ...(message.bookmarks ?? {}) };

                if (bookmarks[variantIndex]) {
                  delete bookmarks[variantIndex];
                } else {
                  bookmarks[variantIndex] = isoNow();
                }

                return { ...message, bookmarks };
              }),
            })),
          }));
        },
        truncateAfterMessage: (id) => {
          set((state) =>
            updateActiveThread(state, (thread) => {
              const index = thread.messages.findIndex((message) => message.id === id);
              return index < 0 ? thread : { ...thread, messages: thread.messages.slice(0, index + 1), updatedAt: isoNow() };
            }),
          );
        },
        branchFromMessage: (id) => {
          let branchedId: string | null = null;

          set((state) => {
            const current = activeThread(state);

            if (!current || !current.messages.some((message) => message.id === id)) {
              return {};
            }

            const now = isoNow();
            // "Branch in new chat": the WHOLE conversation is duplicated —
            // buds, stashed tails, reactions — with the selected bud active.
            const branched: ChatThread = {
              id: nanoid(),
              title: current.title === "New conversation" ? current.title : `${current.title} · branch`,
              createdAt: now,
              updatedAt: now,
              pinned: false,
              archived: false,
              messages: cloneMessages(current.messages),
            };

            branchedId = branched.id;
            return { threads: [branched, ...state.threads], activeThreadId: branched.id };
          });

          return branchedId;
        },
        updateTitleFromPrompt: (content) => {
          set((state) =>
            updateActiveThread(state, (thread) => {
              if (thread.title !== "New conversation") {
                return thread;
              }

              return { ...thread, title: titleFromPrompt(content), updatedAt: isoNow() };
            }),
          );
        },
        clearChat: () => {
          set((state) =>
            updateActiveThread(state, (thread) => ({
              ...thread,
              title: "New conversation",
              messages: starterMessages(),
              updatedAt: isoNow(),
            })),
          );
        },
        createThread: () => {
          const thread = createBlankThread();
          let nextThreadId = thread.id;

          set((state) => {
            const current = activeThread(state);

            if (current && !threadHasConversationContent(current)) {
              nextThreadId = current.id;
              return {
                activeThreadId: current.id,
                threads: [current, ...contentThreads(state.threads.filter((candidate) => candidate.id !== current.id))],
              };
            }

            return { threads: [thread, ...contentThreads(state.threads)], activeThreadId: thread.id };
          });

          return nextThreadId;
        },
        setActiveThread: (id) => {
          set((state) => {
            if (!state.threads.some((thread) => thread.id === id)) {
              return { activeThreadId: state.activeThreadId };
            }

            const current = activeThread(state);
            const cleanedThreads = current && current.id !== id && !threadHasConversationContent(current)
              ? state.threads.filter((thread) => thread.id !== current.id)
              : state.threads;

            return {
              activeThreadId: id,
              threads: cleanedThreads.length > 0 ? cleanedThreads : [createBlankThread()],
            };
          });
        },
        deleteThread: (id) => {
          set((state) => {
            const nextThreads = state.threads.filter((thread) => thread.id !== id);
            const threads = nextThreads.length > 0 ? nextThreads : [createBlankThread()];
            return {
              threads,
              activeThreadId: state.activeThreadId === id ? threads[0].id : state.activeThreadId,
            };
          });
        },
        insertThread: (thread) => {
          set((state) => ({
            threads: [thread, ...state.threads.filter((candidate) => candidate.id !== thread.id)],
            activeThreadId: thread.id,
          }));
        },
        restoreThread: (id, title, messages) => {
          set((state) => ({
            threads: state.threads.map((thread) =>
              thread.id === id ? { ...thread, title, messages, updatedAt: isoNow() } : thread,
            ),
          }));
        },
        renameThread: (id, title) => {
          const cleaned = title.trim().slice(0, 80);

          if (!cleaned) {
            return;
          }

          set((state) => ({
            threads: state.threads.map((thread) =>
              thread.id === id ? { ...thread, title: cleaned, updatedAt: isoNow() } : thread,
            ),
          }));
        },
        togglePinThread: (id) => {
          set((state) => ({
            threads: state.threads.map((thread) =>
              thread.id === id ? { ...thread, pinned: !thread.pinned, updatedAt: isoNow() } : thread,
            ),
          }));
        },
        toggleArchiveThread: (id) => {
          set((state) => ({
            threads: state.threads.map((thread) =>
              thread.id === id ? { ...thread, archived: !thread.archived, updatedAt: isoNow() } : thread,
            ),
          }));
        },
        setThreadTemporary: (id, temporary) => {
          set((state) => ({
            threads: state.threads.map((thread) => (thread.id === id ? { ...thread, temporary } : thread)),
          }));
        },
      };
    },
    {
      name: "uda:chat",
      // v3 drops the legacy "system welcome" messages from persisted threads.
      version: 3,
      migrate: (persisted) => {
        const value = persisted as Partial<ChatStore> & { title?: string; messages?: Message[] };
        const stripSystem = (messages: Message[] = []) => messages.filter((message) => message.author !== "system");

        if (Array.isArray(value.threads) && value.threads.length > 0 && value.activeThreadId) {
          const cleaned = value.threads.map((thread) => ({ ...thread, messages: stripSystem(thread.messages) }));
          const threads = cleaned.some(threadHasConversationContent) ? contentThreads(cleaned) : [createBlankThread()];
          return {
            ...value,
            activeThreadId: threads.some((thread) => thread.id === value.activeThreadId) ? value.activeThreadId : threads[0].id,
            threads,
          } as ChatStore;
        }

        const thread = createBlankThread();
        thread.title = value.title ?? "New conversation";
        thread.messages = stripSystem(value.messages);
        return {
          activeThreadId: thread.id,
          threads: [thread],
        } as Partial<ChatStore>;
      },
    },
  ),
);
