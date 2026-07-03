import { useEffect, useState, type FormEvent } from "react";
import type { Account } from "../../types";
import { updateAccount } from "../../lib/api";
import { applyAccountResult } from "../profile/account.store";
import { isHandle, isStrongPassword, isValidOptionalBirthDate } from "../auth/validation";
import { useShellStore } from "../shell/shell.store";
import { bumpQuest } from "../quests/quest.store";
import { showToast } from "../../components/Toast/toast.store";

/** Owns the profile / onboarding form: name, handle, birth date and password
 *  fields, their validity, and the save/skip flows. Keeps the fields in sync
 *  with the signed-in account. Presentational panels receive it as props. */
export function useProfileForm(account: Account | null) {
  const setActionMessage = useShellStore((state) => state.setActionMessage);
  const [profileName, setProfileName] = useState("");
  const [profileHandle, setProfileHandle] = useState("");
  const [profileBirthDate, setProfileBirthDate] = useState("");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });

  useEffect(() => {
    if (!account) {
      return;
    }

    setProfileName(account.username ?? "");
    setProfileHandle(account.handle ?? "");
    setProfileBirthDate(account.birthDate ?? "");
  }, [account]);

  const passwordReady = isStrongPassword(passwordForm.newPassword);
  const profileNameInvalid = profileName.length > 0 && profileName.trim().length < 2;
  const profileHandleInvalid = profileHandle.length > 0 && !isHandle(profileHandle);
  const profileBirthDateInvalid = !isValidOptionalBirthDate(profileBirthDate);

  async function saveOnboardingProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (profileName.trim().length < 2 || !isHandle(profileHandle)) {
      setActionMessage("Fix the highlighted fields before continuing.");
      return;
    }

    const result = await updateAccount({ username: profileName, handle: profileHandle, onboardingStep: "avatar" });

    if (!result.ok) {
      setActionMessage(result.error === "handle_unavailable" ? "That handle is unavailable." : "Profile could not be saved.");
      return;
    }

    applyAccountResult(result);
    setActionMessage("");
  }

  async function skipOnboardingStep(step: Account["onboardingStep"]) {
    setActionMessage("");
    const result = await updateAccount({ onboardingStep: step });

    if (result.ok) {
      applyAccountResult(result);
    }
  }

  async function finishBirthdayStep(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!isValidOptionalBirthDate(profileBirthDate)) {
      setActionMessage("Use a valid past date or leave it empty.");
      return;
    }

    const result = await updateAccount({ birthDate: profileBirthDate, onboardingStep: "complete" });

    if (!result.ok) {
      setActionMessage("Use a valid past date or leave it empty.");
      return;
    }

    applyAccountResult(result);
    setActionMessage("");

    if (profileBirthDate) {
      bumpQuest("birthday-set");
    }
  }

  async function saveProfile() {
    if (profileName.trim().length < 2 || !isHandle(profileHandle) || !isValidOptionalBirthDate(profileBirthDate)) {
      setActionMessage("Fix the highlighted fields before saving.");
      return;
    }

    const result = await updateAccount({ username: profileName, handle: profileHandle, birthDate: profileBirthDate });

    if (!result.ok) {
      setActionMessage(result.error === "handle_unavailable" ? "That handle is unavailable." : "Profile could not be saved.");
      return;
    }

    applyAccountResult(result);
    setActionMessage("");
    bumpQuest("profile-saves");
    bumpQuest("handle-set");
    showToast({ variant: "success", title: "Profile saved" });
  }

  async function changePassword() {
    setActionMessage("");
    const result = await updateAccount(passwordForm);

    if (!result.ok) {
      setActionMessage("Password update failed. Check your current password and satisfy every requirement.");
      return;
    }

    applyAccountResult(result);
    setPasswordForm({ currentPassword: "", newPassword: "" });
    setActionMessage("");
    bumpQuest("password-changed");
    showToast({ variant: "success", title: "Password updated" });
  }

  return {
    profileName,
    setProfileName,
    profileHandle,
    setProfileHandle,
    profileBirthDate,
    setProfileBirthDate,
    passwordForm,
    setPasswordForm,
    passwordReady,
    profileNameInvalid,
    profileHandleInvalid,
    profileBirthDateInvalid,
    saveOnboardingProfile,
    skipOnboardingStep,
    finishBirthdayStep,
    saveProfile,
    changePassword,
  };
}
