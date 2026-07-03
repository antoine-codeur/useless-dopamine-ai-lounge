type WikiSummary = {
  title: string;
  description?: string;
  extract: string;
  thumbnail?: { source: string };
  content_urls?: { desktop?: { page?: string } };
};

/**
 * Fetches a random Wikipedia article summary and renders it as markdown, so
 * the simulated agent has something genuinely useful to say. Returns null on
 * any failure (offline, CORS, …) — callers fall back to the canned response.
 */
export async function fetchRandomWikiMarkdown(): Promise<string | null> {
  try {
    const response = await fetch("https://en.wikipedia.org/api/rest_v1/page/random/summary", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as WikiSummary;

    if (!data.title || !data.extract) {
      return null;
    }

    const lines = [`## ${data.title}`];

    if (data.description) {
      lines.push(`*${data.description}*`);
    }

    if (data.thumbnail?.source) {
      lines.push(`![${data.title}](${data.thumbnail.source})`);
    }

    lines.push(data.extract);

    const pageUrl = data.content_urls?.desktop?.page;

    if (pageUrl) {
      lines.push(`[Read the full article on Wikipedia](${pageUrl})`);
    }

    return lines.join("\n\n");
  } catch {
    return null;
  }
}
