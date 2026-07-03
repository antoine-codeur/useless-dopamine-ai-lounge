type PokemonData = {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { type: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
  sprites: { other?: { "official-artwork"?: { front_default?: string } } };
};

type SpeciesData = {
  names?: { language: { name: string }; name: string }[];
  flavor_text_entries?: { language: { name: string }; flavor_text: string }[];
};

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

/** Random Pokémon card (PokéAPI) rendered as markdown, Poképédia-linked. */
export async function fetchRandomPokemonMarkdown(): Promise<string | null> {
  try {
    const id = 1 + Math.floor(Math.random() * 1025);
    const [pokemonResponse, speciesResponse] = await Promise.all([
      fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
      fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
    ]);

    if (!pokemonResponse.ok) {
      return null;
    }

    const pokemon = (await pokemonResponse.json()) as PokemonData;
    const species: SpeciesData = speciesResponse.ok ? ((await speciesResponse.json()) as SpeciesData) : {};
    const displayName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
    const frenchName = species.names?.find((entry) => entry.language.name === "fr")?.name;
    const flavor = species.flavor_text_entries
      ?.find((entry) => entry.language.name === "en")
      ?.flavor_text.replace(/[\n\f]/g, " ");
    const artwork = pokemon.sprites.other?.["official-artwork"]?.front_default;
    const types = pokemon.types.map((entry) => entry.type.name).join(" · ");
    const statHeaders = pokemon.stats.map((entry) => STAT_LABELS[entry.stat.name] ?? entry.stat.name);
    const statValues = pokemon.stats.map((entry) => String(entry.base_stat));

    const lines = [`## ${displayName} #${String(pokemon.id).padStart(3, "0")}`, `*${types}*`];

    if (artwork) {
      lines.push(`![${displayName}](${artwork})`);
    }

    if (flavor) {
      lines.push(`> ${flavor}`);
    }

    // Stats read best as tables.
    lines.push(
      [
        `| ${statHeaders.join(" | ")} |`,
        `| ${statHeaders.map(() => "---").join(" | ")} |`,
        `| ${statValues.join(" | ")} |`,
      ].join("\n"),
    );
    lines.push(
      [
        "| Height | Weight |",
        "| --- | --- |",
        `| ${(pokemon.height / 10).toFixed(1)} m | ${(pokemon.weight / 10).toFixed(1)} kg |`,
      ].join("\n"),
    );
    lines.push(
      `[Read on Poképédia](https://www.pokepedia.fr/${encodeURIComponent(frenchName ?? displayName)}) · [PokémonDB](https://pokemondb.net/pokedex/${pokemon.name})`,
    );

    return lines.join("\n\n");
  } catch {
    return null;
  }
}
