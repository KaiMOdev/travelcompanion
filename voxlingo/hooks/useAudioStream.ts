import { useState, useRef, useCallback, useEffect } from "react";
import { AppState, Linking, Platform } from "react-native";
import { Audio } from "expo-av";
import { LanguageCode } from "../types";
import { startTranslationSession } from "../services/gemini";
import { getLocationContext, formatLocationForPrompt } from "../services/maps";
import { RECORDING_OPTIONS } from "../constants/audioConfig";
import {
  isWebPlatform,
  startWebAudioCapture,
  stopWebAudioCapture,
} from "../services/webAudioCapture";

export interface AudioStreamCallbacks {
  onTranslatedAudio: (audioBase64: string) => void;
  onTranslatedText: (text: string) => void;
  onInputText: (text: string) => void;
  onError: (error: Error) => void;
}

export interface AudioStreamState {
  isRecording: boolean;
  error: string | null;
}

export function useAudioStream(callbacks: AudioStreamCallbacks) {
  const [state, setState] = useState<AudioStreamState>({
    isRecording: false,
    error: null,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  const sessionRef = useRef<{
    sendAudio: (base64Audio: string) => void;
    stop: () => void;
  } | null>(null);
  const chunkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const usingWebAudioRef = useRef(false);

  // --- Native (iOS/Android) chunk streaming via expo-av ---

  const sendCurrentChunk = useCallback(async () => {
    if (!recordingRef.current || !sessionRef.current) return;

    try {
      const currentRecording = recordingRef.current;
      await currentRecording.stopAndUnloadAsync();
      const uri = currentRecording.getURI();

      if (uri && sessionRef.current) {
        const response = await fetch(uri);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string)?.split(",")[1];
          if (base64 && base64.length > 100 && sessionRef.current) {
            sessionRef.current.sendAudio(base64);
          }
        };
        reader.onerror = () => {
          console.warn("FileReader error reading audio chunk");
        };
        reader.readAsDataURL(blob);
      }

      // Start a new recording chunk
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(RECORDING_OPTIONS);
      recordingRef.current = newRecording;
      await newRecording.startAsync();
    } catch (e) {
      console.warn("Audio chunk error:", e);
    }
  }, []);

  // --- Start recording ---

  const startRecording = useCallback(
    async (sourceLang: LanguageCode, targetLang: LanguageCode) => {
      try {
        setState({ isRecording: false, error: null });

        // Fetch location context (non-blocking)
        const locationContext = await getLocationContext().catch(() => null);
        const locationHints = locationContext
          ? formatLocationForPrompt(locationContext)
          : undefined;

        // Start translation session with backend
        const session = startTranslationSession(sourceLang, targetLang, {
          onTranslatedAudio: callbacks.onTranslatedAudio,
          onTranslatedText: callbacks.onTranslatedText,
          onInputText: callbacks.onInputText,
          onReady: () => {
            console.log("Translation session ready");
          },
          onError: callbacks.onError,
        }, { locationHints });
        sessionRef.current = session;

        if (isWebPlatform()) {
          // Web: use Web Audio API for raw PCM capture
          usingWebAudioRef.current = true;
          await startWebAudioCapture((pcmBase64: string) => {
            if (sessionRef.current && pcmBase64.length > 100) {
              sessionRef.current.sendAudio(pcmBase64);
            }
          });
        } else {
          // Native: use expo-av recording
          usingWebAudioRef.current = false;

          const { granted, canAskAgain } = await Audio.requestPermissionsAsync();
          if (!granted) {
            if (!canAskAgain) {
              setState({
                isRecording: false,
                error: "Microphone permission denied. Please enable it in your device settings.",
              });
              // On Android/iOS, offer to open settings
              if (Platform.OS !== "web") {
                Linking.openSettings().catch(() => {});
              }
            } else {
              setState({ isRecording: false, error: "Microphone permission denied" });
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
          chunkIntervalRef.current = setInterval(() => {
            sendCurrentChunk();
          }, 1000);
        }

        setState({ isRecording: true, error: null });
      } catch (error: any) {
        setState({
          isRecording: false,
          error: error.message || "Failed to start recording",
        });
        callbacks.onError(error);
      }
    },
    [callbacks, sendCurrentChunk]
  );

  // --- Stop recording ---

  const stopRecording = useCallback(async () => {
    try {
      if (usingWebAudioRef.current) {
        stopWebAudioCapture();
      } else {
        if (chunkIntervalRef.current) {
          clearInterval(chunkIntervalRef.current);
          chunkIntervalRef.current = null;
        }

        const recording = recordingRef.current;
        if (recording) {
          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();
          recordingRef.current = null;

          // Send final chunk
          if (uri && sessionRef.current) {
            const response = await fetch(uri);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string)?.split(",")[1];
              if (base64 && base64.length > 100 && sessionRef.current) {
                sessionRef.current.sendAudio(base64);
              }
            };
            reader.onerror = () => {
              console.warn("FileReader error reading final audio chunk");
            };
            reader.readAsDataURL(blob);
          }
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
      }

      // Stop translation session
      if (sessionRef.current) {
        sessionRef.current.stop();
        sessionRef.current = null;
      }

      setState({ isRecording: false, error: null });
    } catch (error: any) {
      setState({
        isRecording: false,
        error: error.message || "Failed to stop recording",
      });
    }
  }, []);

  // Stop recording when app goes to background to save battery
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" && state.isRecording) {
        stopRecording();
      }
    });
    return () => subscription.remove();
  }, [state.isRecording, stopRecording]);

  return {
    isRecording: state.isRecording,
    error: state.error,
    startRecording,
    stopRecording,
  };
}
