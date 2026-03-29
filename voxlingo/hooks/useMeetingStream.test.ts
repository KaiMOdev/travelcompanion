import { renderHook, act } from "@testing-library/react-native";
import { useMeetingStream } from "./useMeetingStream";

jest.mock("expo-av", () => ({
  Audio: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
      startAsync: jest.fn().mockResolvedValue(undefined),
      stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
      getURI: jest.fn().mockReturnValue("file:///mock/recording.wav"),
    })),
  },
}));

const mockSocket = {
  connected: true,
  connect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

jest.mock("../services/gemini", () => ({
  getSocket: jest.fn().mockImplementation(() => mockSocket),
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

describe("useMeetingStream", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket.connected = true;
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() =>
      useMeetingStream({
        onUtterance: jest.fn(),
        onError: jest.fn(),
      })
    );

    expect(result.current.isListening).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets isListening to true when startListening is called", async () => {
    const { result } = renderHook(() =>
      useMeetingStream({
        onUtterance: jest.fn(),
        onError: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.startListening("en");
    });

    expect(result.current.isListening).toBe(true);
    expect(mockSocket.emit).toHaveBeenCalledWith("start-meeting", { userLang: "en" });
  });

  it("sets isListening to false when stopListening is called", async () => {
    const { result } = renderHook(() =>
      useMeetingStream({
        onUtterance: jest.fn(),
        onError: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.startListening("en");
    });

    await act(async () => {
      await result.current.stopListening();
    });

    expect(result.current.isListening).toBe(false);
  });
});
