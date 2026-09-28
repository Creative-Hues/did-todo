// 画面の切り替え(SPEC.md 5章):画面下のタブバーで5つのタブを切り替える
// タブを切り替えて戻ったとき、前に開いていた画面・スクロール位置・入力中の内容がそのまま残るよう、
// 5つのタブの画面は作ったままにして、今のタブ以外は隠しておく
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
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
  // タブごとのスクロール位置(ページのスクロールは全タブで共通なので、切り替えのたびに覚えて戻す)
  const scrollByTab = useRef<Partial<Record<TabKey, number>>>({});

  // タブを切り替えたら、そのタブで前に見ていた位置に戻す(初めてなら一番上)
  useLayoutEffect(() => {
    window.scrollTo(0, scrollByTab.current[tab] ?? 0);
  }, [tab]);

  // 今のタブを押したときは何もしない(入力の途中の内容を誤って消さないため)
  const handleSelectTab = (next: TabKey) => {
    if (next === tab) {
      return;
    }
    scrollByTab.current[tab] = window.scrollY;
    setTab(next);
  };

  const panels: Record<TabKey, ReactNode> = {
    todo:
      todoView === 'taskSettings' ? (
        <TaskSettingsScreen onBack={() => setTodoView('home')} />
      ) : (
        <HomeScreen onOpenTaskSettings={() => setTodoView('taskSettings')} />
      ),
    medication: <PlaceholderScreen title="服薬" />,
    clinic: <PlaceholderScreen title="受診メモ" />,
    bucket: <PlaceholderScreen title="バケット" />,
    alters: <AlterInfoScreen />,
  };

  return (
    <>
      {(Object.keys(panels) as TabKey[]).map((key) => (
        <div key={key} hidden={key !== tab}>
          {panels[key]}
        </div>
      ))}
      <TabBar current={tab} onSelect={handleSelectTab} />
    </>
  );
}

export default App;
