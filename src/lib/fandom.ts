type RandomQuery = { query?: { random?: { id: number }[] } };
type CategoryQuery = { query?: { categorymembers?: { pageid: number }[] } };
type ExtractQuery = {
  query?: {
    pages?: Record<
      string,
      { title?: string; extract?: string; thumbnail?: { source?: string }; fullurl?: string }
    >;
  };
};
type ParseQuery = { parse?: { text?: { "*"?: string } } };

/** Strips rendered wiki HTML (infoboxes, tables, figures) down to plain text. */
function htmlToText(markup: string) {
  const cleaned = markup
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<table[\s\S]*?<\/table>/gi, "")
    .replace(/<figure[\s\S]*?<\/figure>/gi, "")
    .replace(/<[^>]+>/g, " ");
  const decoder = document.createElement("textarea");
  decoder.innerHTML = cleaned;
  return decoder.value.replace(/\s+/g, " ").trim();
}

/**
 * Generic random-article parser for any Fandom/MediaWiki wiki (CORS via
 * origin=*). Optionally restricted to a category (e.g. One Piece characters).
 */
export async function fetchRandomFandomMarkdown(host: string, sourceLabel: string, category?: string): Promise<string | null> {
  try {
    let pageId: number | undefined;

    if (category) {
      const response = await fetch(
        `https://${host}/api.php?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(category)}&cmnamespace=0&cmlimit=500&format=json&origin=*`,
      );
      const payload = (await response.json()) as CategoryQuery;
      const members = payload.query?.categorymembers ?? [];

      if (members.length > 0) {
        pageId = members[Math.floor(Math.random() * members.length)].pageid;
      }
    }

    if (!pageId) {
      const response = await fetch(`https://${host}/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*`);
      const payload = (await response.json()) as RandomQuery;
      pageId = payload.query?.random?.[0]?.id;
    }

    if (!pageId) {
      return null;
    }

    const detailResponse = await fetch(
      `https://${host}/api.php?action=query&prop=extracts|pageimages|info&inprop=url&exintro=1&explaintext=1&exsentences=8&piprop=thumbnail&pithumbsize=400&pageids=${pageId}&format=json&origin=*`,
    );
    const detail = (await detailResponse.json()) as ExtractQuery;
    const page = detail.query?.pages?.[String(pageId)];

    if (!page?.title) {
      return null;
    }

    let extract = page.extract?.trim();

    // Most Fandom wikis don't ship TextExtracts: parse the intro section
    // instead and strip its HTML down to readable sentences.
    if (!extract) {
      const parseResponse = await fetch(
        `https://${host}/api.php?action=parse&pageid=${pageId}&prop=text&section=0&disablelimitreport=1&format=json&origin=*`,
      );
      const parsed = (await parseResponse.json()) as ParseQuery;
      const markup = parsed.parse?.text?.["*"];

      if (markup) {
        const text = htmlToText(markup);
        extract = text.split(/(?<=\.)\s+/).slice(0, 6).join(" ").slice(0, 900);
      }
    }

    if (!extract) {
      return null;
    }

    const lines = [`## ${page.title}`];

    if (page.thumbnail?.source) {
      lines.push(`![${page.title}](${page.thumbnail.source})`);
    }

    lines.push(extract);
    lines.push(`[Read on ${sourceLabel}](${page.fullurl ?? `https://${host}/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`})`);

    return lines.join("\n\n");
  } catch {
    return null;
  }
}
