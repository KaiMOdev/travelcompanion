import { useState, useCallback, useRef } from 'react';
import { startRecording, stopRecording } from '../services/audio';
import { translateAudioStream } from '../services/translate';
import { speak, stop } from '../services/speech';
import { Translation } from '../types';

export function useTranslation() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const recordingRef = useRef(false);

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

      // Add a placeholder translation immediately so the user sees something
      const placeholder: Translation = {
        id,
        originalText: '',
        translatedText: '',
        sourceLang,
        targetLang,
        timestamp: Date.now(),
      };
      setTranslations((prev) => [...prev, placeholder]);

      try {
        const { audio, mimeType } = await stopRecording();

        await translateAudioStream(
          audio,
          sourceLang,
          targetLang,
          mimeType,
          (partial) => {
            // Update the placeholder with streaming partial results
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

        // Speak the final translation
        setTranslations((prev) => {
          const final = prev.find((t) => t.id === id);
          if (final && final.translatedText) {
            speakTranslation(final.translatedText, targetLang, id);
          }
          return prev;
        });
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
  };
}
