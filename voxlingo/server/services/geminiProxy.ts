import { GoogleGenAI, Modality } from "@google/genai";
import { getLanguageNameForPrompt } from "./languageNames";

export interface GeminiSessionCallbacks {
  onTranslatedAudio: (audioBase64: string) => void;
  onTranslatedText: (text: string) => void;
  onInputText: (text: string) => void;
  onError: (error: Error) => void;
}

const MAX_RECONNECT_ATTEMPTS = 3;
const MAX_ACCUMULATED_LENGTH = 5000; // Prevent unbounded text growth

export class GeminiLiveSession {
  private session: any = null;
  private ai: GoogleGenAI;
  private sourceLang: string;
  private targetLang: string;
  private callbacks: GeminiSessionCallbacks;
  private locationHints?: string;
  private accumulatedInput = "";
  private isActive = false;
  private reconnecting = false;
  private reconnectAttempts = 0;
  private pendingAudio: Buffer[] = [];

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
    this.reconnectAttempts = 0;
    await this.createSession();
  }

  private async createSession(): Promise<void> {
    const sourceName = this.sourceLang === "auto" ? "" : getLanguageNameForPrompt(this.sourceLang);

    const connectPromise = this.ai.live.connect({
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
          this.reconnectAttempts = 0; // Reset on successful connection
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
          // Auto-reconnect with retry limit
          if (this.isActive && !this.reconnecting && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            this.reconnecting = true;
            this.reconnectAttempts++;
            const delay = Math.min(500 * this.reconnectAttempts, 2000);
            console.log(`[Gemini] reconnecting (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`);
            setTimeout(() => {
              this.createSession()
                .then(() => {
                  console.log("[Gemini] reconnected successfully");
                  this.reconnecting = false;
                  this.flushPendingAudio();
                })
                .catch((e) => {
                  console.error("[Gemini] reconnect failed:", e.message);
                  this.reconnecting = false;
                  this.callbacks.onError(new Error("Live session reconnection failed. Translation will use text captured so far."));
                });
            }, delay);
          } else if (this.isActive && this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.warn("[Gemini] max reconnect attempts reached");
            this.callbacks.onError(new Error("Live transcription session ended. Translation will use text captured so far."));
          }
        },
      },
    });

    // Timeout after 15 seconds
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini Live connection timed out")), 15000)
    );

    this.session = await Promise.race([connectPromise, timeout]);
  }

  private handleMessage(message: any): void {
    const content = message.serverContent;
    if (!content) return;

    if (content.inputTranscription?.text) {
      // Bounds check to prevent unbounded growth
      if (this.accumulatedInput.length < MAX_ACCUMULATED_LENGTH) {
        this.accumulatedInput += content.inputTranscription.text;
      }
      this.callbacks.onInputText(this.accumulatedInput);
    }
  }

  sendAudio(pcmBuffer: Buffer): void {
    if (!this.session) {
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

  stopRecording(): void {
    this.isActive = false;
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
      // Only clear on success
      this.accumulatedInput = "";
    } catch (error: any) {
      console.error("[Gemini] translation error:", error.message);
      this.callbacks.onError(new Error("Translation failed: " + error.message));
      // Don't clear accumulatedInput on error — allows retry
    }
  }

  disconnect(): void {
    this.isActive = false;
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
