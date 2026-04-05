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
let speaking = false;

export function setSlowMode(slow: boolean): void {
  slowMode = slow;
}

export function getSlowMode(): boolean {
  return slowMode;
}

export function isSpeaking(): boolean {
  return speaking;
}

type SpeakOptions = {
  onDone?: () => void;
};

export function speak(text: string, langCode: string, options?: SpeakOptions): void {
  try {
    speaking = true;
    Speech.speak(text, {
      language: toBcp47(langCode),
      rate: slowMode ? 0.6 : 1.0,
      onDone: () => {
        speaking = false;
        options?.onDone?.();
      },
      onStopped: () => {
        speaking = false;
        options?.onDone?.();
      },
      onError: () => {
        speaking = false;
        options?.onDone?.();
      },
    });
  } catch {
    speaking = false;
    options?.onDone?.();
  }
}

export async function stop(): Promise<void> {
  try {
    const isSpeakingNow = await Speech.isSpeakingAsync();
    if (!isSpeakingNow) {
      speaking = false;
      return;
    }
    Speech.stop();
    // Wait for iOS audio session to fully release
    await new Promise((r) => setTimeout(r, 300));
  } catch {
    // Silently fail
  }
  speaking = false;
}
