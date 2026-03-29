import { formatTranscriptAsText } from "./transcript";

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///mock/",
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

describe("formatTranscriptAsText", () => {
  it("formats utterances as readable text", () => {
    const entries = [
      {
        speaker: "Speaker 1",
        lang: "en" as const,
        original: "Hello everyone",
        translated: "Hallo allemaal",
        timestamp: 0,
      },
      {
        speaker: "Speaker 2",
        lang: "nl" as const,
        original: "Goedemorgen",
        translated: "Good morning",
        timestamp: 5000,
      },
    ];

    const result = formatTranscriptAsText(entries, 10);

    expect(result).toContain("Speaker 1");
    expect(result).toContain("Hello everyone");
    expect(result).toContain("Hallo allemaal");
    expect(result).toContain("Speaker 2");
    expect(result).toContain("Duration: 0:10");
  });

  it("handles empty entries", () => {
    const result = formatTranscriptAsText([], 0);
    expect(result).toContain("VoxLingo Meeting Transcript");
    expect(result).toContain("No utterances recorded");
  });
});
