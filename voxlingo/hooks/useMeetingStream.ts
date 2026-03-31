import { useState, useRef, useCallback, useEffect } from "react";
import { AppState, Linking, Platform } from "react-native";
import { Audio } from "expo-av";
import { LanguageCode } from "../types";
import { getSocket } from "../services/gemini";
import { RECORDING_OPTIONS } from "../constants/audioConfig";
import {
  isWebPlatform,
  startWebAudioCapture,
  stopWebAudioCapture,
} from "../services/webAudioCapture";

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
  const usingWebAudioRef = useRef(false);

  const startListening = useCallback(
    async (userLang: LanguageCode) => {
      try {
        setError(null);

        const socket = getSocket();
        if (!socket.connected) {
          socket.connect();
        }

        socket.off("meeting-utterance");
        socket.off("meeting-input");
        socket.off("translation-error");

        socket.on("meeting-utterance", (data: { text: string }) => {
          callbacks.onUtterance({
            speaker: "Speaker",
            lang: "auto",
            original: "",
            translated: data.text,
            timestamp: Date.now(),
          });
        });

        socket.on("meeting-input", (data: { text: string }) => {
          callbacks.onUtterance({
            speaker: "Speaker",
            lang: "auto",
            original: data.text,
            translated: "",
            timestamp: Date.now(),
          });
        });

        socket.on("translation-error", (data: { message: string }) => {
          callbacks.onError(new Error(data.message));
        });

        socket.emit("start-meeting", { userLang });

        if (isWebPlatform()) {
          // Web: use Web Audio API for raw PCM capture
          usingWebAudioRef.current = true;
          await startWebAudioCapture((pcmBase64: string) => {
            if (pcmBase64.length > 100) {
              socket.emit("audio-stream", { audio: pcmBase64 });
            }
          });
        } else {
          // Native: use expo-av recording
          usingWebAudioRef.current = false;

          const { granted, canAskAgain } = await Audio.requestPermissionsAsync();
          if (!granted) {
            if (!canAskAgain) {
              setError("Microphone permission denied. Please enable it in your device settings.");
              if (Platform.OS !== "web") {
                Linking.openSettings().catch(() => {});
              }
            } else {
              setError("Microphone permission denied");
            }
            return;
          }

          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });

          const recording = new Audio.Recording();
          await recording.prepareToRecordAsync(RECORDING_OPTIONS);
          recordingRef.current = recording;
          await recording.startAsync();

          // Stream audio chunks every 1 second
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
                  const base64 = (reader.result as string)?.split(",")[1];
                  if (base64 && base64.length > 100) {
                    socket.emit("audio-stream", { audio: base64 });
                  }
                };
                reader.onerror = () => {
                  console.warn("FileReader error reading meeting audio chunk");
                };
                reader.readAsDataURL(blob);
              }

              const newRecording = new Audio.Recording();
              await newRecording.prepareToRecordAsync(RECORDING_OPTIONS);
              recordingRef.current = newRecording;
              await newRecording.startAsync();
            } catch (e) {
              console.warn("Chunk recording error:", e);
            }
          }, 1000);
        }

        setDuration(0);
        timerRef.current = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);

        setIsListening(true);
      } catch (err: any) {
        if (chunkIntervalRef.current) {
          clearInterval(chunkIntervalRef.current);
          chunkIntervalRef.current = null;
        }
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setError(err.message || "Failed to start meeting");
        callbacks.onError(err);
      }
    },
    [callbacks]
  );

  const stopListening = useCallback(async () => {
    try {
      if (usingWebAudioRef.current) {
        stopWebAudioCapture();
      } else {
        if (chunkIntervalRef.current) {
          clearInterval(chunkIntervalRef.current);
          chunkIntervalRef.current = null;
        }

        if (recordingRef.current) {
          await recordingRef.current.stopAndUnloadAsync();
          recordingRef.current = null;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const socket = getSocket();
      socket.emit("stop-translation");
      // Delay cleanup so final responses can arrive
      setTimeout(() => {
        socket.off("meeting-utterance");
        socket.off("meeting-input");
        socket.off("translation-error");
      }, 5000);

      setIsListening(false);
    } catch (err: any) {
      setError(err.message || "Failed to stop meeting");
    }
  }, []);

  // Stop listening when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" && isListening) {
        stopListening();
      }
    });
    return () => subscription.remove();
  }, [isListening, stopListening]);

  return { isListening, error, duration, startListening, stopListening };
}
