import { UserRound } from "lucide-react";
import { Button, SelectControl } from "../../components/Button/Button";
import { useThemeStore } from "../themes/theme.store";
import { themeModeLabels, themeModes, themes } from "../themes/themes";
import { useAccountStore } from "../profile/account.store";

/**
 * Theme + variant pickers, plus the account entry point. Sign-out and
 * create-account flows live in the shell, so they arrive as callbacks.
 */
export function SettingsPanel({ onCreateAccount, onSignOut }: { onCreateAccount: () => void; onSignOut: () => void }) {
  const activeTheme = useThemeStore((state) => state.activeTheme);
  const setActiveTheme = useThemeStore((state) => state.setActiveTheme);
  const account = useAccountStore((state) => state.account);

  return (
    <section className="content-panel">
      <h3>Settings</h3>
      <label>
        Theme
        <SelectControl
          ariaLabel="Theme"
          getOptionLabel={(themeId) => themes.find((theme) => theme.id === themeId)?.label ?? themeId}
          onChange={(themeId) => setActiveTheme({ ...activeTheme, themeId: themeId as typeof activeTheme.themeId })}
          options={themes.map((theme) => theme.id)}
          value={activeTheme.themeId}
        />
      </label>
      <label>
        Variant
        <SelectControl
          ariaLabel="Variant"
          getOptionLabel={(mode) => themeModeLabels[mode]}
          onChange={(mode) => setActiveTheme({ ...activeTheme, mode })}
          options={themeModes}
          value={activeTheme.mode}
        />
      </label>
      {account ? (
        <Button onClick={onSignOut} type="button" variant="ghost">
          Sign out
        </Button>
      ) : (
        <Button onClick={onCreateAccount} type="button" variant="secondary">
          <UserRound size={16} />
          Create account
        </Button>
      )}
    </section>
  );
}
