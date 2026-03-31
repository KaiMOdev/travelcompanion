import { GoogleGenAI, Modality } from "@google/genai";
import { getLanguageNameForPrompt } from "./languageNames";

export interface GeminiSessionCallbacks {
  onTranslatedAudio: (audioBase64: string) => void;
  onTranslatedText: (text: string) => void;
  onInputText: (text: string) => void;
  onError: (error: Error) => void;
}

export class GeminiLiveSession {
  private session: any = null;
  private ai: GoogleGenAI;
  private sourceLang: string;
  private targetLang: string;
  private callbacks: GeminiSessionCallbacks;
  private locationHints?: string;
  private accumulatedInput = "";

  constructor(
    sourceLang: string,
    targetLang: string,
    callbacks: GeminiSessionCallbacks,
    locationHints?: string
  ) {
    this.sourceLang = sourceLang;
    this.targetLang = targetLang;
    this.callbacks = callbacks;
    this.locationHints = locationHints;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(): Promise<void> {
    this.accumulatedInput = "";

    this.session = await this.ai.live.connect({
      model: "gemini-2.5-flash-native-audio-latest",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
        inputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {
          console.log("Gemini Live session opened");
        },
        onmessage: (message: any) => {
          this.handleMessage(message);
        },
        onerror: (e: any) => {
          console.error("[Gemini] onerror:", e?.message || "unknown");
          this.callbacks.onError(new Error(e?.message || "Gemini Live error"));
        },
        onclose: () => {
          console.log("[Gemini] session closed");
          this.session = null;
        },
      },
    });
  }

  private handleMessage(message: any): void {
    const content = message.serverContent;
    if (!content) return;

    // Accumulate input transcription fragments
    if (content.inputTranscription?.text) {
      this.accumulatedInput += content.inputTranscription.text;
      // Send accumulated text to frontend for live display
      this.callbacks.onInputText(this.accumulatedInput);
    }
  }

  sendAudio(pcmBuffer: Buffer): void {
    if (!this.session) return;
    this.session.sendRealtimeInput({
      audio: {
        data: pcmBuffer.toString("base64"),
        mimeType: "audio/pcm;rate=16000",
      },
    });
  }

  // Called when recording stops — translates accumulated text via REST API
  async translateAccumulated(): Promise<void> {
    const text = this.accumulatedInput.trim();
    if (!text) {
      console.log("[Gemini] no accumulated text to translate");
      return;
    }

    const targetName = getLanguageNameForPrompt(this.targetLang);
    const locationContext = this.locationHints
      ? ` The user is currently ${this.locationHints}`
      : "";

    console.log(`[Gemini] translating: "${text}" → ${targetName}`);

    try {
      const result = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [{
            text: `Translate the following text to ${targetName}. Return ONLY the translation, nothing else.${locationContext}\n\n${text}`,
          }],
        }],
      });

      const translation = result.text?.trim();
      if (translation) {
        console.log(`[Gemini] translation: "${translation}"`);
        this.callbacks.onTranslatedText(translation);
      }
    } catch (error: any) {
      console.error("[Gemini] translation error:", error.message);
      this.callbacks.onError(new Error("Translation failed: " + error.message));
    }

    // Reset for next utterance
    this.accumulatedInput = "";
  }

  disconnect(): void {
    if (this.session) {
      try {
        this.session.sendRealtimeInput({ audioStreamEnd: true });
      } catch {
        // Ignore cleanup errors
      }
      this.session.close();
      this.session = null;
    }
  }
}
