type YugiohCard = {
  name: string;
  type: string;
  desc: string;
  race?: string;
  attribute?: string;
  level?: number;
  atk?: number;
  def?: number;
  card_images?: { image_url?: string; image_url_small?: string }[];
};

/** Random Yu-Gi-Oh! card (YGOPRODeck) rendered as markdown, Yugipedia-linked. */
export async function fetchRandomYugiohMarkdown(): Promise<string | null> {
  try {
    // randomcard.php now 301s here — call the final endpoint directly.
    const response = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?num=1&offset=0&sort=random&cachebust=${Date.now()}`);

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as YugiohCard | { data: YugiohCard[] };
    const card = "data" in payload ? payload.data[0] : payload;

    if (!card?.name) {
      return null;
    }

    const facts = [card.type, card.race, card.attribute].filter(Boolean).join(" · ");
    const image = card.card_images?.[0]?.image_url_small ?? card.card_images?.[0]?.image_url;
    const lines = [`## ${card.name}`, `*${facts}*`];

    if (image) {
      lines.push(`![${card.name}](${image})`);
    }

    lines.push(`> ${card.desc}`);

    // Battle numbers read best as a table.
    const headers: string[] = [];
    const values: string[] = [];

    if (card.level !== undefined) {
      headers.push("Level");
      values.push(String(card.level));
    }

    if (card.atk !== undefined) {
      headers.push("ATK");
      values.push(String(card.atk));
    }

    if (card.def !== undefined) {
      headers.push("DEF");
      values.push(String(card.def));
    }

    if (headers.length > 0) {
      lines.push([`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, `| ${values.join(" | ")} |`].join("\n"));
    }

    lines.push(`[Read on Yugipedia](https://yugipedia.com/wiki/${encodeURIComponent(card.name.replace(/ /g, "_"))})`);

    return lines.join("\n\n");
  } catch {
    return null;
  }
}
