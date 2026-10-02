import { describe, expect, it } from 'vitest';
import { unachieveConfirmMessage } from './bucket';
import { authorHeading, deleteConfirmMessage as clinicDeleteConfirmMessage } from './clinicNotes';
import { DEFAULT_TERM, normalizeTerm, withTerm } from './term';

describe('呼び方(SPEC.md 14章③)', () => {
  it('文の中の「人格」をすべて置き換える', () => {
    expect(withTerm('非表示の人格', 'メンバー')).toBe('非表示のメンバー');
    expect(withTerm('人格情報', 'パーツ')).toBe('パーツ情報');
    expect(withTerm('この人格のために人格が', 'オルター')).toBe('このオルターのためにオルターが');
    expect(withTerm('人格を追加', DEFAULT_TERM)).toBe('人格を追加');
    expect(withTerm('ToDo', 'メンバー')).toBe('ToDo');
  });

  it('入力は前後の空白を取り除き、1〜10文字だけ受け付ける', () => {
    expect(normalizeTerm('  メンバー ')).toBe('メンバー');
    expect(normalizeTerm('')).toBeNull();
    expect(normalizeTerm('   ')).toBeNull();
    expect(normalizeTerm('あいうえおかきくけこ')).toBe('あいうえおかきくけこ');
    expect(normalizeTerm('あいうえおかきくけこさ')).toBeNull();
  });
});

describe('呼び方を入れた文で、利用者が付けた名前は変えない(SPEC.md 14章③)', () => {
  const named = {
    id: 'a',
    name: '人格A',
    color: '#123456',
    hidden: false,
    order: 0,
    createdAt: '',
    reading: '',
    categoryId: null,
    age: '',
    gender: '',
    identify: '',
  };
  const alterById = new Map([['a', named]]);

  it('受診メモの見出しと削除の確認文', () => {
    expect(authorHeading('a', 'メモ', alterById, 'メンバー').text).toBe('人格Aが書いたメモ');
    expect(authorHeading(null, 'メモ', alterById, 'メンバー').text).toBe('書いたメンバー:わからない');
    expect(clinicDeleteConfirmMessage('a', 'メモ', alterById, 0, 'メンバー')).toBe('人格Aが書いたメモを削除しますか?');
    expect(clinicDeleteConfirmMessage(null, 'コメント', alterById, 0, 'メンバー')).toBe(
      '書いたメンバーがわからないコメントを削除しますか?',
    );
  });

  it('バケットの「まだ」に戻す確認文', () => {
    const message = unachieveConfirmMessage('人格A', 'パーツ');
    expect(message.startsWith('これは人格Aのリストです。')).toBe(true);
    expect(message.endsWith('協力してくれたパーツの記録は消えます。')).toBe(true);
  });
});
