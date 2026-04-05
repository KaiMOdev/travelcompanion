import { Platform } from 'react-native';

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    RecordingOptionsPresets: { HIGH_QUALITY: {} },
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: jest.fn(),
      startAsync: jest.fn(),
      stopAndUnloadAsync: jest.fn(),
      getURI: jest.fn().mockReturnValue('file://test.wav'),
    })),
  },
}));

// Mock expo-file-system/legacy
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('base64audiodata'),
  EncodingType: { Base64: 'base64' },
}));

describe('audio service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('startRecording and stopRecording return base64 on native', async () => {
    Platform.OS = 'ios';
    const { startRecording, stopRecording } = require('./audio');

    await startRecording();
    const result = await stopRecording();

    expect(result).toEqual({ audio: 'base64audiodata', mimeType: 'audio/mp4' });
  });

  it('throws if stopRecording called without startRecording', async () => {
    Platform.OS = 'ios';
    const { stopRecording } = require('./audio');

    await expect(stopRecording()).rejects.toThrow();
  });
});
