import { useState, useCallback, useRef } from 'react';
import { startRecording, stopRecording } from '../services/audio';
import { translateAudio } from '../services/translate';
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
    stop();
    setSpeakingId(id);
    speak(text, langCode, {
      onDone: () => setSpeakingId(null),
    });
  }, []);

  const toggleRecord = useCallback(
    async (sourceLang: string, targetLang: string) => {
      setError(null);

      if (!recordingRef.current) {
        try {
          await startRecording();
          recordingRef.current = true;
          setIsRecording(true);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to start recording';
          setError(msg);
        }
      } else {
        recordingRef.current = false;
        setIsRecording(false);
        setIsTranslating(true);

        try {
          const { audio, mimeType } = await stopRecording();
          const result = await translateAudio(audio, sourceLang, targetLang, mimeType);

          const translation: Translation = {
            id: Date.now().toString(),
            originalText: result.originalText,
            translatedText: result.translatedText,
            sourceLang,
            targetLang,
            timestamp: Date.now(),
          };

          setTranslations((prev) => [...prev, translation]);
          speakTranslation(result.translatedText, targetLang, translation.id);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Translation failed';
          setError(msg);
        } finally {
          setIsTranslating(false);
        }
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
    toggleRecord,
    replay,
    clearError,
  };
}
