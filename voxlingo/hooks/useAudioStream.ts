import { useState, useRef, useCallback } from "react";
import { Audio } from "expo-av";
import { LanguageCode } from "../types";
import { startTranslationSession } from "../services/gemini";

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

  const startRecording = useCallback(
    async (sourceLang: LanguageCode, targetLang: LanguageCode) => {
      try {
        setState({ isRecording: false, error: null });

        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          setState({ isRecording: false, error: "Microphone permission denied" });
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const session = startTranslationSession(sourceLang, targetLang, {
          onTranslatedAudio: callbacks.onTranslatedAudio,
          onTranslatedText: callbacks.onTranslatedText,
          onInputText: callbacks.onInputText,
          onReady: () => {
            console.log("Translation session ready");
          },
          onError: callbacks.onError,
        });
        sessionRef.current = session;

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
        setState({ isRecording: true, error: null });
      } catch (error: any) {
        setState({
          isRecording: false,
          error: error.message || "Failed to start recording",
        });
        callbacks.onError(error);
      }
    },
    [callbacks]
  );

  const stopRecording = useCallback(async () => {
    try {
      const recording = recordingRef.current;
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        recordingRef.current = null;

        if (uri && sessionRef.current) {
          const response = await fetch(uri);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            if (base64 && sessionRef.current) {
              sessionRef.current.sendAudio(base64);
            }
          };
          reader.readAsDataURL(blob);
        }
      }

      if (sessionRef.current) {
        sessionRef.current.stop();
        sessionRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      setState({ isRecording: false, error: null });
    } catch (error: any) {
      setState({
        isRecording: false,
        error: error.message || "Failed to stop recording",
      });
    }
  }, []);

  return {
    isRecording: state.isRecording,
    error: state.error,
    startRecording,
    stopRecording,
  };
}
