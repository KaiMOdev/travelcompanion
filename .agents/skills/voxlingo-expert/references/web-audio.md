# Web Audio Capture for PCM Streaming

## Why

`expo-av` Recording on web produces **webm/opus** — the browser's default codec. Many speech APIs (Gemini Live, OpenAI Whisper) require raw **16-bit PCM at 16kHz mono**. The Web Audio API captures audio directly in the required format.

## Implementation

```typescript
let mediaStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let scriptProcessor: ScriptProcessorNode | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;

export async function startWebAudioCapture(
  onChunk: (pcmBase64: string) => void
): Promise<void> {
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });

  audioContext = new AudioContext({ sampleRate: 16000 });
  sourceNode = audioContext.createMediaStreamSource(mediaStream);

  // 512 samples at 16kHz = 32ms per chunk (recommended: 20-40ms)
  scriptProcessor = audioContext.createScriptProcessor(512, 1, 1);

  scriptProcessor.onaudioprocess = (event) => {
    let float32 = event.inputBuffer.getChannelData(0);

    // Downsample if browser gave different rate
    const actualRate = audioContext!.sampleRate;
    if (actualRate !== 16000) {
      const ratio = actualRate / 16000;
      const newLength = Math.floor(float32.length / ratio);
      const downsampled = new Float32Array(newLength);
      for (let i = 0; i < newLength; i++) {
        downsampled[i] = float32[Math.floor(i * ratio)];
      }
      float32 = downsampled;
    }

    // Float32 → Int16
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Int16 → Base64
    const bytes = new Uint8Array(int16.buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    onChunk(btoa(binary));
  };

  sourceNode.connect(scriptProcessor);
  scriptProcessor.connect(audioContext.destination);
}

export function stopWebAudioCapture(): void {
  if (scriptProcessor) {
    scriptProcessor.onaudioprocess = null;
    scriptProcessor.disconnect();
    scriptProcessor = null;
  }
  if (sourceNode) { sourceNode.disconnect(); sourceNode = null; }
  if (audioContext) { audioContext.close(); audioContext = null; }
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
}
```

## PCM-to-WAV for Playback

Browsers can't play raw PCM. Wrap in a WAV header for playback:

```typescript
function pcmToWav(pcmBase64: string, sampleRate: number = 24000): ArrayBuffer {
  const pcmBytes = Uint8Array.from(atob(pcmBase64), c => c.charCodeAt(0));
  const header = 44;
  const wav = new ArrayBuffer(header + pcmBytes.length);
  const view = new DataView(wav);

  // WAV header
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + pcmBytes.length, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, pcmBytes.length, true);
  new Uint8Array(wav, header).set(pcmBytes);

  return wav;
}
```

## Notes

- `ScriptProcessorNode` is deprecated but works in all browsers. `AudioWorklet` is the replacement but requires a separate worklet file.
- Gemini Live API inputs 16kHz PCM, outputs 24kHz PCM.
- Always check `isWebPlatform()` before using Web Audio API.
- Audio chunk size: 512 samples (32ms) recommended for speech APIs. Larger buffers (4096 = 256ms) cause VAD issues.
