// @ts-expect-error __DEV__ is a React Native global
globalThis.__DEV__ = true;

jest.mock('expo-constants', () => ({
  expoConfig: { hostUri: 'localhost:8081' },
  manifest2: null,
}));

import { fetchExplorePlaces } from './explore';

global.fetch = jest.fn();

describe('fetchExplorePlaces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and returns explore places', async () => {
    const mockPlaces = [
      {
        name: 'Fuunji',
        localName: '風雲児',
        description: 'Famous tsukemen shop.',
        whySpecial: 'Best broth in Shinjuku.',
        vibeTags: ['casual'],
        phrases: [],
      },
    ];

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockPlaces,
    });

    const result = await fetchExplorePlaces('JP', 'street-food');

    expect(result).toEqual(mockPlaces);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/destination/JP/explore/street-food'),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('throws on non-ok response', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid country code' }),
    });

    await expect(fetchExplorePlaces('XX', 'street-food')).rejects.toThrow('Invalid country code');
  });
});
