export type ExtractedTable = { headers: string[]; rows: string[][] };

function splitCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** Pulls every GFM table out of a markdown string. */
export function extractMarkdownTables(markdown: string): ExtractedTable[] {
  const tables: ExtractedTable[] = [];
  const lines = markdown.split("\n");
  let block: string[] = [];

  const flush = () => {
    if (block.length >= 2 && /^\s*\|?[\s:-]+\|/.test(block[1])) {
      tables.push({ headers: splitCells(block[0]), rows: block.slice(2).map(splitCells) });
    }

    block = [];
  };

  lines.forEach((line) => {
    if (line.trim().startsWith("|")) {
      block.push(line);
    } else {
      flush();
    }
  });
  flush();

  return tables;
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function tablesToCsv(tables: ExtractedTable[]): string {
  return tables
    .map((table) => [table.headers.map(csvCell).join(","), ...table.rows.map((row) => row.map(csvCell).join(","))].join("\n"))
    .join("\n\n");
}

export function tablesToJson(tables: ExtractedTable[]): string {
  const mapped = tables.map((table) =>
    table.rows.map((row) => Object.fromEntries(table.headers.map((header, index) => [header, row[index] ?? ""]))),
  );
  return JSON.stringify(mapped.length === 1 ? mapped[0] : mapped, null, 2);
}

/** Filename slug from the result's first heading (e.g. "toxtricity-849"). */
export function exportSlug(markdown: string): string {
  const heading = markdown.match(/^#{1,6}\s+(.+)$/m)?.[1] ?? "result";
  const slug = heading
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "result";
}

export function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
