import { LanguageCode } from "../types";

export interface GeminiStreamCallbacks {
  onTranslatedAudio: (audioBase64: string) => void;
  onTranslatedText: (text: string) => void;
  onError: (error: Error) => void;
}

export function connectToGeminiLive(
  _sourceLang: LanguageCode,
  _targetLang: LanguageCode,
  _callbacks: GeminiStreamCallbacks
): { sendAudio: (chunk: ArrayBuffer) => void; disconnect: () => void } {
  // TODO: Implement in Travel Mode task
  return {
    sendAudio: () => {},
    disconnect: () => {},
  };
}
