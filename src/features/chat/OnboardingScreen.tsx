import type { ChangeEvent, FormEvent, RefObject } from "react";
import { CalendarDays, Check, Gift, ImagePlus, UserRound } from "lucide-react";
import type { Account } from "../../types";
import { Button } from "../../components/Button/Button";
import { AccountAvatar } from "../account/AccountAvatar";
import { AvatarModal } from "../onboarding/AvatarModal";
import { isHandle } from "../auth/validation";
import type { AvatarEditorState } from "./useAvatarEditor";

type OnboardingScreenProps = {
  account: Account;
  profileName: string;
  setProfileName: (value: string) => void;
  profileNameInvalid: boolean;
  profileHandle: string;
  setProfileHandle: (value: string) => void;
  profileHandleInvalid: boolean;
  profileBirthDate: string;
  setProfileBirthDate: (value: string) => void;
  profileBirthDateInvalid: boolean;
  actionMessage: string;
  onboardingAvatarInputRef: RefObject<HTMLInputElement | null>;
  saveOnboardingProfile: (event: FormEvent<HTMLFormElement>) => void;
  skipOnboardingStep: (step: Account["onboardingStep"]) => void;
  finishBirthdayStep: (event?: FormEvent<HTMLFormElement>) => void;
  openAvatarFile: (event: ChangeEvent<HTMLInputElement>, nextStep?: Account["onboardingStep"]) => void;
  avatarEditor: AvatarEditorState | null;
  avatarScale: number;
  setAvatarScale: (scale: number) => void;
  closeAvatarEditor: () => void;
  saveAvatar: () => void;
};

/** Full-screen account setup takeover shown until onboardingStep === "complete".
 *  Presentational: all state/handlers are owned by ChatPage and passed in. */
export function OnboardingScreen({
  account,
  profileName,
  setProfileName,
  profileNameInvalid,
  profileHandle,
  setProfileHandle,
  profileHandleInvalid,
  profileBirthDate,
  setProfileBirthDate,
  profileBirthDateInvalid,
  actionMessage,
  onboardingAvatarInputRef,
  saveOnboardingProfile,
  skipOnboardingStep,
  finishBirthdayStep,
  openAvatarFile,
  avatarEditor,
  avatarScale,
  setAvatarScale,
  closeAvatarEditor,
  saveAvatar,
}: OnboardingScreenProps) {
  return (
    <main className="auth-screen">
      <section className="auth-card onboarding-card">
        <div className="step-track" aria-label="Account setup progress">
          {["profile", "avatar", "birthday"].map((step) => (
            <span data-active={account.onboardingStep === step} data-done={["avatar", "birthday", "complete"].indexOf(account.onboardingStep) > ["avatar", "birthday", "complete"].indexOf(step)} key={step} />
          ))}
        </div>

        {account.onboardingStep === "profile" ? (
          <form className="onboarding-step" onSubmit={saveOnboardingProfile}>
            <div className="intro-mark">
              <UserRound size={28} />
            </div>
            <h1>Set up your profile</h1>
            <p>Pick the name and handle people will see inside the lounge. You can change both later.</p>
            <label htmlFor="onboarding-display-name">
              Display name
              <input
                aria-describedby="onboarding-display-name-hint"
                aria-invalid={profileNameInvalid}
                autoFocus
                id="onboarding-display-name"
                minLength={2}
                required
                value={profileName}
                onChange={(event) => setProfileName(event.currentTarget.value)}
              />
            </label>
            <p className={profileNameInvalid ? "field-error" : "field-hint"} id="onboarding-display-name-hint">
              {profileNameInvalid ? "Use at least 2 characters." : "At least 2 characters."}
            </p>
            <label htmlFor="onboarding-handle">
              Handle
              <input
                aria-describedby="onboarding-handle-hint"
                aria-invalid={profileHandleInvalid}
                id="onboarding-handle"
                pattern="[a-z0-9_]{2,28}"
                required
                value={profileHandle}
                onChange={(event) => setProfileHandle(event.currentTarget.value.toLowerCase())}
              />
            </label>
            <p className={profileHandleInvalid ? "field-error" : "field-hint"} id="onboarding-handle-hint">
              {profileHandleInvalid ? "Use 2-28 lowercase letters, numbers, or underscores." : "Lowercase letters, numbers, and underscores only."}
            </p>
            {actionMessage ? <p className="form-error">{actionMessage}</p> : null}
            <Button disabled={profileName.trim().length < 2 || !isHandle(profileHandle)} type="submit">
              <Check size={17} />
              Save and continue
            </Button>
          </form>
        ) : null}

        {account.onboardingStep === "avatar" ? (
          <div className="onboarding-step">
            <div className="onboarding-avatar">
              <AccountAvatar account={account} size="lg" />
            </div>
            <h1>Add a profile picture</h1>
            <p>Optional. Upload an image, resize it visually, then save a compressed avatar to your account.</p>
            <input
              accept="image/*"
              className="sr-only"
              onChange={(event) => openAvatarFile(event, "birthday")}
              ref={onboardingAvatarInputRef}
              type="file"
            />
            <Button onClick={() => onboardingAvatarInputRef.current?.click()} type="button">
              <ImagePlus size={17} />
              Choose image
            </Button>
            <Button onClick={() => skipOnboardingStep("birthday")} type="button" variant="ghost">
              Skip for now
            </Button>
          </div>
        ) : null}

        {account.onboardingStep === "birthday" ? (
          <form className="onboarding-step" onSubmit={finishBirthdayStep}>
            <div className="intro-mark">
              <CalendarDays size={28} />
            </div>
            <h1>Birthday reward</h1>
            <p>Optional. Your date is used only to unlock an annual credit gift on your birthday.</p>
            <label htmlFor="onboarding-birth-date">
              Date of birth
              <input
                aria-describedby="onboarding-birth-date-hint"
                aria-invalid={profileBirthDateInvalid}
                id="onboarding-birth-date"
                max={new Date().toISOString().slice(0, 10)}
                type="date"
                value={profileBirthDate}
                onChange={(event) => setProfileBirthDate(event.currentTarget.value)}
              />
            </label>
            <p className={profileBirthDateInvalid ? "field-error" : "field-hint"} id="onboarding-birth-date-hint">
              {profileBirthDateInvalid ? "Use a valid past date." : "Optional. Used only for annual birthday credits."}
            </p>
            {actionMessage ? <p className="form-error">{actionMessage}</p> : null}
            <Button type="submit">
              <Gift size={17} />
              Finish setup
            </Button>
            <Button onClick={() => skipOnboardingStep("complete")} type="button" variant="ghost">
              Skip
            </Button>
          </form>
        ) : null}
      </section>

      {avatarEditor ? (
        <AvatarModal
          scale={avatarScale}
          src={avatarEditor.src}
          onCancel={closeAvatarEditor}
          onScaleChange={setAvatarScale}
          onSave={saveAvatar}
        />
      ) : null}
    </main>
  );
}
