jest.mock('expo-constants', () => ({
  expoConfig: { hostUri: 'localhost:8081' },
  manifest2: null,
}));

import { translateAudio } from './translate';

global.fetch = jest.fn();

describe('translateAudio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends audio to backend and returns translation', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        originalText: 'hello',
        translatedText: 'hola',
      }),
    });

    const result = await translateAudio('dGVzdA==', 'en', 'es');

    expect(result).toEqual({
      originalText: 'hello',
      translatedText: 'hola',
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/translate'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: 'dGVzdA==',
          sourceLang: 'en',
          targetLang: 'es',
        }),
      }),
    );
  });

  it('throws on non-ok response', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    });

    await expect(translateAudio('dGVzdA==', 'en', 'es')).rejects.toThrow('Server error');
  });

  it('throws on network failure', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network request failed'));

    await expect(translateAudio('dGVzdA==', 'en', 'es')).rejects.toThrow(
      'Could not connect to translation server',
    );
  });
});
