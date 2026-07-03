export const controlStateEntities = [
  { id: "idle", description: "Default enabled state." },
  { id: "hover", description: "Pointer hover with a subtle surface lift." },
  { id: "active", description: "Pressed state with compact scale feedback." },
  { id: "focus-visible", description: "Keyboard focus ring, never mouse-only noise." },
  { id: "disabled", description: "Unavailable action, visible but inert." },
  { id: "loading", description: "Action in progress; content is replaced by the loader." },
  { id: "selected", description: "Navigation or option is currently active." },
] as const;

export const buttonVariantEntities = [
  { id: "primary", description: "Main affirmative action." },
  { id: "secondary", description: "Visible secondary action on a surface." },
  { id: "ghost", description: "Low-emphasis command or chrome control." },
  { id: "danger", description: "Destructive action." },
] as const;

export const buttonSizeEntities = [
  { id: "sm", description: "Dense controls, toolbars, composer actions." },
  { id: "md", description: "Default form and page actions." },
  { id: "lg", description: "Prominent call-to-action." },
  { id: "icon", description: "Square icon-only control with centered glyph." },
] as const;

export type ControlStateId = (typeof controlStateEntities)[number]["id"];
export type ButtonVariantId = (typeof buttonVariantEntities)[number]["id"];
export type ButtonSizeId = (typeof buttonSizeEntities)[number]["id"];
