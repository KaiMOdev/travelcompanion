import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { TranscriptEntry } from "../types";

export function formatTranscriptAsText(
  entries: TranscriptEntry[],
  durationSeconds: number
): string {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const durationStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  let text = "VoxLingo Meeting Transcript\n";
  text += `Date: ${new Date().toLocaleDateString()}\n`;
  text += `Duration: ${durationStr}\n`;
  text += "─".repeat(40) + "\n\n";

  if (entries.length === 0) {
    text += "No utterances recorded.\n";
    return text;
  }

  for (const entry of entries) {
    text += `[${entry.speaker}] (${entry.lang})\n`;
    if (entry.original) {
      text += `  Original: ${entry.original}\n`;
    }
    if (entry.translated) {
      text += `  Translated: ${entry.translated}\n`;
    }
    text += "\n";
  }

  return text;
}

export async function saveTranscriptToFile(content: string): Promise<string> {
  const filename = `voxlingo-transcript-${Date.now()}.txt`;
  const filePath = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(filePath, content);
  return filePath;
}

export async function shareTranscript(filePath: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error("Sharing is not available on this device");
  }
  await Sharing.shareAsync(filePath, {
    mimeType: "text/plain",
    dialogTitle: "Share Meeting Transcript",
  });
}

export async function exportAndShareTranscript(
  entries: TranscriptEntry[],
  durationSeconds: number
): Promise<void> {
  const content = formatTranscriptAsText(entries, durationSeconds);
  const filePath = await saveTranscriptToFile(content);
  await shareTranscript(filePath);
}
