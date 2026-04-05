import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

let recording: Audio.Recording | null = null;

// --- Native (iOS/Android) using expo-av ---

async function startNativeRecording(): Promise<void> {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Microphone permission is required to record audio');
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const newRecording = new Audio.Recording();
  await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await newRecording.startAsync();
  recording = newRecording;
}

async function stopNativeRecording(): Promise<string> {
  if (!recording) {
    throw new Error('No recording in progress');
  }

  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  recording = null;

  if (!uri) {
    throw new Error('Recording failed — no file URI');
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });

  return base64;
}

// --- Web using Web Audio API ---

let mediaStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let pcmChunks: Float32Array[] = [];

async function startWebRecording(): Promise<void> {
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioContext = new AudioContext({ sampleRate: 16000 });
  pcmChunks = [];

  const source = audioContext.createMediaStreamSource(mediaStream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (e) => {
    const data = e.inputBuffer.getChannelData(0);
    pcmChunks.push(new Float32Array(data));
  };

  source.connect(processor);
  processor.connect(audioContext.destination);
}

async function stopWebRecording(): Promise<string> {
  if (!mediaStream || !audioContext) {
    throw new Error('No recording in progress');
  }

  mediaStream.getTracks().forEach((t) => t.stop());
  await audioContext.close();

  const totalLength = pcmChunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of pcmChunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  const int16 = new Int16Array(merged.length);
  for (let i = 0; i < merged.length; i++) {
    const s = Math.max(-1, Math.min(1, merged[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const wavBuffer = createWavBuffer(int16, 16000);
  const bytes = new Uint8Array(wavBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  mediaStream = null;
  audioContext = null;
  pcmChunks = [];

  return btoa(binary);
}

function createWavBuffer(samples: Int16Array, sampleRate: number): ArrayBuffer {
  const byteLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + byteLength);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + byteLength, true);
  writeString(view, 8, 'WAVE');

  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  writeString(view, 36, 'data');
  view.setUint32(40, byteLength, true);

  const output = new Int16Array(buffer, 44);
  output.set(samples);

  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// --- Public API ---

export async function startRecording(): Promise<void> {
  if (Platform.OS === 'web') {
    return startWebRecording();
  }
  return startNativeRecording();
}

export async function stopRecording(): Promise<string> {
  if (Platform.OS === 'web') {
    return stopWebRecording();
  }
  return stopNativeRecording();
}
