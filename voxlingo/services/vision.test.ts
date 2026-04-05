jest.mock('expo-constants', () => ({
  expoConfig: { hostUri: 'localhost:8081' },
  manifest2: null,
}));

import { translateImage } from './vision';

global.fetch = jest.fn();

describe('translateImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends image to backend and returns vision response', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        detectedLanguage: 'Spanish',
        originalText: 'Hola mundo',
        translatedText: 'Hello world',
      }),
    });

    const result = await translateImage('base64img', 'en');

    expect(result).toEqual({
      detectedLanguage: 'Spanish',
      originalText: 'Hola mundo',
      translatedText: 'Hello world',
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/vision'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: 'base64img', targetLang: 'en' }),
      }),
    );
  });

  it('throws on non-ok response', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Vision failed' }),
    });

    await expect(translateImage('base64img', 'en')).rejects.toThrow('Vision failed');
  });

  it('throws on network failure', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network request failed'));

    await expect(translateImage('base64img', 'en')).rejects.toThrow(
      'Could not connect to translation server',
    );
  });
});
