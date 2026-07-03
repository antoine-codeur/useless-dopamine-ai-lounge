import { FormEvent } from "react";
import { LogIn, UserRound, X } from "lucide-react";
import { Button, IconButton } from "../../components/Button/Button";
import { PasswordChecklist } from "./PasswordChecklist";
import { isEmail, isStrongPassword } from "./validation";

/** Sign-up / sign-in dialog with a tabbed toggle and live field validation. */
export function AuthModal({
  authMessage,
  authMode,
  loginForm,
  setAuthMode,
  setLoginForm,
  setShowAuthModal,
  setSignup,
  signup,
  signupError,
  signupReady,
  submitLogin,
  submitSignup,
}: {
  authMessage: string;
  authMode: "signup" | "login";
  loginForm: { email: string; password: string };
  setAuthMode: (mode: "signup" | "login") => void;
  setLoginForm: (value: { email: string; password: string }) => void;
  setShowAuthModal: (value: boolean) => void;
  setSignup: (value: { email: string; password: string }) => void;
  signup: { email: string; password: string };
  signupError: string;
  signupReady: boolean;
  submitLogin: (event: FormEvent<HTMLFormElement>) => void;
  submitSignup: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const signupEmailInvalid = signup.email.length > 0 && !isEmail(signup.email);
  const signupPasswordInvalid = signup.password.length > 0 && !isStrongPassword(signup.password);
  const loginEmailInvalid = loginForm.email.length > 0 && !isEmail(loginForm.email);

  return (
    <div className="modal-backdrop" onMouseDown={() => setShowAuthModal(false)} role="presentation">
      <form
        aria-label={authMode === "signup" ? "Create account" : "Sign in"}
        aria-modal="true"
        className="auth-card auth-modal"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={authMode === "signup" ? submitSignup : submitLogin}
        role="dialog"
      >
        <header className="modal-header">
          <div>
            <h1>{authMode === "signup" ? "Create your account" : "Welcome back"}</h1>
            <p>{authMessage || "Save credits, profile details, rewards, and plan upgrades."}</p>
          </div>
          <IconButton className="icon-button" label="Close account dialog" onClick={() => setShowAuthModal(false)} type="button">
            <X size={18} />
          </IconButton>
        </header>
        <div className="auth-toggle" role="tablist" aria-label="Account action">
          <button aria-selected={authMode === "signup"} data-active={authMode === "signup"} onClick={() => setAuthMode("signup")} role="tab" type="button">
            Create
          </button>
          <button aria-selected={authMode === "login"} data-active={authMode === "login"} onClick={() => setAuthMode("login")} role="tab" type="button">
            Sign in
          </button>
        </div>
        {authMode === "signup" ? (
          <>
            <label htmlFor="signup-email">
              Email
              <input
                aria-describedby="signup-email-hint"
                aria-invalid={signupEmailInvalid}
                autoComplete="email"
                autoFocus
                id="signup-email"
                inputMode="email"
                required
                type="email"
                value={signup.email}
                onChange={(event) => setSignup({ ...signup, email: event.currentTarget.value })}
              />
            </label>
            <p className={signupEmailInvalid ? "field-error" : "field-hint"} id="signup-email-hint">
              {signupEmailInvalid ? "Enter a valid email address." : "Use an address you can access for account recovery."}
            </p>
            <label htmlFor="signup-password">
              Password
              <input
                aria-describedby="signup-password-rules"
                aria-invalid={signupPasswordInvalid}
                autoComplete="new-password"
                id="signup-password"
                required
                type="password"
                value={signup.password}
                onChange={(event) => setSignup({ ...signup, password: event.currentTarget.value })}
              />
            </label>
            <div id="signup-password-rules">
              <PasswordChecklist value={signup.password} />
            </div>
          </>
        ) : (
          <>
            <label htmlFor="login-email">
              Email
              <input
                aria-describedby="login-email-hint"
                aria-invalid={loginEmailInvalid}
                autoComplete="email"
                autoFocus
                id="login-email"
                inputMode="email"
                required
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm({ ...loginForm, email: event.currentTarget.value })}
              />
            </label>
            <p className={loginEmailInvalid ? "field-error" : "field-hint"} id="login-email-hint">
              {loginEmailInvalid ? "Enter a valid email address." : "Your account email."}
            </p>
            <label htmlFor="login-password">
              Password
              <input
                autoComplete="current-password"
                id="login-password"
                required
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm({ ...loginForm, password: event.currentTarget.value })}
              />
            </label>
          </>
        )}
        {signupError ? (
          <p className="form-error" role="alert">
            {signupError}
          </p>
        ) : null}
        <Button disabled={authMode === "signup" && !signupReady} type="submit">
          {authMode === "signup" ? <UserRound size={17} /> : <LogIn size={17} />}
          {authMode === "signup" ? "Continue" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
