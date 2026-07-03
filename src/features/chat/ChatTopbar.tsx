import type { Dispatch, SetStateAction } from "react";
import { ChevronDown, CircleDashed, Ghost, Gift, PanelRightClose, PanelRightOpen, Trash2, Zap } from "lucide-react";
import { Button, IconButton } from "../../components/Button/Button";
import type { Account, ChatThread } from "../../types";
import type { ShellView } from "../shell/shell.store";
import { prototype } from "../../app/prototype";

type ChatTopbarProps = {
  title: string;
  activeThread: ChatThread | undefined;
  startRename: (thread: ChatThread) => void;
  backendStatus: "checking" | "online" | "offline";
  view: ShellView;
  canToggleTemporary: boolean;
  toggleTemporary: () => void;
  account: Account | null;
  setView: (view: ShellView) => void;
  conversationEmpty: boolean;
  handleClearChat: () => void;
  inspectorCollapsed: boolean;
  setInspectorCollapsed: Dispatch<SetStateAction<boolean>>;
};

/** The chat stage header: conversation title, backend status, the temporary /
 *  upgrade / clear actions, and the inspector toggle. Presentational — every
 *  action and piece of state is owned by ChatPage and passed in. */
export function ChatTopbar({
  title,
  activeThread,
  startRename,
  backendStatus,
  view,
  canToggleTemporary,
  toggleTemporary,
  account,
  setView,
  conversationEmpty,
  handleClearChat,
  inspectorCollapsed,
  setInspectorCollapsed,
}: ChatTopbarProps) {
  return (
    <header className="topbar">
      <button className="conversation-title" data-tooltip="Rename conversation" onClick={() => activeThread && startRename(activeThread)} type="button">
        <h2>{title === "New conversation" ? prototype.chatTitle : title}</h2>
        <ChevronDown size={16} />
      </button>
      <div className="topbar__actions">
        {backendStatus !== "online" ? (
          <span className="backend-pill" data-status={backendStatus}>
            <CircleDashed size={14} />
            API {backendStatus}
          </span>
        ) : null}
        {view === "chat" && canToggleTemporary ? (
          <IconButton
            aria-pressed={!!activeThread?.temporary}
            className="compact-button compact-button--icon"
            data-active={activeThread?.temporary || undefined}
            label={activeThread?.temporary ? "Temporary chat — deleted when you leave" : "Make this chat temporary"}
            onClick={toggleTemporary}
            type="button"
          >
            <Ghost size={15} />
          </IconButton>
        ) : null}
        {account?.plan === "max-plus" ? (
          <Button className="compact-button" data-tooltip="You're on the top plan — earn credits instead" onClick={() => setView("earn")} size="sm" type="button" variant="secondary">
            <Gift size={15} />
            Earn
          </Button>
        ) : (
          <Button className="compact-button" data-tooltip="View plans" onClick={() => setView("plans")} size="sm" type="button" variant="secondary">
            <Zap size={15} />
            Upgrade
          </Button>
        )}
        {view === "chat" && !conversationEmpty ? (
          <Button aria-label="Clear chat" className="compact-button compact-button--icon" data-tooltip="Clear current conversation" onClick={handleClearChat} size="icon" type="button" variant="ghost">
            <Trash2 size={15} />
          </Button>
        ) : null}
        <IconButton
          aria-pressed={inspectorCollapsed}
          className="compact-button compact-button--icon inspector-toggle"
          label={inspectorCollapsed ? "Show side panel" : "Hide side panel"}
          onClick={() => setInspectorCollapsed((value) => !value)}
          type="button"
        >
          {inspectorCollapsed ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}
        </IconButton>
      </div>
    </header>
  );
}
