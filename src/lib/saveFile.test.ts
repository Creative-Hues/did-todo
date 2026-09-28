import { describe, expect, it, vi } from 'vitest';
import { isMobileDevice, saveFile, type SaveFileDeps } from './saveFile';

/** 偽物の保存機能。呼ばれたかどうかを記録する */
function fakeDeps(overrides: Partial<SaveFileDeps<string>>): SaveFileDeps<string> {
  return {
    preferShare: true,
    canShare: () => true,
    share: vi.fn(async () => {}),
    download: vi.fn(),
    ...overrides,
  };
}

function namedError(name: string): Error {
  const error = new Error(name);
  error.name = name;
  return error;
}

describe('ファイルの保存', () => {
  it('スマホで共有できたら、ダウンロードしない', async () => {
    const deps = fakeDeps({});
    expect(await saveFile('file', deps)).toBe('shared');
    expect(deps.share).toHaveBeenCalledWith('file');
    expect(deps.download).not.toHaveBeenCalled();
  });

  it('共有シートをキャンセルしたら、ダウンロードせずに何もしない', async () => {
    const deps = fakeDeps({ share: vi.fn(async () => Promise.reject(namedError('AbortError'))) });
    expect(await saveFile('file', deps)).toBe('cancelled');
    expect(deps.download).not.toHaveBeenCalled();
  });

  it('共有がエラーになったら(Chrome の NotAllowedError など)、ダウンロードする', async () => {
    const deps = fakeDeps({ share: vi.fn(async () => Promise.reject(namedError('NotAllowedError'))) });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await saveFile('file', deps)).toBe('downloaded');
    expect(deps.download).toHaveBeenCalledWith('file');
  });

  it('共有が使えなければ、ダウンロードする', async () => {
    const deps = fakeDeps({ canShare: () => false });
    expect(await saveFile('file', deps)).toBe('downloaded');
    expect(deps.share).not.toHaveBeenCalled();
    expect(deps.download).toHaveBeenCalledWith('file');
  });

  it('PC では共有を試さず、ダウンロードする', async () => {
    const deps = fakeDeps({ preferShare: false });
    expect(await saveFile('file', deps)).toBe('downloaded');
    expect(deps.share).not.toHaveBeenCalled();
  });

  it('ダウンロードに失敗したら、エラーを投げる(書き出し済みとして記録させない)', async () => {
    const deps = fakeDeps({
      preferShare: false,
      download: () => {
        throw new Error('失敗');
      },
    });
    await expect(saveFile('file', deps)).rejects.toThrow('失敗');
  });
});

describe('スマホ・タブレットかの判断', () => {
  it('iPhone・Android はスマホ扱い', () => {
    expect(isMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5)).toBe(true);
    expect(isMobileDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 5)).toBe(true);
  });

  it('PC 向け表示の iPad は、タッチ点の数でタブレット扱い', () => {
    expect(isMobileDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true);
  });

  it('Windows・Mac の PC は PC 扱い', () => {
    expect(isMobileDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0)).toBe(false);
    expect(isMobileDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false);
  });
});
