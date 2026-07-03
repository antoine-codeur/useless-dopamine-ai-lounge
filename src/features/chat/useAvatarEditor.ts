import { useEffect, useState, type ChangeEvent } from "react";
import type { Account } from "../../types";
import { cropAvatar } from "../../lib/avatar";
import { updateAccount } from "../../lib/api";
import { applyAccountResult } from "../profile/account.store";
import { bumpQuest } from "../quests/quest.store";
import { showToast } from "../../components/Toast/toast.store";
import { useShellStore } from "../shell/shell.store";

export type AvatarEditorState = {
  src: string;
  nextStep?: Account["onboardingStep"];
};

/** Owns the avatar crop/upload flow: the editor state, the file readers, the
 *  save-to-account call, and the Enter/Escape keyboard shortcuts. */
export function useAvatarEditor() {
  const setActionMessage = useShellStore((state) => state.setActionMessage);
  const [avatarEditor, setAvatarEditor] = useState<AvatarEditorState | null>(null);
  const [avatarScale, setAvatarScale] = useState(1);

  function closeAvatarEditor() {
    setAvatarEditor(null);
    setAvatarScale(1);
  }

  async function saveAvatar() {
    if (!avatarEditor) {
      return;
    }

    const avatarDataUrl = await cropAvatar(avatarEditor.src, avatarScale);
    const result = await updateAccount({
      avatarDataUrl,
      ...(avatarEditor.nextStep ? { onboardingStep: avatarEditor.nextStep } : {}),
    });

    if (!result.ok) {
      setActionMessage("Avatar could not be saved.");
      return;
    }

    applyAccountResult(result);
    closeAvatarEditor();
    bumpQuest("avatar-set");
    showToast({ variant: "success", title: "Avatar saved" });
  }

  function openAvatarImageFile(file: File | undefined, nextStep?: Account["onboardingStep"]) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setActionMessage("Choose an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarScale(1);
      setAvatarEditor({ src: String(reader.result), nextStep });
    };
    reader.readAsDataURL(file);
  }

  function openAvatarFile(event: ChangeEvent<HTMLInputElement>, nextStep?: Account["onboardingStep"]) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    openAvatarImageFile(file, nextStep);
  }

  useEffect(() => {
    if (!avatarEditor) {
      return;
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAvatarEditor();
      }

      if (event.key === "Enter") {
        event.preventDefault();
        void saveAvatar();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // saveAvatar/closeAvatarEditor are stable enough for this ephemeral listener.
  }, [avatarEditor, avatarScale]);

  return { avatarEditor, avatarScale, setAvatarScale, openAvatarImageFile, openAvatarFile, closeAvatarEditor, saveAvatar };
}
