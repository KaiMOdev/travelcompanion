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

  // Create audio context — request 16kHz but browser may give different rate
  audioContext = new AudioContext({ sampleRate: 16000 });
  const actualRate = audioContext.sampleRate;
  console.log(`[WebAudio] Requested 16kHz, got ${actualRate}Hz`);

  sourceNode = audioContext.createMediaStreamSource(mediaStream);

  // ScriptProcessorNode captures raw PCM float samples
  const bufferSize = 4096;
  scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);

  let chunkCount = 0;
  scriptProcessor.onaudioprocess = (event) => {
    let float32 = event.inputBuffer.getChannelData(0);

    // If browser gave us a different sample rate, downsample to 16kHz
    if (actualRate !== 16000) {
      const ratio = actualRate / 16000;
      const newLength = Math.floor(float32.length / ratio);
      const downsampled = new Float32Array(newLength);
      for (let i = 0; i < newLength; i++) {
        downsampled[i] = float32[Math.floor(i * ratio)];
      }
      float32 = downsampled;
    }

    // Log audio level for first few chunks to verify mic is capturing
    if (chunkCount < 5) {
      let maxVal = 0;
      for (let i = 0; i < float32.length; i++) {
        const abs = Math.abs(float32[i]);
        if (abs > maxVal) maxVal = abs;
      }
      console.log(`[WebAudio] chunk ${chunkCount}: samples=${float32.length}, peak=${maxVal.toFixed(4)}`);
      chunkCount++;
    }

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
