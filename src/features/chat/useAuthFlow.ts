import { useState, type FormEvent } from "react";
import { createAccount, login, storeAuthToken } from "../../lib/api";
import { switchDataScope } from "../../lib/accountScope";
import { applyAccountResult } from "../profile/account.store";
import { isEmail, isStrongPassword } from "../auth/validation";

/** Owns the auth modal: its open state, the login/signup forms, and the submit
 *  flows. Persists the session token BEFORE the scope-switch reload — otherwise
 *  boot has no credential and drops the user back to guest. */
export function useAuthFlow() {
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [signup, setSignup] = useState({ email: "", password: "" });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupError, setSignupError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);

  const signupReady = isEmail(signup.email) && isStrongPassword(signup.password);

  function openAuth(mode: "signup" | "login", message = "") {
    setAuthMode(mode);
    setAuthMessage(message);
    setSignupError("");
    setShowAuthModal(true);
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignupError("");

    if (!signupReady) {
      setSignupError("Use a valid email and a password that satisfies every requirement.");
      return;
    }

    const result = await createAccount(signup);

    if (!result.ok) {
      setSignupError(result.error === "email_taken" ? "That email is already in use." : "Account creation failed. Check your email and password.");
      return;
    }

    // Persist the session token BEFORE any reload, otherwise the post-reload
    // boot has no credential and drops the user back into a guest session.
    storeAuthToken(result.token);

    // Signup carries the guest progress into the new account's bucket.
    if (switchDataScope(result.account.id, true)) {
      window.location.reload();
      return;
    }

    applyAccountResult(result);
    setShowAuthModal(false);
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignupError("");
    const result = await login(loginForm);

    if (!result.ok) {
      setSignupError("Email or password is incorrect.");
      return;
    }

    // Persist the session token BEFORE any reload, otherwise the post-reload
    // boot has no credential and drops the user back into a guest session.
    storeAuthToken(result.token);

    // Login restores THAT account's own bucket (fresh if first time here).
    if (switchDataScope(result.account.id)) {
      window.location.reload();
      return;
    }

    applyAccountResult(result);
    setShowAuthModal(false);
  }

  return {
    authMode,
    setAuthMode,
    signup,
    setSignup,
    loginForm,
    setLoginForm,
    signupError,
    setSignupError,
    authMessage,
    showAuthModal,
    setShowAuthModal,
    signupReady,
    openAuth,
    submitSignup,
    submitLogin,
  };
}
