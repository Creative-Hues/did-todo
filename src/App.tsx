// 画面の切り替え(ホーム ⇔ 設定)
import { useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { SettingsScreen } from './screens/SettingsScreen';

type Screen = 'home' | 'settings';

function App() {
  const [screen, setScreen] = useState<Screen>('home');

  if (screen === 'settings') {
    return <SettingsScreen onBack={() => setScreen('home')} />;
  }
  return <HomeScreen onOpenSettings={() => setScreen('settings')} />;
}

export default App;
