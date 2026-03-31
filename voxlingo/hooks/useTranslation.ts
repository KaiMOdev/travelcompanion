import { useState, useCallback, useRef } from 'react';
import { startRecording, stopRecording } from '../services/audio';
import { translateAudio } from '../services/translate';
import { Translation } from '../types';

export function useTranslation() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef(false);

  const toggleRecord = useCallback(
    async (sourceLang: string, targetLang: string) => {
      setError(null);

      if (!recordingRef.current) {
        // Start recording
        try {
          await startRecording();
          recordingRef.current = true;
          setIsRecording(true);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to start recording';
          setError(msg);
        }
      } else {
        // Stop recording and translate
        recordingRef.current = false;
        setIsRecording(false);
        setIsTranslating(true);

        try {
          const audio = await stopRecording();
          const result = await translateAudio(audio, sourceLang, targetLang);

          const translation: Translation = {
            id: Date.now().toString(),
            originalText: result.originalText,
            translatedText: result.translatedText,
            sourceLang,
            targetLang,
            timestamp: Date.now(),
          };

          setTranslations((prev) => [...prev, translation]);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Translation failed';
          setError(msg);
        } finally {
          setIsTranslating(false);
        }
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    isRecording,
    isTranslating,
    translations,
    error,
    toggleRecord,
    clearError,
  };
}
