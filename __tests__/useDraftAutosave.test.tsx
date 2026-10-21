/* eslint-env jest */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook } from '@testing-library/react-native';
import { useDraftAutosave } from '../src/hooks/useDraftAutosave';

describe('useDraftAutosave', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (AsyncStorage.setItem as jest.Mock).mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('keeps a single interval while the draft changes and saves the latest values', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const { rerender } = renderHook(({ draft }) => useDraftAutosave('k', draft, 30000), {
      initialProps: { draft: { description: '' } },
    });
    ['a', 'ab', 'abc', 'abcd', 'abcde'].forEach(description => rerender({ draft: { description } }));

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(30000);
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('k', JSON.stringify({ description: 'abcde' }));
  });

  it('saves during continuous edits (an interval reset on every change would never fire)', () => {
    const { rerender } = renderHook(({ draft }) => useDraftAutosave('k', draft, 30000), {
      initialProps: { draft: { n: 0 } },
    });
    for (let i = 1; i <= 7; i++) {
      jest.advanceTimersByTime(5000);
      rerender({ draft: { n: i } });
    }
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('stops saving after unmount', () => {
    const { unmount } = renderHook(() => useDraftAutosave('k', { a: 1 }, 30000));
    unmount();
    jest.advanceTimersByTime(60000);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
