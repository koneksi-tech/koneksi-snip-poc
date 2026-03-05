import { create } from "zustand";

export const RECORDING_MAX_SECONDS = 120;

interface RecordingState {
  setupOpen: boolean;
  recordMic: boolean;

  /** 3, 2, 1 countdown before starting; null = not counting */
  countdown: number | null;

  isRecording: boolean;
  isPaused: boolean;
  isCancelled: boolean;
  remainingSeconds: number;

  recordedBlob: Blob | null;

  setSetupOpen: (open: boolean) => void;
  setCountdown: (n: number | null) => void;
  toggleMic: () => void;
  setIsRecording: (v: boolean) => void;
  setIsPaused: (v: boolean) => void;
  setIsCancelled: (v: boolean) => void;
  setRemainingSeconds: (s: number) => void;
  setRecordedBlob: (blob: Blob | null) => void;
  resetRecording: () => void;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  setupOpen: false,
  recordMic: false,
  countdown: null,

  isRecording: false,
  isPaused: false,
  isCancelled: false,
  remainingSeconds: RECORDING_MAX_SECONDS,

  recordedBlob: null,

  setSetupOpen: (setupOpen) => set({ setupOpen }),
  setCountdown: (countdown) => set({ countdown }),
  toggleMic: () => set((s) => ({ recordMic: !s.recordMic })),
  setIsRecording: (isRecording) => set({ isRecording }),
  setIsPaused: (isPaused) => set({ isPaused }),
  setIsCancelled: (isCancelled) => set({ isCancelled }),
  setRemainingSeconds: (remainingSeconds) => set({ remainingSeconds }),
  setRecordedBlob: (recordedBlob) => set({ recordedBlob }),
  resetRecording: () =>
    set({
      isRecording: false,
      isPaused: false,
      isCancelled: false,
      remainingSeconds: RECORDING_MAX_SECONDS,
      recordedBlob: null,
    }),
}));
