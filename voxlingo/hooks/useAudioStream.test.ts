import { renderHook, act } from "@testing-library/react-native";
import { useAudioStream } from "./useAudioStream";

jest.mock("expo-av", () => ({
  Audio: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
      startAsync: jest.fn().mockResolvedValue(undefined),
      stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
      getURI: jest.fn().mockReturnValue("file:///mock/recording.wav"),
      setOnRecordingStatusUpdate: jest.fn(),
    })),
    AndroidOutputFormat: { DEFAULT: 0 },
    AndroidAudioEncoder: { DEFAULT: 0 },
    IOSOutputFormat: { LINEARPCM: 0 },
    IOSAudioQuality: { MAX: 127 },
  },
}));

jest.mock("../services/gemini", () => ({
  startTranslationSession: jest.fn().mockReturnValue({
    sendAudio: jest.fn(),
    stop: jest.fn(),
  }),
}));

jest.mock("../services/maps", () => ({
  getLocationContext: jest.fn().mockResolvedValue(null),
  formatLocationForPrompt: jest.fn().mockReturnValue(""),
}));

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  return {
    ...actual,
    AppState: {
      addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
      currentState: "active",
    },
  };
});

describe("useAudioStream", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() =>
      useAudioStream({
        onTranslatedAudio: jest.fn(),
        onTranslatedText: jest.fn(),
        onInputText: jest.fn(),
        onError: jest.fn(),
      })
    );

    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets isRecording to true when startRecording is called", async () => {
    const { result } = renderHook(() =>
      useAudioStream({
        onTranslatedAudio: jest.fn(),
        onTranslatedText: jest.fn(),
        onInputText: jest.fn(),
        onError: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.startRecording("en", "es");
    });

    expect(result.current.isRecording).toBe(true);
  });

  it("sets isRecording to false when stopRecording is called", async () => {
    const { result } = renderHook(() =>
      useAudioStream({
        onTranslatedAudio: jest.fn(),
        onTranslatedText: jest.fn(),
        onInputText: jest.fn(),
        onError: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.startRecording("en", "es");
    });

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
  });
});
