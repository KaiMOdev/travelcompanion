jest.mock('expo-constants', () => ({
  expoConfig: { hostUri: 'localhost:8081' },
  manifest2: null,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/explore', () => ({
  fetchExplorePlaces: jest.fn(),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useExplore } from './useExplore';
import { fetchExplorePlaces } from '../services/explore';

const mockFetch = fetchExplorePlaces as jest.MockedFunction<typeof fetchExplorePlaces>;

const mockPlaces = Array.from({ length: 15 }, (_, i) => ({
  name: `Place ${i + 1}`,
  localName: `ローカル ${i + 1}`,
  description: `Description ${i + 1}`,
  whySpecial: `Special ${i + 1}`,
  vibeTags: ['casual'],
  phrases: [{ english: 'Hello', local: 'こんにちは' }],
}));

describe('useExplore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty when no destination', () => {
    const { result } = renderHook(() => useExplore(null, 'street-food'));
    expect(result.current.places).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns empty when no category', () => {
    const { result } = renderHook(() => useExplore('JP', null));
    expect(result.current.places).toEqual([]);
  });

  it('fetches and paginates places', async () => {
    mockFetch.mockResolvedValue(mockPlaces);

    const { result } = renderHook(() => useExplore('JP', 'street-food'));

    await waitFor(() => {
      expect(result.current.places.length).toBe(10);
    });

    expect(result.current.total).toBe(15);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.page).toBe(1);

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.page).toBe(2);
    expect(result.current.places.length).toBe(5);
  });

  it('sets error on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useExplore('JP', 'street-food'));

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });

    expect(result.current.isLoading).toBe(false);
  });
});
