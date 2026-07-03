export type PrototypeId = "studio" | "arcade" | "terminal" | "lounge";

export type PrototypeConfig = {
  id: PrototypeId;
  label: string;
  eyebrow: string;
  headline: string;
  description: string;
  chatTitle: string;
};

export const prototype: PrototypeConfig = {
  id: "lounge",
  label: "Prototype 04 - Lounge",
  eyebrow: "Premium calme",
  headline: "Dopamine Lounge",
  description: "A deliberately useless but real space for turning each interaction into crisp satisfaction.",
  chatTitle: "AI Agent",
};
