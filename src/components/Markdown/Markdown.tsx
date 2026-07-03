import { ComponentPropsWithoutRef, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ClipboardCopy, Download } from "lucide-react";
import { showToast } from "../Toast/toast.store";
import { bumpQuest } from "../../features/quests/quest.store";
import { downloadFile, tablesToCsv, tablesToJson } from "../../lib/tableExport";
import type { ExtractedTable } from "../../lib/tableExport";
import "./Markdown.css";

type MarkdownProps = {
  content: string;
  /** Base filename for table exports (e.g. "toxtricity-849"). */
  exportName?: string;
};

/** Table wrapper with its own copy/export toolbar, right next to the data. */
function ExportableTable({ exportName, ...props }: ComponentPropsWithoutRef<"table"> & { exportName: string }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  function grabData(): ExtractedTable | null {
    const table = wrapRef.current?.querySelector("table");

    if (!table) {
      return null;
    }

    const rows = Array.from(table.querySelectorAll("tr")).map((row) =>
      Array.from(row.querySelectorAll("th, td")).map((cell) => (cell.textContent ?? "").trim()),
    );
    const [headers, ...body] = rows;
    return headers ? { headers, rows: body } : null;
  }

  function serialize(format: "csv" | "json"): string | null {
    const data = grabData();
    return data ? (format === "csv" ? tablesToCsv([data]) : tablesToJson([data])) : null;
  }

  async function copyAs(format: "csv" | "json") {
    const payload = serialize(format);

    if (!payload) {
      return;
    }

    await navigator.clipboard?.writeText(payload);
    bumpQuest("exports");
    showToast({ variant: "success", title: `${format.toUpperCase()} copied to clipboard` });
  }

  function downloadAs(format: "csv" | "json") {
    const payload = serialize(format);

    if (!payload) {
      return;
    }

    const name = `${exportName}-data.${format}`;
    downloadFile(name, payload, format === "csv" ? "text/csv" : "application/json");
    bumpQuest("exports");
    showToast({ variant: "success", title: `Exported ${name}` });
  }

  return (
    <div className="markdown-table" ref={wrapRef}>
      <div aria-label="Table export" className="markdown-table__tools">
        <button data-tooltip="Copy as CSV" onClick={() => void copyAs("csv")} type="button">
          <ClipboardCopy size={12} /> CSV
        </button>
        <button data-tooltip="Copy as JSON" onClick={() => void copyAs("json")} type="button">
          <ClipboardCopy size={12} /> JSON
        </button>
        <button data-tooltip="Download CSV file" onClick={() => downloadAs("csv")} type="button">
          <Download size={12} /> CSV
        </button>
        <button data-tooltip="Download JSON file" onClick={() => downloadAs("json")} type="button">
          <Download size={12} /> JSON
        </button>
      </div>
      <table {...props} />
    </div>
  );
}

/**
 * Safe GFM markdown renderer for chat content (no raw HTML pass-through).
 * External links open in a new tab — and count toward the "verify your
 * sources" quests. Tables carry their own copy/export toolbar.
 */
export function Markdown({ content, exportName = "table" }: MarkdownProps) {
  return (
    <div className="markdown">
      <ReactMarkdown
        components={{
          a: ({ node: _node, ...props }) => <a onClick={() => bumpQuest("sources")} rel="noreferrer" target="_blank" {...props} />,
          table: ({ node: _node, ...props }) => <ExportableTable exportName={exportName} {...props} />,
        }}
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
