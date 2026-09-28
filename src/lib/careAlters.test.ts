import { describe, expect, it } from 'vitest';
import { mergeCareAlterIds, resolveCareAlters } from './careAlters';
import { EMPTY_ALTER_PROFILE } from '../db/initialData';
import type { Alter } from './types';

describe('気にしている人格の保存内容', () => {
  it('選択肢にない(非表示の)人格は残し、選ばれた人格と合わせる', () => {
    // hidden は非表示の人格。a, b が選択肢
    expect(mergeCareAlterIds(['hidden', 'a'], ['b'], ['a', 'b'])).toEqual(['hidden', 'b']);
  });

  it('0人にもできる', () => {
    expect(mergeCareAlterIds(['a'], [], ['a', 'b'])).toEqual([]);
  });

  it('重複しない', () => {
    expect(mergeCareAlterIds(['a'], ['a', 'a'], ['a'])).toEqual(['a']);
  });
});

describe('ホーム画面の「気にしている人格」のラベル', () => {
  function alter(id: string, order: number, hidden = false): Alter {
    return { id, name: id, color: '#4a90d9', hidden, order, createdAt: '2026-09-01T00:00:00.000Z', ...EMPTY_ALTER_PROFILE };
  }

  it('非表示の人格も含め、人格の order 順に並べる', () => {
    const alters = [alter('b', 1), alter('hidden', 2, true), alter('a', 0), alter('other', 3)];
    expect(resolveCareAlters(['hidden', 'b', 'a'], alters).map((a) => a.id)).toEqual(['a', 'b', 'hidden']);
  });

  it('見つからないIDは飛ばす', () => {
    expect(resolveCareAlters(['missing', 'a'], [alter('a', 0)]).map((a) => a.id)).toEqual(['a']);
  });
});
