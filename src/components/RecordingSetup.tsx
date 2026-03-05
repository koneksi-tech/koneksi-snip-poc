import { useState, useEffect, useRef, useCallback } from "react";
import { useRecordingStore } from "@/stores/recording-store";
import { useAudioLevel } from "@/hooks/use-audio-level";
import { Check, Mic, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecordingSetupProps {
  onClose: () => void;
  onStartRecording: () => void;
}

export function RecordingSetup({
  onClose,
  onStartRecording,
}: RecordingSetupProps) {
  const recordMic = useRecordingStore((s) => s.recordMic);
  const setSetupOpen = useRecordingStore((s) => s.setSetupOpen);
  const toggleMic = useRecordingStore((s) => s.toggleMic);

  const [micPreviewStream, setMicPreviewStream] = useState<MediaStream | null>(
    null,
  );
  const micStreamRef = useRef<MediaStream | null>(null);
  const micLevel = useAudioLevel(micPreviewStream);

  useEffect(() => {
    if (!recordMic) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
        setMicPreviewStream(null);
      }
      return;
    }

    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        micStreamRef.current = stream;
        setMicPreviewStream(stream);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
    };
  }, [recordMic]);

  const handleStart = useCallback(() => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setSetupOpen(false);
    onStartRecording();
  }, [setSetupOpen, onStartRecording]);

  return (
    <>
      <div className="fixed inset-0 z-20" aria-hidden onClick={onClose} />
      <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-white/10 bg-[#2a2a3a] p-4 shadow-2xl">
        <div className="mb-4 space-y-0.5">
          <ToggleRow
            icon={Mic}
            label="Microphone"
            active={recordMic}
            onToggle={toggleMic}
            audioLevel={recordMic ? micLevel : undefined}
          />
        </div>

        <Button
          onClick={handleStart}
          className="w-full gap-2 bg-red-600 text-white hover:bg-red-500"
        >
          <Circle className="size-3.5 fill-current" />
          Start Recording
        </Button>
      </div>
    </>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  active,
  onToggle,
  audioLevel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onToggle: () => void;
  audioLevel?: number;
}) {
  const hasLevel = audioLevel !== undefined && audioLevel > 0.01;

  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-white/5"
    >
      <div
        className={`flex size-4.5 items-center justify-center rounded border transition-colors ${
          active
            ? "border-sky-400 bg-sky-500/20"
            : "border-white/20 bg-transparent"
        }`}
      >
        {active && <Check className="size-3 text-sky-400" />}
      </div>
      <div className="relative flex items-center justify-center">
        <Icon
          className={`size-4 transition-colors ${
            hasLevel ? "text-emerald-400" : active ? "text-white/80" : "text-white/40"
          }`}
        />
        {hasLevel && (
          <div
            className="absolute -inset-1.5 rounded-full bg-emerald-400/20"
            style={{ opacity: Math.min(audioLevel! * 4, 1) }}
          />
        )}
      </div>
      <span className={active ? "text-white/90" : "text-white/50"}>
        {label}
      </span>
      {hasLevel && <AudioBars level={audioLevel!} />}
    </button>
  );
}

function AudioBars({ level }: { level: number }) {
  return (
    <div className="ml-auto flex items-end gap-px">
      {[0, 1, 2, 3, 4].map((i) => {
        const barLevel = Math.max(0, Math.min(1, level * 5 - i * 0.3));
        return (
          <div
            key={i}
            className="w-[3px] rounded-full bg-emerald-400 transition-all duration-75"
            style={{
              height: `${Math.max(3, barLevel * 14)}px`,
              opacity: barLevel > 0.05 ? 1 : 0.2,
            }}
          />
        );
      })}
    </div>
  );
}
