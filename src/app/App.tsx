import { ChatPage } from "../features/chat/ChatPage";
import { ThemeProvider } from "../features/themes/ThemeProvider";
import { Toaster } from "../components/Toast/Toaster";
import { RewardReveal } from "../features/rewards/RewardReveal";
import { BoosterPuzzle } from "../features/rewards/BoosterPuzzle";
import { CreditComboToast } from "../features/rewards/CreditComboToast";
import { QuestToast } from "../features/quests/QuestToast";

export function App() {
  return (
    <ThemeProvider>
      <ChatPage />
      <Toaster />
      <RewardReveal />
      <BoosterPuzzle />
      <CreditComboToast />
      <QuestToast />
    </ThemeProvider>
  );
}
