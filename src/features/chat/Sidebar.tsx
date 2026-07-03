import type { Dispatch, MouseEvent as ReactMouseEvent, ReactNode, RefObject, SetStateAction } from "react";
import { Archive, Ghost, GripVertical, LayoutPanelLeft, MessageSquarePlus, MoreHorizontal, Pencil, Pin, PinOff, Sparkles, Trash2 } from "lucide-react";
import type { ChatThread } from "../../types";
import type { ShellView } from "../shell/shell.store";
import { Button, IconButton } from "../../components/Button/Button";
import { prototype } from "../../app/prototype";
import { bumpQuest } from "../quests/quest.store";
import { useChatStore } from "./chat.store";
import { navItems } from "./navItems";

type ThreadMenuPosition = { left: number; top: number; up: boolean } | null;

type SidebarProps = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  view: ShellView;
  setView: (view: ShellView) => void;
  setMobileNavOpen: (open: boolean) => void;
  newThread: () => void;
  showArchivedThreads: boolean;
  setShowArchivedThreads: Dispatch<SetStateAction<boolean>>;
  visibleThreads: ChatThread[];
  activeThreadId: string | null;
  threadMenuId: string | null;
  setThreadMenuId: (id: string | null) => void;
  threadMenuRef: RefObject<HTMLDivElement | null>;
  threadMenuPosition: ThreadMenuPosition;
  setThreadMenuPosition: (position: ThreadMenuPosition) => void;
  renameThreadId: string | null;
  setRenameThreadId: (id: string | null) => void;
  renameValue: string;
  setRenameValue: (value: string) => void;
  commitRename: () => void;
  startRename: (thread: ChatThread) => void;
  handleDeleteThread: (thread: ChatThread) => void;
  setIsResizingSidebar: (value: boolean) => void;
  accountMenu: ReactNode;
};

/** Desktop sidebar: brand, primary nav, new-session, the thread list with its
 *  per-thread action menu, and the account menu slot. Presentational — state
 *  and handlers are owned by ChatPage; only pure store actions are read here. */
export function Sidebar({
  sidebarCollapsed,
  setSidebarCollapsed,
  view,
  setView,
  setMobileNavOpen,
  newThread,
  showArchivedThreads,
  setShowArchivedThreads,
  visibleThreads,
  activeThreadId,
  threadMenuId,
  setThreadMenuId,
  threadMenuRef,
  threadMenuPosition,
  setThreadMenuPosition,
  renameThreadId,
  setRenameThreadId,
  renameValue,
  setRenameValue,
  commitRename,
  startRename,
  handleDeleteThread,
  setIsResizingSidebar,
  accountMenu,
}: SidebarProps) {
  const setActiveThread = useChatStore((state) => state.setActiveThread);
  const togglePinThread = useChatStore((state) => state.togglePinThread);
  const toggleArchiveThread = useChatStore((state) => state.toggleArchiveThread);

  return (
    <aside className="sidebar">
      <div className="sidebar__top">
        {/* Toggle first & leftmost: its position never moves between modes. */}
        <IconButton className="sidebar-toggle" label={sidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"} onClick={() => setSidebarCollapsed((value) => !value)} type="button">
          <LayoutPanelLeft size={17} />
        </IconButton>
        <div className="brand-block">
          <div className="brand-mark">
            <Sparkles size={17} />
          </div>
          <div>
            <h1>{prototype.headline}</h1>
            <p>{prototype.eyebrow}</p>
          </div>
        </div>
      </div>

      <nav className="primary-nav" aria-label="Primary navigation">
        {navItemsButtons(view, sidebarCollapsed, setView, setMobileNavOpen)}
      </nav>

      <Button className="new-chat-button" data-tooltip={sidebarCollapsed ? "New session" : "Create a new conversation"} onClick={newThread} size="sm" type="button" variant="secondary">
        <MessageSquarePlus size={16} />
        <span>New session</span>
      </Button>

      <section className="recents-panel" aria-label="Recent sessions">
        <div className="section-label">
          <span>Threads</span>
          <IconButton aria-pressed={showArchivedThreads} className="mini-icon-button" label={showArchivedThreads ? "Hide archived threads" : "Show archived threads"} onClick={() => setShowArchivedThreads((value) => !value)} type="button">
            <Archive size={14} />
          </IconButton>
        </div>
        <div className="session-list">
          {visibleThreads.map((thread) => (
            <div className="session-row" data-active={thread.id === activeThreadId} key={thread.id} ref={threadMenuId === thread.id ? threadMenuRef : undefined}>
              {renameThreadId === thread.id ? (
                <input
                  aria-label="Conversation title"
                  className="session-rename-input"
                  onBlur={commitRename}
                  onChange={(event) => setRenameValue(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitRename();
                    }
                    if (event.key === "Escape") {
                      setRenameThreadId(null);
                    }
                  }}
                  value={renameValue}
                  autoFocus
                />
              ) : (
                <button className="session-item" onClick={() => { setActiveThread(thread.id); setView("chat"); setMobileNavOpen(false); }} type="button">
                  {thread.temporary ? <Ghost size={13} /> : thread.pinned ? <Pin size={13} /> : thread.archived ? <Archive size={13} /> : null}
                  <span>{thread.title}</span>
                </button>
              )}
              <IconButton
                className="mini-icon-button"
                label={`Actions for ${thread.title}`}
                tooltip="Conversation actions"
                onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                  if (threadMenuId === thread.id) {
                    setThreadMenuId(null);
                    return;
                  }

                  // Fixed positioning escapes the scroll container's clipping;
                  // flip above the trigger when too close to the bottom edge.
                  const rect = event.currentTarget.getBoundingClientRect();
                  const up = rect.bottom + 200 > window.innerHeight - 8;
                  setThreadMenuPosition({ left: rect.right, top: up ? rect.top - 4 : rect.bottom + 4, up });
                  setThreadMenuId(thread.id);
                }}
                type="button"
              >
                <MoreHorizontal size={14} />
              </IconButton>
              {threadMenuId === thread.id ? (
                <div
                  className="thread-menu"
                  role="menu"
                  style={
                    threadMenuPosition
                      ? {
                          left: threadMenuPosition.left,
                          top: threadMenuPosition.top,
                          transform: threadMenuPosition.up ? "translate(-100%, -100%)" : "translateX(-100%)",
                        }
                      : undefined
                  }
                >
                  <button onClick={() => startRename(thread)} role="menuitem" type="button"><Pencil size={15} /> Rename</button>
                  <button onClick={() => { togglePinThread(thread.id); setThreadMenuId(null); }} role="menuitem" type="button">
                    {thread.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                    {thread.pinned ? "Unpin" : "Pin"} chat
                  </button>
                  <button onClick={() => { toggleArchiveThread(thread.id); setThreadMenuId(null); }} role="menuitem" type="button"><Archive size={15} /> {thread.archived ? "Restore" : "Archive"}</button>
                  <button className="danger-menu-item" onClick={() => handleDeleteThread(thread)} role="menuitem" type="button"><Trash2 size={15} /> Delete</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {accountMenu}
      <button aria-label="Resize sidebar" className="sidebar-resizer" onPointerDown={() => setIsResizingSidebar(true)} type="button">
        <GripVertical size={14} />
      </button>
    </aside>
  );
}

/** Primary nav buttons, shared shape with the thumb bar's list. */
function navItemsButtons(view: ShellView, sidebarCollapsed: boolean, setView: (view: ShellView) => void, setMobileNavOpen: (open: boolean) => void) {
  return navItems.map((item) => (
    <button
      className="primary-nav__item"
      data-active={view === item.view}
      data-rail-hidden={item.railHidden || undefined}
      data-tooltip={sidebarCollapsed ? item.label : undefined}
      key={item.view}
      onClick={() => {
        setView(item.view);
        // Close the phone drawer even when re-selecting the active section
        // (the [view] effect only fires on an actual change).
        setMobileNavOpen(false);
        bumpQuest("page-visits");
      }}
      type="button"
    >
      <item.icon size={16} />
      <span>{item.label}</span>
    </button>
  ));
}
