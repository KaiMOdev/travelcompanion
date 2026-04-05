import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { startRecording, stopRecording } from '../services/audio';
import { translateAudio, translateAudioStream } from '../services/translate';
import { speak, stop } from '../services/speech';
import { Translation } from '../types';

export function useTranslation() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const recordingRef = useRef(false);
  const recordStartTime = useRef(0);

  const speakTranslation = useCallback((text: string, langCode: string, id: string) => {
    void stop().then(() => {
      setSpeakingId(id);
      speak(text, langCode, {
        onDone: () => setSpeakingId((current) => (current === id ? null : current)),
      });
    });
  }, []);

  const startRecord = useCallback(async () => {
    if (recordingRef.current) return;
    setError(null);
    // Stop any TTS playback and wait for audio session to release
    await stop();
    setSpeakingId(null);
    try {
      await startRecording();
      recordingRef.current = true;
      recordStartTime.current = Date.now();
      setIsRecording(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start recording';
      setError(msg);
    }
  }, []);

  const stopRecord = useCallback(
    async (sourceLang: string, targetLang: string) => {
      if (!recordingRef.current) return;
      recordingRef.current = false;
      setIsRecording(false);
      setIsTranslating(true);

      const id = Date.now().toString();

      // Add a placeholder immediately so the user sees activity
      const placeholder: Translation = {
        id,
        originalText: 'Listening...',
        translatedText: '',
        sourceLang,
        targetLang,
        timestamp: Date.now(),
      };
      setTranslations((prev) => [...prev, placeholder]);

      try {
        const { audio, mimeType } = await stopRecording();

        // Discard recordings shorter than 1 second — accidental taps
        const recordingDuration = Date.now() - recordStartTime.current;
        if (recordingDuration < 1000) {
          setTranslations((prev) => prev.filter((t) => t.id !== id));
          setIsTranslating(false);
          return;
        }

        // Update placeholder to show we're now translating
        setTranslations((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, originalText: 'Translating...' } : t,
          ),
        );

        let finalResult: { originalText: string; translatedText: string; noSpeechDetected?: boolean };

        if (Platform.OS === 'web') {
          // Web supports ReadableStream — use streaming for progressive updates
          finalResult = await translateAudioStream(
            audio,
            sourceLang,
            targetLang,
            mimeType,
            (partial) => {
              setTranslations((prev) =>
                prev.map((t) =>
                  t.id === id
                    ? {
                        ...t,
                        originalText: partial.originalText || t.originalText,
                        translatedText: partial.translatedText || t.translatedText,
                      }
                    : t,
                ),
              );
            },
          );
        } else {
          // Mobile: single call — 1 Gemini request instead of 2, ~2x faster
          finalResult = await translateAudio(audio, sourceLang, targetLang, mimeType);
          setTranslations((prev) =>
            prev.map((t) =>
              t.id === id
                ? { ...t, originalText: finalResult.originalText, translatedText: finalResult.translatedText }
                : t,
            ),
          );
        }

        // If no speech was detected, remove the placeholder silently
        if (finalResult.noSpeechDetected || !finalResult.originalText?.trim()) {
          setTranslations((prev) => prev.filter((t) => t.id !== id));
          setIsTranslating(false);
          return;
        }

        // Speak the final translation
        if (finalResult.translatedText) {
          speakTranslation(finalResult.translatedText, targetLang, id);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Translation failed';
        setError(msg);
        // Remove the empty placeholder on error
        setTranslations((prev) => prev.filter((t) => t.id !== id || t.translatedText));
      } finally {
        setIsTranslating(false);
      }
    },
    [speakTranslation],
  );

  const replay = useCallback(
    (id: string) => {
      const translation = translations.find((t) => t.id === id);
      if (translation) {
        speakTranslation(translation.translatedText, translation.targetLang, id);
      }
    },
    [translations, speakTranslation],
  );

  const clearError = useCallback(() => setError(null), []);
  const clearTranslations = useCallback(() => setTranslations([]), []);

  return {
    isRecording,
    isTranslating,
    translations,
    error,
    speakingId,
    startRecord,
    stopRecord,
    replay,
    clearError,
    clearTranslations,
  };
}
