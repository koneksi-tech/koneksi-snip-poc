import { useEffect, useRef } from "react";
import { useRecordingStore } from "@/stores/recording-store";
import { Square, Pause, Play, Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecordingBarProps {
  onStop: () => void;
  onCancel: () => void;
  onPauseResume: () => void;
}

export function RecordingBar({
  onStop,
  onCancel,
  onPauseResume,
}: RecordingBarProps) {
  const isRecording = useRecordingStore((s) => s.isRecording);
  const isPaused = useRecordingStore((s) => s.isPaused);
  const remainingSeconds = useRecordingStore((s) => s.remainingSeconds);
  const setRemainingSeconds = useRecordingStore((s) => s.setRemainingSeconds);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = window.setInterval(() => {
        const current = useRecordingStore.getState().remainingSeconds;
        if (current <= 1) {
          onStop();
          setRemainingSeconds(0);
        } else {
          setRemainingSeconds(current - 1);
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused, onStop, setRemainingSeconds]);

  const isLow = remainingSeconds <= 10;
  const minutes = Math.floor(remainingSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (remainingSeconds % 60).toString().padStart(2, "0");

  return (
    <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-[#1e1e2e]/95 px-5 py-2.5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Circle
          className={`size-3 fill-red-500 text-red-500 ${!isPaused ? "animate-pulse" : "opacity-50"}`}
        />
        <span
          className={`font-mono text-sm font-medium tabular-nums ${isLow ? "text-red-400" : "text-white/90"}`}
        >
          {minutes}:{seconds}
        </span>
      </div>

      <div className="h-5 w-px bg-white/10" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onPauseResume}
        className="text-white/70 hover:bg-white/10 hover:text-white"
        title={isPaused ? "Resume" : "Pause"}
      >
        {isPaused ? (
          <Play className="size-4" />
        ) : (
          <Pause className="size-4" />
        )}
      </Button>

      <Button
        onClick={onStop}
        className="gap-2 rounded-full bg-red-600 px-4 text-white hover:bg-red-500"
        size="sm"
      >
        <Square className="size-3 fill-current" />
        Stop
      </Button>

      <div className="h-5 w-px bg-white/10" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onCancel}
        className="text-white/40 hover:bg-white/10 hover:text-red-400"
        title="Cancel recording"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
