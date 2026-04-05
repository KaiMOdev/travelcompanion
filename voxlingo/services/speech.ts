import * as Speech from 'expo-speech';

const LANG_MAP: Record<string, string> = {
  zh: 'zh-CN',
  tl: 'fil',
  no: 'nb',
};

export function toBcp47(langCode: string): string {
  return LANG_MAP[langCode] || langCode;
}

let slowMode = false;

export function setSlowMode(slow: boolean): void {
  slowMode = slow;
}

export function getSlowMode(): boolean {
  return slowMode;
}

type SpeakOptions = {
  onDone?: () => void;
};

export function speak(text: string, langCode: string, options?: SpeakOptions): void {
  try {
    Speech.speak(text, {
      language: toBcp47(langCode),
      rate: slowMode ? 0.6 : 1.0,
      onDone: options?.onDone,
      onError: () => {
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
