import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDraftAutosave } from '../src/hooks/useDraftAutosave';

describe('useDraftAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('keeps a single interval while the draft changes and saves the latest values', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const { rerender } = renderHook(({ draft }) => useDraftAutosave('k', draft, 30000), {
      initialProps: { draft: { description: '' } },
    });
    ['a', 'ab', 'abc', 'abcd', 'abcde'].forEach((description) => rerender({ draft: { description } }));

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('k')).toBeNull();

    vi.advanceTimersByTime(30000);
    expect(localStorage.getItem('k')).toBe(JSON.stringify({ description: 'abcde' }));
  });

  it('saves during continuous edits (an interval reset on every change would never fire)', () => {
    const { rerender } = renderHook(({ draft }) => useDraftAutosave('k', draft, 30000), {
      initialProps: { draft: { n: 0 } },
    });
    for (let i = 1; i <= 7; i++) {
      vi.advanceTimersByTime(5000);
      rerender({ draft: { n: i } });
    }
    expect(JSON.parse(localStorage.getItem('k')!)).toEqual({ n: 5 });
  });

  it('stops saving after unmount', () => {
    const { unmount } = renderHook(() => useDraftAutosave('k', { a: 1 }, 30000));
    unmount();
    vi.advanceTimersByTime(60000);
    expect(localStorage.getItem('k')).toBeNull();
  });
});
