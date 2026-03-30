/**
 * Web-specific PCM audio capture using the Web Audio API.
 * Captures raw 16-bit PCM at 16kHz mono — the format Gemini Live expects.
 * Falls back gracefully if not in a browser environment.
 */

let mediaStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let scriptProcessor: ScriptProcessorNode | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;

export type OnAudioChunk = (pcmBase64: string) => void;

export function isWebPlatform(): boolean {
  return typeof window !== "undefined" && typeof navigator !== "undefined" && !!navigator.mediaDevices;
}

export async function startWebAudioCapture(onChunk: OnAudioChunk): Promise<void> {
  if (!isWebPlatform()) {
    throw new Error("Web Audio API not available");
  }

  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      sampleRate: 16000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
    },
  });

  // Create audio context at 16kHz
  audioContext = new AudioContext({ sampleRate: 16000 });
  sourceNode = audioContext.createMediaStreamSource(mediaStream);

  // ScriptProcessorNode captures raw PCM float samples
  // Buffer size of 4096 at 16kHz = ~256ms per chunk
  scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

  scriptProcessor.onaudioprocess = (event) => {
    const float32 = event.inputBuffer.getChannelData(0);

    // Convert float32 [-1, 1] to int16 [-32768, 32767]
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Convert to base64
    const bytes = new Uint8Array(int16.buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    onChunk(base64);
  };

  sourceNode.connect(scriptProcessor);
  scriptProcessor.connect(audioContext.destination);
}

export function stopWebAudioCapture(): void {
  if (scriptProcessor) {
    scriptProcessor.disconnect();
    scriptProcessor = null;
  }
  if (sourceNode) {
    sourceNode.disconnect();
    sourceNode = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
}
