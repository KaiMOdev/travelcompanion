import { renderHook, act } from '@testing-library/react-native';
import { useTranslation } from './useTranslation';

jest.mock('../services/audio', () => ({
  startRecording: jest.fn().mockResolvedValue(undefined),
  stopRecording: jest.fn().mockResolvedValue({ audio: 'base64audio', mimeType: 'audio/mp4' }),
}));

jest.mock('../services/translate', () => ({
  translateAudio: jest.fn().mockResolvedValue({
    originalText: 'hello',
    translatedText: 'hola',
  }),
}));

jest.mock('../services/speech', () => ({ speak: jest.fn(), stop: jest.fn() }));

describe('useTranslation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in idle state with empty translations', () => {
    const { result } = renderHook(() => useTranslation());

    expect(result.current.isRecording).toBe(false);
    expect(result.current.isTranslating).toBe(false);
    expect(result.current.translations).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('toggleRecord starts and stops recording, then translates', async () => {
    const { result } = renderHook(() => useTranslation());

    // Start recording
    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });
    expect(result.current.isRecording).toBe(true);

    // Stop recording — triggers translation
    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.translations).toHaveLength(1);
    expect(result.current.translations[0].originalText).toBe('hello');
    expect(result.current.translations[0].translatedText).toBe('hola');
  });

  it('sets error when translation fails', async () => {
    const { translateAudio } = require('../services/translate');
    translateAudio.mockRejectedValueOnce(new Error('API error'));

    const { result } = renderHook(() => useTranslation());

    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });
    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });

    expect(result.current.error).toBe('API error');
    expect(result.current.translations).toHaveLength(0);
  });

  it('auto-speaks translation after it arrives', async () => {
    const { speak } = require('../services/speech');
    const { result } = renderHook(() => useTranslation());

    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });
    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });

    expect(speak).toHaveBeenCalledWith('hola', 'es', { onDone: expect.any(Function) });
    expect(result.current.speakingId).toBe(result.current.translations[0].id);
  });

  it('replay stops current speech and speaks the requested translation', async () => {
    const { speak, stop } = require('../services/speech');
    const { result } = renderHook(() => useTranslation());

    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });
    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });

    const translationId = result.current.translations[0].id;

    await act(async () => {
      result.current.replay(translationId);
    });

    expect(stop).toHaveBeenCalled();
    expect(speak).toHaveBeenLastCalledWith('hola', 'es', { onDone: expect.any(Function) });
    expect(result.current.speakingId).toBe(translationId);
  });

  it('clears speakingId when speech finishes', async () => {
    const { speak } = require('../services/speech');
    speak.mockImplementation((_text: string, _lang: string, opts: { onDone?: () => void }) => {
      opts?.onDone?.();
    });

    const { result } = renderHook(() => useTranslation());

    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });
    await act(async () => {
      await result.current.toggleRecord('en', 'es');
    });

    expect(result.current.speakingId).toBeNull();
  });
});
