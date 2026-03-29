import { GeminiLiveSession } from "./geminiProxy";

const mockSendRealtimeInput = jest.fn();
const mockClose = jest.fn();
const mockConnect = jest.fn().mockResolvedValue({
  sendRealtimeInput: mockSendRealtimeInput,
  close: mockClose,
});

jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    live: { connect: mockConnect },
  })),
  Modality: { AUDIO: "audio" },
}));

describe("GeminiLiveSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("connects with correct config", async () => {
    const session = new GeminiLiveSession("en", "es", {
      onTranslatedAudio: jest.fn(),
      onTranslatedText: jest.fn(),
      onInputText: jest.fn(),
      onError: jest.fn(),
    });

    await session.connect();

    expect(mockConnect).toHaveBeenCalledTimes(1);
    const callArgs = mockConnect.mock.calls[0][0];
    expect(callArgs.model).toBe("gemini-2.0-flash-live-001");
    expect(callArgs.config.responseModalities).toContain("audio");
    expect(callArgs.config.systemInstruction).toBeDefined();
  });

  it("sends audio chunks as base64 PCM", async () => {
    const session = new GeminiLiveSession("en", "ja", {
      onTranslatedAudio: jest.fn(),
      onTranslatedText: jest.fn(),
      onInputText: jest.fn(),
      onError: jest.fn(),
    });

    await session.connect();
    const testBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    session.sendAudio(testBuffer);

    expect(mockSendRealtimeInput).toHaveBeenCalledWith({
      audio: {
        data: testBuffer.toString("base64"),
        mimeType: "audio/pcm;rate=16000",
      },
    });
  });

  it("disconnects cleanly", async () => {
    const session = new GeminiLiveSession("en", "es", {
      onTranslatedAudio: jest.fn(),
      onTranslatedText: jest.fn(),
      onInputText: jest.fn(),
      onError: jest.fn(),
    });

    await session.connect();
    session.disconnect();

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("throws if GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;

    const session = new GeminiLiveSession("en", "es", {
      onTranslatedAudio: jest.fn(),
      onTranslatedText: jest.fn(),
      onInputText: jest.fn(),
      onError: jest.fn(),
    });

    await expect(session.connect()).rejects.toThrow("GEMINI_API_KEY");
  });
});
