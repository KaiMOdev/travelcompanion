import { useReducer, useCallback } from "react";
import { Translation, LanguageCode } from "../types";

export interface TranslationState {
  translations: Translation[];
  isTranslating: boolean;
  error: string | null;
}

type TranslationAction =
  | { type: "ADD_TRANSLATION"; translation: Translation }
  | { type: "UPSERT_TRANSLATION"; translation: Translation }
  | { type: "CLEAR" }
  | { type: "SET_TRANSLATING"; isTranslating: boolean }
  | { type: "SET_ERROR"; error: string | null };

function translationReducer(state: TranslationState, action: TranslationAction): TranslationState {
  switch (action.type) {
    case "ADD_TRANSLATION":
      return { ...state, translations: [...state.translations, action.translation] };
    case "UPSERT_TRANSLATION": {
      const idx = state.translations.findIndex((t) => t.id === action.translation.id);
      if (idx >= 0) {
        const updated = [...state.translations];
        updated[idx] = action.translation;
        return { ...state, translations: updated };
      }
      return { ...state, translations: [...state.translations, action.translation] };
    }
    case "CLEAR":
      return { translations: [], isTranslating: false, error: null };
    case "SET_TRANSLATING":
      return { ...state, isTranslating: action.isTranslating };
    case "SET_ERROR":
      return { ...state, error: action.error };
  }
}

export function useTranslation(
  _sourceLang: LanguageCode,
  _targetLang: LanguageCode
) {
  const [state, dispatch] = useReducer(translationReducer, {
    translations: [],
    isTranslating: false,
    error: null,
  });

  const addTranslation = useCallback((translation: Translation) => {
    dispatch({ type: "ADD_TRANSLATION", translation });
  }, []);

  const upsertTranslation = useCallback((translation: Translation) => {
    dispatch({ type: "UPSERT_TRANSLATION", translation });
  }, []);

  const clearTranslations = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  const setTranslating = useCallback((isTranslating: boolean) => {
    dispatch({ type: "SET_TRANSLATING", isTranslating });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: "SET_ERROR", error });
  }, []);

  return {
    translations: state.translations,
    isTranslating: state.isTranslating,
    error: state.error,
    addTranslation,
    upsertTranslation,
    clearTranslations,
    setTranslating,
    setError,
  };
}
