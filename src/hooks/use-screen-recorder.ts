import { useRef, useCallback } from "react";
import { useRecordingStore, RECORDING_MAX_SECONDS } from "@/stores/recording-store";

export function useScreenRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const pendingStreamRef = useRef<MediaStream | null>(null);
  const pendingMimeTypeRef = useRef<string>("video/webm");

  const cleanup = useCallback(() => {
    displayStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    displayStreamRef.current = null;
    micStreamRef.current = null;
    mediaRecorderRef.current = null;
    pendingStreamRef.current = null;
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
    }
    audioContextRef.current = null;
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = false;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  /** Opens picker; after user selects screen/tab, sets countdown to 3. Does not start MediaRecorder yet. */
  const start = useCallback(async () => {
    const state = useRecordingStore.getState();
    cancelledRef.current = false;

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      });
      displayStreamRef.current = displayStream;

      const tracks: MediaStreamTrack[] = [...displayStream.getVideoTracks()];

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const destination = audioContext.createMediaStreamDestination();
      let hasAudio = false;

      if (displayStream.getAudioTracks().length > 0) {
        const src = audioContext.createMediaStreamSource(
          new MediaStream(displayStream.getAudioTracks()),
        );
        src.connect(destination);
        hasAudio = true;
      }

      if (state.recordMic) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          micStreamRef.current = micStream;
          const micSrc = audioContext.createMediaStreamSource(micStream);
          micSrc.connect(destination);
          hasAudio = true;
        } catch (e) {
          console.warn("Microphone access denied:", e);
        }
      }

      if (hasAudio) {
        tracks.push(...destination.stream.getAudioTracks());
      }

      const combinedStream = new MediaStream(tracks);
      const mimeType = MediaRecorder.isTypeSupported(
        "video/webm;codecs=vp9,opus",
      )
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";

      pendingStreamRef.current = combinedStream;
      pendingMimeTypeRef.current = mimeType;

      displayStream.getVideoTracks()[0].addEventListener("ended", () => {
        if (!mediaRecorderRef.current) {
          cleanup();
          useRecordingStore.getState().setCountdown(null);
        } else {
          stop();
        }
      });

      useRecordingStore.getState().setSetupOpen(false);
      useRecordingStore.getState().setCountdown(3);
      return true;
    } catch (e) {
      console.error("Failed to start recording:", e);
      cleanup();
      return false;
    }
  }, [cleanup, stop]);

  /** Called when countdown hits 0: starts MediaRecorder with the stream from the picker. */
  const beginCapture = useCallback(() => {
    const stream = pendingStreamRef.current;
    const mimeType = pendingMimeTypeRef.current;
    if (!stream) return;

    pendingStreamRef.current = null;
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      if (cancelledRef.current) {
        useRecordingStore.getState().setIsRecording(false);
        useRecordingStore.getState().setIsCancelled(true);
      } else {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        useRecordingStore.getState().setRecordedBlob(blob);
        useRecordingStore.getState().setIsRecording(false);
      }
      cleanup();
    };

    recorder.start(1000);
    useRecordingStore.getState().setIsRecording(true);
    useRecordingStore.getState().setIsCancelled(false);
    useRecordingStore.getState().setRemainingSeconds(RECORDING_MAX_SECONDS);
  }, [cleanup]);

  const pauseResume = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state === "recording") {
      recorder.pause();
      useRecordingStore.getState().setIsPaused(true);
    } else if (recorder.state === "paused") {
      recorder.resume();
      useRecordingStore.getState().setIsPaused(false);
    }
  }, []);

  return { start, beginCapture, stop, cancel, pauseResume };
}
