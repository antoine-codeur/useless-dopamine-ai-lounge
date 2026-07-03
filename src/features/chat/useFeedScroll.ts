import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Message } from "../../types";
import type { ShellView } from "../shell/shell.store";

/** Owns the message-feed scroll behaviour: stick-to-bottom on new messages,
 *  snap-to-bottom on thread switch / view change, and the jump-to-bottom button.
 *  `stickToBottomRef` is returned so the send flow can force a re-stick. */
export function useFeedScroll(messages: Message[], activeThreadId: string | null, view: ShellView) {
  const feedRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  useEffect(() => {
    const feed = feedRef.current;

    if (feed && stickToBottomRef.current) {
      feed.scrollTo({ top: feed.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  useLayoutEffect(() => {
    // Fresh mount / thread switch: land at the BOTTOM instantly (even after a
    // hard refresh). Late-loading images push the height, so re-snap twice.
    const snap = () => {
      const feed = feedRef.current;

      if (feed && stickToBottomRef.current) {
        feed.scrollTop = feed.scrollHeight;
      }
    };

    stickToBottomRef.current = true;
    snap();
    const first = window.setTimeout(snap, 250);
    const second = window.setTimeout(snap, 900);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, [activeThreadId, view]);

  function handleFeedScroll() {
    const feed = feedRef.current;

    if (feed) {
      const nearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 120;
      stickToBottomRef.current = nearBottom;
      setShowJumpToBottom(!nearBottom);
    }
  }

  function jumpToBottom() {
    const feed = feedRef.current;

    if (feed) {
      stickToBottomRef.current = true;
      setShowJumpToBottom(false);
      feed.scrollTo({ top: feed.scrollHeight, behavior: "smooth" });
    }
  }

  return { feedRef, stickToBottomRef, showJumpToBottom, handleFeedScroll, jumpToBottom };
}
