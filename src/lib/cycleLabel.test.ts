import { describe, expect, it } from 'vitest';
import { cycleLabel } from './cycleLabel';

describe('周期の表示', () => {
  it('4種類の周期を日本語で表示する', () => {
    expect(cycleLabel({ type: 'daily' })).toBe('毎日');
    expect(cycleLabel({ type: 'everyNDays', n: 3 })).toBe('3日ごと');
    expect(cycleLabel({ type: 'weekly' })).toBe('毎週');
    expect(cycleLabel({ type: 'monthly' })).toBe('毎月');
  });
});
