import { useState, useCallback } from "react";
import { Translation, LanguageCode } from "../types";

export interface TranslationState {
  translations: Translation[];
  isTranslating: boolean;
  error: string | null;
}

export function useTranslation(
  _sourceLang: LanguageCode,
  _targetLang: LanguageCode
) {
  const [state, setState] = useState<TranslationState>({
    translations: [],
    isTranslating: false,
    error: null,
  });

  const addTranslation = useCallback((translation: Translation) => {
    setState((prev) => ({
      ...prev,
      translations: [...prev.translations, translation],
    }));
  }, []);

  const clearTranslations = useCallback(() => {
    setState({ translations: [], isTranslating: false, error: null });
  }, []);

  const setTranslating = useCallback((isTranslating: boolean) => {
    setState((prev) => ({ ...prev, isTranslating }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  return {
    translations: state.translations,
    isTranslating: state.isTranslating,
    error: state.error,
    addTranslation,
    clearTranslations,
    setTranslating,
    setError,
  };
}
