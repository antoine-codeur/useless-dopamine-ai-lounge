import { ReactNode } from "react";
import { LogIn, UserRound } from "lucide-react";
import { Button } from "../../components/Button/Button";

/**
 * Empty-state shown to guests on account-gated views (profile, earn, …),
 * inviting them to create an account or sign in.
 */
export function GuestPanel({
  icon,
  onCreate,
  onLogin,
  text,
  title,
}: {
  icon: ReactNode;
  onCreate: () => void;
  onLogin: () => void;
  text: string;
  title: string;
}) {
  return (
    <section className="content-panel guest-panel">
      <div className="intro-mark">{icon}</div>
      <h3>{title}</h3>
      <p className="muted">{text}</p>
      <div className="guest-actions">
        <Button onClick={onCreate} type="button">
          <UserRound size={16} />
          Create account
        </Button>
        <Button onClick={onLogin} type="button" variant="secondary">
          <LogIn size={16} />
          Sign in
        </Button>
      </div>
    </section>
  );
}
