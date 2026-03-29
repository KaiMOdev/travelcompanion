import { translateImageWithGemini } from "./geminiVision";

const mockGenerateContent = jest.fn().mockResolvedValue({
  text: JSON.stringify({
    detectedLanguage: "Spanish",
    originalText: "Hola mundo",
    translatedText: "Hello world",
  }),
});

jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

describe("translateImageWithGemini", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("sends image and prompt to Gemini", async () => {
    const result = await translateImageWithGemini("base64data", "en");

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.model).toBe("gemini-2.0-flash");
    expect(callArgs.contents[0].parts).toHaveLength(2);
    expect(callArgs.contents[0].parts[0].inlineData.mimeType).toBe("image/jpeg");
    expect(callArgs.contents[0].parts[0].inlineData.data).toBe("base64data");
    expect(callArgs.contents[0].parts[1].text).toContain("English");
  });

  it("returns parsed translation result", async () => {
    const result = await translateImageWithGemini("base64data", "en");

    expect(result.detectedLanguage).toBe("Spanish");
    expect(result.originalText).toBe("Hola mundo");
    expect(result.translatedText).toBe("Hello world");
  });

  it("throws if GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(translateImageWithGemini("data", "en")).rejects.toThrow(
      "GEMINI_API_KEY"
    );
  });

  it("handles non-JSON response gracefully", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: "This is not valid JSON but contains a translation",
    });

    const result = await translateImageWithGemini("base64data", "en");
    expect(result.detectedLanguage).toBe("unknown");
    expect(result.translatedText).toContain("translation");
  });
});
