import { Bookmark, Bot, CalendarDays, Crown, Gift, ImagePlus, Medal, ShoppingBag, Trophy } from "lucide-react";
import type { ShellView } from "../shell/shell.store";

export type NavItem = {
  view: ShellView;
  icon: typeof Bot;
  label: string;
  /** Hidden from the collapsed desktop icon rail. */
  railHidden?: boolean;
  /** Hidden from the mobile thumb bar. */
  thumbHidden?: boolean;
};

/** Primary sections, shared by the sidebar rail and the mobile thumb bar. */
export const navItems: NavItem[] = [
  { view: "chat", icon: Bot, label: "Chat" },
  { view: "quests", icon: Trophy, label: "Quests" },
  { view: "shop", icon: ShoppingBag, label: "Shop" },
  { view: "season", icon: Crown, label: "Pass" },
  { view: "ranking", icon: Medal, label: "Ranking", thumbHidden: true },
  { view: "library", icon: Bookmark, label: "Library", thumbHidden: true },
  { view: "activity", icon: CalendarDays, label: "Activity", thumbHidden: true },
  { view: "earn", icon: Gift, label: "Earn", railHidden: true },
  { view: "gallery", icon: ImagePlus, label: "Gallery", railHidden: true },
];
