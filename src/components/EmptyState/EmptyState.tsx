import type { ReactNode } from "react";

/** Shared empty-state card: an icon, a title, and a hint. Consumes the global
 *  `.empty-state` styles so panels don't re-implement the same markup. */
export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint: ReactNode }) {
  return (
    <article className="empty-state">
      {icon}
      <strong>{title}</strong>
      <span>{hint}</span>
    </article>
  );
}
