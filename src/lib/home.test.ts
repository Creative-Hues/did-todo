import { describe, expect, it } from 'vitest';
import { buildHomeSections, sortSectionByOrder } from './home';
import type { CompletionRecord, Cycle, Task } from './types';

/** 2026年のローカル時刻を作る(month は 1〜12) */
function at(month: number, day: number, hour = 12, minute = 0): Date {
  return new Date(2026, month - 1, day, hour, minute);
}

function task(id: string, cycle: Cycle, order: number, hidden = false): Task {
  return { id, name: id, cycle, careAlterIds: [], hidden, order, createdAt: at(9, 1).toISOString() };
}

function record(taskId: string, completedAt: Date): CompletionRecord {
  return { id: `r-${taskId}-${completedAt.getTime()}`, taskId, alterId: null, completedAt: completedAt.toISOString() };
}

const now = at(9, 25, 20);

describe('ホーム画面の欄', () => {
  it('毎日・○日ごとは今日、毎週は今週、毎月は今月に入る', () => {
    const tasks = [
      task('monthly', { type: 'monthly' }, 0),
      task('weekly', { type: 'weekly' }, 1),
      task('daily', { type: 'daily' }, 2),
      task('every', { type: 'everyNDays', n: 3 }, 3),
    ];
    const sections = buildHomeSections(tasks, [], now);
    expect(sections.map((s) => [s.key, s.title, s.items.map((i) => i.task.id)])).toEqual([
      ['today', '今日', ['daily', 'every']],
      ['week', '今週', ['weekly']],
      ['month', '今月', ['monthly']],
    ]);
  });

  it('○日ごとは「お休み」なら出さず、今日完了したものは出す', () => {
    const tasks = [task('rest', { type: 'everyNDays', n: 3 }, 0), task('doneToday', { type: 'everyNDays', n: 3 }, 1)];
    const records = [record('rest', at(9, 24)), record('doneToday', at(9, 25, 9))];
    const [today] = buildHomeSections(tasks, records, now);
    expect(today.items.map((i) => [i.task.id, i.status])).toEqual([['doneToday', 'done']]);
  });

  it('非表示のタスクは出さない', () => {
    const tasks = [task('shown', { type: 'daily' }, 0), task('hidden', { type: 'daily' }, 1, true)];
    const [today] = buildHomeSections(tasks, [], now);
    expect(today.items.map((i) => i.task.id)).toEqual(['shown']);
  });

  it('未完了を上、完了を下。それぞれ order 順', () => {
    const tasks = [
      task('doneB', { type: 'daily' }, 3),
      task('todoB', { type: 'daily' }, 2),
      task('doneA', { type: 'daily' }, 1),
      task('todoA', { type: 'daily' }, 0),
    ];
    const records = [record('doneA', at(9, 25, 9)), record('doneB', at(9, 25, 10))];
    const [today] = buildHomeSections(tasks, records, now);
    expect(today.items.map((i) => i.task.id)).toEqual(['todoA', 'todoB', 'doneA', 'doneB']);
  });

  it('完了のときは今の期間の記録が入る', () => {
    const r = record('daily', at(9, 25, 9, 12));
    const [today] = buildHomeSections([task('daily', { type: 'daily' }, 0)], [r], now);
    expect(today.items[0].currentRecord).toEqual(r);
  });

  it('タスクが1つもない欄は返さない', () => {
    expect(buildHomeSections([task('weekly', { type: 'weekly' }, 0)], [], now).map((s) => s.key)).toEqual(['week']);
    expect(buildHomeSections([], [], now)).toEqual([]);
  });

  it('並び替えモードでは、未完了・完了の区別なく order 順に並ぶ', () => {
    const tasks = [
      task('doneB', { type: 'daily' }, 3),
      task('todoB', { type: 'daily' }, 2),
      task('doneA', { type: 'daily' }, 1),
      task('todoA', { type: 'daily' }, 0),
      task('weekly', { type: 'weekly' }, 4),
    ];
    const records = [record('doneA', at(9, 25, 9)), record('doneB', at(9, 25, 10))];
    const [today] = buildHomeSections(tasks, records, now);
    const sorted = sortSectionByOrder(today);
    expect(sorted.items.map((i) => [i.task.id, i.status])).toEqual([
      ['todoA', 'todo'],
      ['doneA', 'done'],
      ['todoB', 'todo'],
      ['doneB', 'done'],
    ]);
    // 元の欄は書き換えない
    expect(today.items.map((i) => i.task.id)).toEqual(['todoA', 'todoB', 'doneA', 'doneB']);
  });

  it('削除したタスクの記録が残っていても、ほかのタスクの表示に影響しない', () => {
    const records = [record('deleted', at(9, 25, 9))];
    const [today] = buildHomeSections([task('daily', { type: 'daily' }, 0)], records, now);
    expect(today.items.map((i) => [i.task.id, i.status])).toEqual([['daily', 'todo']]);
  });
});
