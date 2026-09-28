// 画面の切り替え(SPEC.md 5章):画面下のタブバーで5つのタブを切り替える
import { useLayoutEffect, useState } from 'react';
import { TabBar, type TabKey } from './components/common/TabBar';
import { AlterInfoScreen } from './screens/AlterInfoScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen';
import { TaskSettingsScreen } from './screens/TaskSettingsScreen';

/** ToDo タブの中の画面:ToDo 画面 / タスク設定 */
type TodoView = 'home' | 'taskSettings';

function App() {
  const [tab, setTab] = useState<TabKey>('todo');
  const [todoView, setTodoView] = useState<TodoView>('home');

  // タブを切り替えたら、画面の一番上から表示する
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  // ほかのタブを押したら、そのタブの最初の画面を出す。
  // 今のタブを押したときは何もしない(入力の途中の内容を誤って消さないため)
  const handleSelectTab = (next: TabKey) => {
    if (next === tab) {
      return;
    }
    setTodoView('home');
    setTab(next);
  };

  const renderTab = () => {
    switch (tab) {
      case 'todo':
        return todoView === 'taskSettings' ? (
          <TaskSettingsScreen onBack={() => setTodoView('home')} />
        ) : (
          <HomeScreen onOpenTaskSettings={() => setTodoView('taskSettings')} />
        );
      case 'medication':
        return <PlaceholderScreen title="服薬" />;
      case 'clinic':
        return <PlaceholderScreen title="受診メモ" />;
      case 'bucket':
        return <PlaceholderScreen title="バケット" />;
      case 'alters':
        return <AlterInfoScreen />;
    }
  };

  return (
    <>
      {/* key でタブごとに画面を作り直し、タブの中の画面の状態を持ち越さない */}
      <div key={tab}>{renderTab()}</div>
      <TabBar current={tab} onSelect={handleSelectTab} />
    </>
  );
}

export default App;
