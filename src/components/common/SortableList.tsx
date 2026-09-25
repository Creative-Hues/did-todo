// ≡(つまみ)をドラッグして並び替える一覧(設定画面とホーム画面で共通)
// ドラッグの処理には dnd-kit(ビルド時にアプリへ同梱されるライブラリ。外部との通信はしない)を使う
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, type ReactNode } from 'react';
import { showSaveError } from '../../lib/showError';

interface Item {
  id: string;
}

interface Props<T extends Item> {
  items: readonly T[];
  /** 並べ替えた後の順番に並んだIDを受け取り、保存する */
  onReorder: (orderedIds: string[]) => Promise<void>;
  /** 1行の中身(≡ の右側) */
  renderItem: (item: T) => ReactNode;
  /** 読み上げ用の項目名 */
  getLabel: (item: T) => string;
  className?: string;
}

/** 縦方向にだけ動かす */
const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/** 保存が終わるまでの仮の並び。元の並び(basisKey)が変わったら使わない */
interface Pending {
  basisKey: string;
  ids: string[];
}

export function SortableList<T extends Item>({ items, onReorder, renderItem, getLabel, className }: Props<T>) {
  const [pending, setPending] = useState<Pending | null>(null);
  const sensors = useSensors(
    // つまみは touch-action: none なので、指が触れたらすぐドラッグを始めてよい
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // 保存が終わってデータが読み直されるまでの間、元の位置に一瞬戻らないように仮の並びを使う
  const basisKey = items.map((item) => item.id).join(',');
  const byId = new Map(items.map((item) => [item.id, item]));
  const displayed =
    pending && pending.basisKey === basisKey
      ? pending.ids.flatMap((id) => {
          const item = byId.get(id);
          return item ? [item] : [];
        })
      : items;
  const ids = displayed.map((item) => item.id);

  const labelOf = (id: string | number) => {
    const item = byId.get(String(id));
    return item ? getLabel(item) : '';
  };
  const positionOf = (id: string | number) => ids.indexOf(String(id)) + 1;
  // 読み上げ機能(VoiceOver など)向けの案内文
  const announcements: Announcements = {
    onDragStart: ({ active }) => `「${labelOf(active.id)}」をつかみました`,
    onDragOver: ({ active, over }) => (over ? `「${labelOf(active.id)}」を${positionOf(over.id)}番目に動かしました` : undefined),
    onDragEnd: ({ active, over }) => (over ? `「${labelOf(active.id)}」を${positionOf(over.id)}番目に置きました` : undefined),
    onDragCancel: ({ active }) => `「${labelOf(active.id)}」の並び替えをやめました`,
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setPending({ basisKey, ids: next });
    onReorder(next).catch((error: unknown) => {
      setPending(null);
      showSaveError(error);
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: 'スペースキーでつかみ、矢印キーで動かし、もう一度スペースキーで置きます。Esc キーでやめます。',
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {displayed.map((item) => (
            <SortableRow key={item.id} id={item.id} label={getLabel(item)}>
              {renderItem(item)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

interface RowProps {
  id: string;
  label: string;
  children: ReactNode;
}

function SortableRow({ id, label, children }: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id, attributes: { roleDescription: '並び替えできる項目' } });
  return (
    <li
      ref={setNodeRef}
      className={isDragging ? 'sortable-row sortable-row--dragging' : 'sortable-row'}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {/* ドラッグはこのつまみからだけ始まる */}
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="drag-handle"
        {...attributes}
        {...listeners}
        aria-label={`「${label}」を並び替える`}
      >
        ≡
      </button>
      <div className="sortable-row__body">{children}</div>
    </li>
  );
}
