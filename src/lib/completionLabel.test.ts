import { describe, expect, it } from 'vitest';
import { completionLabelText, toCompletionLabel } from './completionLabel';
import type { Alter, CompletionRecord } from './types';

const kairi: Alter = {
  id: 'kairi',
  name: '人格A',
  color: '#4a90d9',
  hidden: true, // 非表示の人格でも名前と色で出る
  order: 0,
  createdAt: '2026-09-01T00:00:00.000Z',
};
const alterById = new Map([[kairi.id, kairi]]);

function record(alterId: string | null): CompletionRecord {
  // 2026/9/23(水)9:12
  return { id: 'r1', taskId: 't1', alterId, completedAt: new Date(2026, 8, 23, 9, 12).toISOString() };
}

describe('完了の表示内容', () => {
  it('人格の名前・色と、欄に合わせた時刻', () => {
    const label = toCompletionLabel(record('kairi'), 'week', alterById);
    expect(label).toEqual({ name: '人格A', color: '#4a90d9', time: '水 9:12' });
    expect(completionLabelText(label)).toBe('人格A・水 9:12');
  });

  it('「わからない」の場合', () => {
    const label = toCompletionLabel(record(null), 'today', alterById);
    expect(label).toEqual({ name: 'わからない', color: null, time: '9:12' });
    expect(completionLabelText(label)).toBe('わからない・9:12');
  });
});
