import { useState } from "react";
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

  const addTranslation = (_translation: Translation) => {
    // TODO: Implement in Travel Mode task
    setState((prev) => ({ ...prev }));
  };

  const clearTranslations = () => {
    setState({ translations: [], isTranslating: false, error: null });
  };

  return {
    translations: state.translations,
    isTranslating: state.isTranslating,
    error: state.error,
    addTranslation,
    clearTranslations,
  };
}
