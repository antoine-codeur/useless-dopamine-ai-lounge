import { Anchor, Beer, BookOpen, Pickaxe, PawPrint, Sparkles, Swords } from "lucide-react";
import { fetchRandomWikiMarkdown } from "../../lib/wiki";
import { fetchRandomPokemonMarkdown } from "../../lib/pokemon";
import { fetchRandomYugiohMarkdown } from "../../lib/yugioh";
import { fetchRandomFandomMarkdown } from "../../lib/fandom";

export type PersonaId = "librarian" | "pokedex" | "duelist" | "pirate" | "brewmaster" | "jedi" | "miner";

export type Persona = {
  id: PersonaId;
  label: string;
  icon: typeof BookOpen;
  description: string;
  /** Credits to unlock (0 = included). The picker itself needs a paid plan. */
  cost: number;
  /** Quest counter bumped on every successful parse. */
  questKey: string;
  fetchMarkdown: () => Promise<string | null>;
};

/** One persona per parser — each answers with its own random knowledge. */
export const personas: Persona[] = [
  {
    id: "librarian",
    label: "The Librarian",
    icon: BookOpen,
    description: "Random Wikipedia articles",
    cost: 0,
    questKey: "wikis",
    fetchMarkdown: fetchRandomWikiMarkdown,
  },
  {
    id: "pokedex",
    label: "Professor Poké",
    icon: PawPrint,
    description: "Random Pokémon cards (Poképédia)",
    cost: 200,
    questKey: "pokemon",
    fetchMarkdown: fetchRandomPokemonMarkdown,
  },
  {
    id: "duelist",
    label: "The Duelist",
    icon: Swords,
    description: "Random Yu-Gi-Oh! cards (Yugipedia)",
    cost: 200,
    questKey: "yugioh",
    fetchMarkdown: fetchRandomYugiohMarkdown,
  },
  {
    id: "pirate",
    label: "The Pirate",
    icon: Anchor,
    description: "One Piece characters (One Piece Wiki)",
    cost: 250,
    questKey: "onepiece",
    fetchMarkdown: () => fetchRandomFandomMarkdown("onepiece.fandom.com", "the One Piece Wiki", "Pirates"),
  },
  {
    id: "brewmaster",
    label: "The Brewmaster",
    icon: Beer,
    description: "Random beers & brews (Beer Wiki)",
    cost: 250,
    questKey: "beer",
    fetchMarkdown: () => fetchRandomFandomMarkdown("beer.fandom.com", "the Beer Wiki"),
  },
  {
    id: "jedi",
    label: "The Holocron Keeper",
    icon: Sparkles,
    description: "Star Wars lore (Wookieepedia)",
    cost: 250,
    questKey: "starwars",
    fetchMarkdown: () => fetchRandomFandomMarkdown("starwars.fandom.com", "Wookieepedia"),
  },
  {
    id: "miner",
    label: "The Miner",
    icon: Pickaxe,
    description: "Minecraft knowledge (Minecraft Wiki)",
    cost: 250,
    questKey: "minecraft",
    fetchMarkdown: () => fetchRandomFandomMarkdown("minecraft.fandom.com", "the Minecraft Wiki"),
  },
];

export function getPersona(id: PersonaId): Persona {
  return personas.find((persona) => persona.id === id) ?? personas[0];
}
