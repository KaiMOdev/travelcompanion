import { useState, useRef, useCallback } from "react";
import { Audio } from "expo-av";
import { LanguageCode } from "../types";
import { getSocket } from "../services/gemini";

export interface MeetingUtteranceData {
  speaker: string;
  lang: string;
  original: string;
  translated: string;
  timestamp: number;
}

export interface MeetingStreamCallbacks {
  onUtterance: (utterance: MeetingUtteranceData) => void;
  onError: (error: Error) => void;
}

export function useMeetingStream(callbacks: MeetingStreamCallbacks) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startListening = useCallback(
    async (userLang: LanguageCode) => {
      try {
        setError(null);

        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          setError("Microphone permission denied");
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const socket = getSocket();
        if (!socket.connected) {
          socket.connect();
        }

        socket.off("meeting-utterance");
        socket.off("meeting-input");
        socket.off("translation-error");

        socket.on("meeting-utterance", (data: { text: string }) => {
          const utterance: MeetingUtteranceData = {
            speaker: "Speaker",
            lang: "auto",
            original: "",
            translated: data.text,
            timestamp: Date.now(),
          };
          callbacks.onUtterance(utterance);
        });

        socket.on("meeting-input", (data: { text: string }) => {
          const utterance: MeetingUtteranceData = {
            speaker: "Speaker",
            lang: "auto",
            original: data.text,
            translated: "",
            timestamp: Date.now(),
          };
          callbacks.onUtterance(utterance);
        });

        socket.on("translation-error", (data: { message: string }) => {
          callbacks.onError(new Error(data.message));
        });

        socket.emit("start-meeting", { userLang });

        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync({
          android: {
            extension: ".wav",
            outputFormat: 2,
            audioEncoder: 1,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 256000,
          },
          ios: {
            extension: ".wav",
            outputFormat: "linearPCM" as any,
            audioQuality: 127,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 256000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {},
        });

        recordingRef.current = recording;
        await recording.startAsync();

        chunkIntervalRef.current = setInterval(async () => {
          if (!recordingRef.current) return;
          try {
            const currentRecording = recordingRef.current;
            await currentRecording.stopAndUnloadAsync();
            const uri = currentRecording.getURI();

            if (uri) {
              const response = await fetch(uri);
              const blob = await response.blob();
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = (reader.result as string).split(",")[1];
                if (base64) {
                  socket.emit("audio-stream", { audio: base64 });
                }
              };
              reader.readAsDataURL(blob);
            }

            const newRecording = new Audio.Recording();
            await newRecording.prepareToRecordAsync({
              android: {
                extension: ".wav",
                outputFormat: 2,
                audioEncoder: 1,
                sampleRate: 16000,
                numberOfChannels: 1,
                bitRate: 256000,
              },
              ios: {
                extension: ".wav",
                outputFormat: "linearPCM" as any,
                audioQuality: 127,
                sampleRate: 16000,
                numberOfChannels: 1,
                bitRate: 256000,
                linearPCMBitDepth: 16,
                linearPCMIsBigEndian: false,
                linearPCMIsFloat: false,
              },
              web: {},
            });
            recordingRef.current = newRecording;
            await newRecording.startAsync();
          } catch (e) {
            console.warn("Chunk recording error:", e);
          }
        }, 1000);

        setDuration(0);
        timerRef.current = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);

        setIsListening(true);
      } catch (err: any) {
        setError(err.message || "Failed to start meeting");
        callbacks.onError(err);
      }
    },
    [callbacks]
  );

  const stopListening = useCallback(async () => {
    try {
      if (chunkIntervalRef.current) {
        clearInterval(chunkIntervalRef.current);
        chunkIntervalRef.current = null;
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      const socket = getSocket();
      socket.emit("stop-translation");
      socket.off("meeting-utterance");
      socket.off("meeting-input");
      socket.off("translation-error");

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      setIsListening(false);
    } catch (err: any) {
      setError(err.message || "Failed to stop meeting");
    }
  }, []);

  return {
    isListening,
    error,
    duration,
    startListening,
    stopListening,
  };
}
