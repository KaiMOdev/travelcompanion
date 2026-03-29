import { useState } from "react";

export interface AudioStreamState {
  isRecording: boolean;
  error: string | null;
}

export function useAudioStream() {
  const [state, setState] = useState<AudioStreamState>({
    isRecording: false,
    error: null,
  });

  const startRecording = async () => {
    // TODO: Implement in Travel Mode task
    setState({ isRecording: true, error: null });
  };

  const stopRecording = async () => {
    // TODO: Implement in Travel Mode task
    setState({ isRecording: false, error: null });
  };

  return {
    isRecording: state.isRecording,
    error: state.error,
    startRecording,
    stopRecording,
  };
}
