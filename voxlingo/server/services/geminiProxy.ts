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
  private sourceLang: string;
  private targetLang: string;
  private callbacks: GeminiSessionCallbacks;

  constructor(
    sourceLang: string,
    targetLang: string,
    callbacks: GeminiSessionCallbacks
  ) {
    this.sourceLang = sourceLang;
    this.targetLang = targetLang;
    this.callbacks = callbacks;
  }

  async connect(): Promise<void> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    const ai = new GoogleGenAI({ apiKey });
    const sourceName = getLanguageNameForPrompt(this.sourceLang);
    const targetName = getLanguageNameForPrompt(this.targetLang);

    this.session = await ai.live.connect({
      model: "gemini-2.0-flash-live-001",
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: {
          parts: [
            {
              text: `You are a real-time voice translator. The user will speak in ${sourceName}. Translate everything they say into ${targetName}. Speak the translation naturally. Do not add commentary or explanations — only translate.`,
            },
          ],
        },
      },
      callbacks: {
        onopen: () => {
          console.log("Gemini Live session opened");
        },
        onmessage: (message: any) => {
          this.handleMessage(message);
        },
        onerror: (e: any) => {
          this.callbacks.onError(new Error(e.message || "Gemini Live error"));
        },
        onclose: () => {
          console.log("Gemini Live session closed");
        },
      },
    });
  }

  private handleMessage(message: any): void {
    const content = message.serverContent;
    if (!content) return;

    if (content.modelTurn?.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.callbacks.onTranslatedAudio(part.inlineData.data);
        }
        if (part.text) {
          this.callbacks.onTranslatedText(part.text);
        }
      }
    }

    if (content.outputTranscription?.text) {
      this.callbacks.onTranslatedText(content.outputTranscription.text);
    }

    if (content.inputTranscription?.text) {
      this.callbacks.onInputText(content.inputTranscription.text);
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

  disconnect(): void {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }
}
