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
  private isActive = false; // true while user is recording
  private reconnecting = false;
  private pendingAudio: Buffer[] = []; // buffer audio during reconnection

  constructor(
    sourceLang: string,
    targetLang: string,
    callbacks: GeminiSessionCallbacks,
    locationHints?: string
  ) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.sourceLang = sourceLang;
    this.targetLang = targetLang;
    this.callbacks = callbacks;
    this.locationHints = locationHints;
  }

  async connect(): Promise<void> {
    this.accumulatedInput = "";
    this.isActive = true;
    await this.createSession();
  }

  private async createSession(): Promise<void> {
    const sourceName = this.sourceLang === "auto" ? "" : getLanguageNameForPrompt(this.sourceLang);

    this.session = await this.ai.live.connect({
      model: "gemini-2.5-flash-native-audio-latest",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
        systemInstruction: sourceName
          ? { parts: [{ text: `The user is speaking ${sourceName}. Listen carefully and transcribe accurately.` }] }
          : undefined,
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
        },
        onclose: () => {
          console.log("[Gemini] session closed");
          this.session = null;
          // Auto-reconnect if user is still recording
          if (this.isActive && !this.reconnecting) {
            this.reconnecting = true;
            console.log("[Gemini] auto-reconnecting (user still recording)...");
            this.createSession()
              .then(() => {
                console.log("[Gemini] reconnected successfully");
                this.reconnecting = false;
                this.flushPendingAudio();
              })
              .catch((e) => {
                console.error("[Gemini] reconnect failed:", e.message);
                this.reconnecting = false;
              });
          }
        },
      },
    });
  }

  private handleMessage(message: any): void {
    const content = message.serverContent;
    if (!content) return;

    if (content.inputTranscription?.text) {
      this.accumulatedInput += content.inputTranscription.text;
      console.log(`[Gemini] accumulated: "${this.accumulatedInput}"`);
      this.callbacks.onInputText(this.accumulatedInput);
    }
  }

  sendAudio(pcmBuffer: Buffer): void {
    if (!this.session) {
      // Buffer audio during reconnection so nothing is lost
      if (this.isActive && this.reconnecting) {
        this.pendingAudio.push(Buffer.from(pcmBuffer));
      }
      return;
    }
    this.session.sendRealtimeInput({
      audio: {
        data: pcmBuffer.toString("base64"),
        mimeType: "audio/pcm;rate=16000",
      },
    });
  }

  private flushPendingAudio(): void {
    if (this.pendingAudio.length === 0 || !this.session) return;
    console.log(`[Gemini] flushing ${this.pendingAudio.length} buffered audio chunks`);
    for (const buf of this.pendingAudio) {
      this.session.sendRealtimeInput({
        audio: {
          data: buf.toString("base64"),
          mimeType: "audio/pcm;rate=16000",
        },
      });
    }
    this.pendingAudio = [];
  }

  // Signal that recording has stopped — flush audio buffer and prevent reconnection
  stopRecording(): void {
    this.isActive = false; // Prevent auto-reconnect
    if (this.session) {
      try {
        this.session.sendRealtimeInput({ audioStreamEnd: true });
      } catch {
        // Session may already be closed
      }
    }
  }

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
      const sourceName = this.sourceLang === "auto" ? "the detected language" : getLanguageNameForPrompt(this.sourceLang);

      const result = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [{
            text: `The following is a speech-to-text transcription from ${sourceName}. It likely contains transcription errors from automatic speech recognition. Before translating, correct errors such as:
- Misheard proper nouns and names (e.g. "Athos" → "Atos", "Santa" → "Sandra")
- Misheard place names (e.g. "Buddhism" → "Belgium", "boat" → "both")
- Broken or incomplete words from audio gaps
- <noise> tags should be ignored

Translate the corrected text to ${targetName}. Return ONLY the translation, nothing else.${locationContext}

Transcription: ${text}`,
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

    this.accumulatedInput = "";
  }

  disconnect(): void {
    this.isActive = false; // Prevent auto-reconnect
    this.pendingAudio = [];
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
