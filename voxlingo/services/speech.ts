import * as Speech from 'expo-speech';

const LANG_MAP: Record<string, string> = {
  zh: 'zh-CN',
  tl: 'fil',
  no: 'nb',
};

export function toBcp47(langCode: string): string {
  return LANG_MAP[langCode] || langCode;
}

type SpeakOptions = {
  onDone?: () => void;
};

export function speak(text: string, langCode: string, options?: SpeakOptions): void {
  try {
    Speech.speak(text, {
      language: toBcp47(langCode),
      onDone: options?.onDone,
      onError: () => {
        // Silently fail — translation text is still visible
        options?.onDone?.();
      },
    });
  } catch {
    // expo-speech not available — silently fail
    options?.onDone?.();
  }
}

export function stop(): void {
  try {
    Speech.stop();
  } catch {
    // Silently fail
  }
}
