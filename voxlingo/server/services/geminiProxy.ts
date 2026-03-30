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
  private locationHints?: string;

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
  }

  async connect(): Promise<void> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    const ai = new GoogleGenAI({ apiKey });
    const sourceName = this.sourceLang === "auto" ? "auto" : getLanguageNameForPrompt(this.sourceLang);
    const targetName = getLanguageNameForPrompt(this.targetLang);

    const locationContext = this.locationHints
      ? ` ${this.locationHints} Use this location context to adapt phrasing, formality, and cultural references appropriately.`
      : "";

    let systemPrompt: string;
    if (this.sourceLang === "auto") {
      systemPrompt = `You are a real-time meeting translator. Listen to continuous audio. For each utterance: detect the speaker (label as Speaker 1, Speaker 2, etc. based on voice characteristics), detect the language they are speaking, provide the original text, and translate to ${targetName}. Respond with the translation spoken in ${targetName}.${locationContext}`;
    } else {
      systemPrompt = `You are a real-time voice translator. The user will speak in ${sourceName}. Translate everything they say into ${targetName}. Speak the translation naturally. Do not add commentary or explanations — only translate.${locationContext}`;
    }

    this.session = await ai.live.connect({
      model: "gemini-2.5-flash-native-audio-latest",
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: {
          parts: [
            {
              text: systemPrompt,
            },
          ],
        },
      },
      callbacks: {
        onopen: () => {
          console.log("Gemini Live session opened");
        },
        onmessage: (message: any) => {
          console.log("[Gemini] onmessage keys:", Object.keys(message || {}));
          this.handleMessage(message);
        },
        onerror: (e: any) => {
          console.error("[Gemini] onerror:", JSON.stringify(e, null, 2));
          const msg = e?.message || "";
          if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
            this.callbacks.onError(new Error("Gemini API quota exceeded. Free tier limit reached — try again later or enable billing."));
          } else {
            this.callbacks.onError(new Error(msg || "Gemini Live error"));
          }
        },
        onclose: () => {
          console.log("[Gemini] session closed");
          // If session closes immediately with no messages, likely a quota/auth issue
          if (this.session) {
            this.callbacks.onError(new Error("Translation session ended unexpectedly. This may be due to API quota limits — check your Gemini API usage."));
            this.session = null;
          }
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
    if (!this.session) {
      console.warn("[Gemini] sendAudio called but session is closed");
      return;
    }
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
