import type { ChangeEvent, DragEvent as ReactDragEvent, RefObject } from "react";
import { CreditCard, KeyRound, Pencil, Save, Trash2, UserRound } from "lucide-react";
import type { Account, Plan } from "../../types";
import type { ShellView } from "../shell/shell.store";
import { Button } from "../../components/Button/Button";
import { AccountAvatar } from "../account/AccountAvatar";
import { GuestPanel } from "../account/GuestPanel";
import { PasswordChecklist } from "../auth/PasswordChecklist";

type PasswordForm = { currentPassword: string; newPassword: string };

type ProfileSettingsProps = {
  account: Account | null;
  currentPlan: Plan | undefined;
  activityStats: { currentStreak: number; longestStreak: number };
  profileDragActive: boolean;
  handleProfileDragOver: (event: ReactDragEvent<HTMLElement>) => void;
  handleProfileDragLeave: (event: ReactDragEvent<HTMLElement>) => void;
  handleProfileDrop: (event: ReactDragEvent<HTMLElement>) => void;
  profileAvatarInputRef: RefObject<HTMLInputElement | null>;
  openAvatarFile: (event: ChangeEvent<HTMLInputElement>, nextStep?: Account["onboardingStep"]) => void;
  profileName: string;
  setProfileName: (value: string) => void;
  profileNameInvalid: boolean;
  profileHandle: string;
  setProfileHandle: (value: string) => void;
  profileHandleInvalid: boolean;
  profileBirthDate: string;
  setProfileBirthDate: (value: string) => void;
  profileBirthDateInvalid: boolean;
  saveProfile: () => void;
  setView: (view: ShellView) => void;
  passwordForm: PasswordForm;
  setPasswordForm: (value: PasswordForm) => void;
  passwordReady: boolean;
  changePassword: () => void;
  setConfirmDeleteAccount: (value: boolean) => void;
  actionMessage: string;
  openAuth: (mode: "signup" | "login", message?: string) => void;
};

/** Profile settings view (avatar, identity, billing summary, password reset,
 *  danger zone). Presentational: state/handlers are owned by ChatPage. */
export function ProfileSettings({
  account,
  currentPlan,
  activityStats,
  profileDragActive,
  handleProfileDragOver,
  handleProfileDragLeave,
  handleProfileDrop,
  profileAvatarInputRef,
  openAvatarFile,
  profileName,
  setProfileName,
  profileNameInvalid,
  profileHandle,
  setProfileHandle,
  profileHandleInvalid,
  profileBirthDate,
  setProfileBirthDate,
  profileBirthDateInvalid,
  saveProfile,
  setView,
  passwordForm,
  setPasswordForm,
  passwordReady,
  changePassword,
  setConfirmDeleteAccount,
  actionMessage,
  openAuth,
}: ProfileSettingsProps) {
  if (!account) {
    return (
      <GuestPanel
        icon={<UserRound size={22} />}
        title="Create a profile"
        text="Guest chat is available now. A profile is required for avatar, password reset, birthday rewards, quests, and saved plan upgrades."
        onCreate={() => openAuth("signup", "Create an account to save profile settings and keep your credits.")}
        onLogin={() => openAuth("login")}
      />
    );
  }

  return (
    <section
      className="content-panel profile-panel"
      data-drag-active={profileDragActive}
      onDragLeave={handleProfileDragLeave}
      onDragOver={handleProfileDragOver}
      onDrop={handleProfileDrop}
    >
      <div className="profile-hero">
        <button className="profile-avatar-edit" data-tooltip="Change profile picture" onClick={() => profileAvatarInputRef.current?.click()} type="button" aria-label="Change profile picture">
          <AccountAvatar account={account} size="lg" />
          <span>
            <Pencil size={18} />
          </span>
        </button>
        <h3>{account.username}</h3>
        <p>
          @{account.handle} · <span className="plan-pill">{currentPlan?.label ?? "Free"}</span>
        </p>
        <input accept="image/*" className="sr-only" onChange={(event) => openAvatarFile(event)} ref={profileAvatarInputRef} type="file" />
        {profileDragActive ? <div className="profile-drop-overlay">Drop to resize picture</div> : null}
      </div>
      <div className="profile-metrics profile-metrics--wide">
        <div><strong>{account.creditsUsed.toLocaleString()}</strong><span>Chat usage</span></div>
        <div><strong>{account.creditsRemaining.toLocaleString()}</strong><span>Credits left</span></div>
        <div><strong>{account.boosters}</strong><span>Boosters</span></div>
        <div><strong>{activityStats.currentStreak}d</strong><span>Current streak</span></div>
        <div><strong>{activityStats.longestStreak}d</strong><span>Longest streak</span></div>
      </div>
      <label htmlFor="profile-display-name">
        Display name
        <input
          aria-describedby="profile-display-name-hint"
          aria-invalid={profileNameInvalid}
          id="profile-display-name"
          minLength={2}
          required
          value={profileName}
          onChange={(event) => setProfileName(event.currentTarget.value)}
        />
      </label>
      <p className={profileNameInvalid ? "field-error" : "field-hint"} id="profile-display-name-hint">
        {profileNameInvalid ? "Use at least 2 characters." : "At least 2 characters."}
      </p>
      <label htmlFor="profile-handle">
        Handle
        <input
          aria-describedby="profile-handle-hint"
          aria-invalid={profileHandleInvalid}
          id="profile-handle"
          pattern="[a-z0-9_]{2,28}"
          required
          value={profileHandle}
          onChange={(event) => setProfileHandle(event.currentTarget.value.toLowerCase())}
        />
      </label>
      <p className={profileHandleInvalid ? "field-error" : "field-hint"} id="profile-handle-hint">
        {profileHandleInvalid ? "Use 2-28 lowercase letters, numbers, or underscores." : "Lowercase letters, numbers, and underscores only."}
      </p>
      <label htmlFor="profile-email">
        Email
        <input disabled id="profile-email" value={account.email} />
      </label>
      <label htmlFor="profile-birth-date">
        Date of birth
        <input
          aria-describedby="profile-birth-date-hint"
          aria-invalid={profileBirthDateInvalid}
          id="profile-birth-date"
          max={new Date().toISOString().slice(0, 10)}
          type="date"
          value={profileBirthDate}
          onChange={(event) => setProfileBirthDate(event.currentTarget.value)}
        />
      </label>
      <p className={profileBirthDateInvalid ? "field-error" : "field-hint"} id="profile-birth-date-hint">
        {profileBirthDateInvalid ? "Use a valid past date." : "Optional. Used only for annual birthday credits."}
      </p>
      <Button disabled={profileNameInvalid || profileHandleInvalid || profileBirthDateInvalid} onClick={saveProfile} type="button"><Save size={16} /> Save profile</Button>
      <div className="password-panel billing-panel">
        <h4>Billing</h4>
        <div className="stat-row">
          <span>Plan</span>
          <strong><span className="plan-pill">{currentPlan?.label ?? "Free"}</span></strong>
        </div>
        <div className="stat-row"><span>Billing cycle</span><strong>{account.planBillingCycle ?? "monthly"}</strong></div>
        <div className="stat-row"><span>Renews</span><strong>{account.planRenewsAt ?? "—"}</strong></div>
        <div className="stat-row"><span>Credits left</span><strong>{account.creditsRemaining.toLocaleString()}</strong></div>
        <Button onClick={() => setView("plans")} type="button" variant="secondary">
          <CreditCard size={16} />
          {account.plan === "max-plus" ? "Manage plan" : "Upgrade plan"}
        </Button>
      </div>
      <div className="password-panel">
        <h4>Reset password</h4>
        <label htmlFor="profile-current-password">
          Current password
          <input
            autoComplete="current-password"
            id="profile-current-password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.currentTarget.value })}
          />
        </label>
        <label htmlFor="profile-new-password">
          New password
          <input
            aria-describedby="profile-new-password-rules"
            aria-invalid={passwordForm.newPassword.length > 0 && !passwordReady}
            autoComplete="new-password"
            id="profile-new-password"
            type="password"
            value={passwordForm.newPassword}
            onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.currentTarget.value })}
          />
        </label>
        <div id="profile-new-password-rules">
          <PasswordChecklist value={passwordForm.newPassword} />
        </div>
        <Button disabled={!passwordReady || !passwordForm.currentPassword} onClick={changePassword} type="button" variant="secondary"><KeyRound size={16} /> Update password</Button>
      </div>
      <div className="password-panel danger-panel">
        <h4>Danger zone</h4>
        <p className="muted">
          Deleting your account is permanent. If it has interacted with the app, it is anonymized instead
          (Discord-style "Deleted User") so shared traces stay coherent — either way, you can never log back in.
        </p>
        <Button onClick={() => setConfirmDeleteAccount(true)} type="button" variant="danger">
          <Trash2 size={16} /> Delete account
        </Button>
      </div>
      {actionMessage ? <p className="action-message">{actionMessage}</p> : null}
    </section>
  );
}
