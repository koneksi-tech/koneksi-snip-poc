import { useRef, useCallback, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUploadFile } from "@/api/queries/use-files";
import { useUploadStore } from "@/stores/upload-store";
import { useRecordingStore } from "@/stores/recording-store";
import { useScreenRecorder } from "@/hooks/use-screen-recorder";
import { ShareModal } from "@/components/ShareModal";
import { UploadHistory } from "@/components/UploadHistory";
import { RecordingSetup } from "@/components/RecordingSetup";
import { RecordingBar } from "@/components/RecordingBar";
import { ensureFileDisplayName } from "@/lib/file-name";
import { Upload, Loader2, HistoryIcon, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";

const queryClient = new QueryClient();

function SnipPage() {
  const dragging = useUploadStore((s) => s.dragging);
  const uploadedFile = useUploadStore((s) => s.uploadedFile);
  const uploadedFileName = useUploadStore((s) => s.uploadedFileName);
  const historyOpen = useUploadStore((s) => s.historyOpen);
  const uploadHistory = useUploadStore((s) => s.uploadHistory);
  const setDragging = useUploadStore((s) => s.setDragging);
  const setUploadedFile = useUploadStore((s) => s.setUploadedFile);
  const setHistoryOpen = useUploadStore((s) => s.setHistoryOpen);
  const resetUpload = useUploadStore((s) => s.resetUpload);

  const setupOpen = useRecordingStore((s) => s.setupOpen);
  const isRecording = useRecordingStore((s) => s.isRecording);
  const recordedBlob = useRecordingStore((s) => s.recordedBlob);
  const isCancelled = useRecordingStore((s) => s.isCancelled);
  const countdown = useRecordingStore((s) => s.countdown);
  const setSetupOpen = useRecordingStore((s) => s.setSetupOpen);
  const setCountdown = useRecordingStore((s) => s.setCountdown);

  const {
    start: startRecording,
    beginCapture,
    stop: stopRecording,
    cancel: cancelRecording,
    pauseResume,
  } = useScreenRecorder();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const { mutate: upload, isPending, error, reset } = useUploadFile();

  const isMac =
    typeof navigator !== "undefined" && /mac/i.test(navigator.userAgent);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;

      reset();
      setUploadedFile(null);

      const fileToUpload = ensureFileDisplayName(file);
      upload(fileToUpload);
    },
    [upload, reset],
  );

  // Paste handler (global)
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const files = e.clipboardData?.files;
      if (!files?.length) return;
      for (const f of Array.from(files)) {
        if (f.type.startsWith("image/")) {
          e.preventDefault();
          handleFile(f);
          return;
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFile]);

  // Drag & drop handlers
  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    setDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragging(false);
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    const files = e.dataTransfer.files;
    if (!files.length) return;
    for (const f of Array.from(files)) {
      if (f.type.startsWith("image/")) {
        handleFile(f);
        return;
      }
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  const handleReset = useCallback(() => {
    reset();
    resetUpload();
  }, [reset, resetUpload]);

  const handleStartRecording = useCallback(async () => {
    await startRecording();
  }, [startRecording]);

  // Countdown: when 0, start MediaRecorder (beginCapture); otherwise tick down every second
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      beginCapture();
      setCountdown(null);
      return;
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, beginCapture, setCountdown]);

  // Auto-upload when recording stops and we have a blob
  useEffect(() => {
    if (!recordedBlob) return;

    const blob = recordedBlob;
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;
    const file = new File([blob], `Recording ${ts}.webm`, { type: blob.type });

    useRecordingStore.getState().setRecordedBlob(null);
    useRecordingStore.getState().resetRecording();
    reset();
    setUploadedFile(null);
    upload(file);
  }, [recordedBlob, upload, reset, setUploadedFile]);

  // Handle cancel — show toast and reset
  useEffect(() => {
    if (!isCancelled) return;
    toast.info("Recording cancelled");
    useRecordingStore.getState().resetRecording();
  }, [isCancelled]);

  // Show upload errors as toast and clear error state
  useEffect(() => {
    if (error) {
      toast.error("Upload failed", { description: error.message });
      reset();
    }
  }, [error, reset]);

  const showModal = !!uploadedFile;

  return (
    <div
      className="relative flex min-h-screen flex-col bg-[#1e1e2e]"
      onDragEnter={isRecording ? undefined : onDragEnter}
      onDragLeave={isRecording ? undefined : onDragLeave}
      onDragOver={isRecording ? undefined : onDragOver}
      onDrop={isRecording ? undefined : onDrop}
    >
      {/* Countdown overlay (3, 2, 1) before recording starts */}
      {countdown !== null && countdown > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex size-32 items-center justify-center rounded-full border-4 border-red-500/50 bg-red-500/10">
            <span className="text-6xl font-bold tabular-nums text-white">
              {countdown}
            </span>
          </div>
        </div>
      )}

      {/* Drag overlay */}
      {dragging && !isRecording && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-sky-500/10 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-sky-400/50 bg-[#2a2a3a]/80 px-16 py-12 text-center">
            <Upload className="mx-auto mb-3 size-12 text-sky-400" />
            <p className="text-lg font-medium text-white">
              Drop your image here
            </p>
          </div>
        </div>
      )}

      {isRecording || countdown !== null ? (
        /* ── Recording / countdown: minimal view ── */
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-red-500/15 animate-pulse">
              <div className="size-3 animate-pulse rounded-full bg-red-500" />
            </div>
            <p className="text-lg font-medium text-white/70">
              {countdown !== null ? "Get ready..." : "Recording in progress"}
            </p>
            <p className="text-sm text-white/35">
              {countdown !== null
                ? "Recording starts when countdown finishes."
                : "Switch to the window or tab you want to record."}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="relative flex items-center justify-between gap-3 px-6 py-4">
            <div className="flex items-center gap-3">
              <img
                src="/koneksi-logo.png"
                alt="KonekSnip"
                className="h-12 w-12 object-contain"
              />
              <span className="cursor-pointer text-2xl font-bold tracking-tight text-white">
                Konek<span className="text-sky-400">Snip</span>
              </span>
            </div>
            <div className="relative flex items-center gap-1">
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSetupOpen(!setupOpen);
                    if (historyOpen) setHistoryOpen(false);
                  }}
                  className="gap-2 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <Video className="size-5" />
                  Record Video
                </Button>
                {setupOpen && (
                  <RecordingSetup
                    onClose={() => setSetupOpen(false)}
                    onStartRecording={handleStartRecording}
                  />
                )}
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  setHistoryOpen(!historyOpen);
                  if (setupOpen) setSetupOpen(false);
                }}
                className="gap-2 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <HistoryIcon className="size-5" />
                History
              </Button>
              {historyOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    aria-hidden
                    onClick={() => setHistoryOpen(false)}
                  />
                  <UploadHistory
                    items={uploadHistory}
                    onRefresh={() =>
                      useUploadStore.getState().refreshUploadHistory()
                    }
                    onClose={() => setHistoryOpen(false)}
                  />
                </>
              )}
            </div>
          </header>

          {/* Main content */}
          <main className="flex flex-1 flex-col items-center justify-center px-4 pb-20">
            {isPending ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="size-10 animate-spin text-sky-400" />
                <p className="text-sm font-medium text-white/80">
                  Uploading...
                </p>
              </div>
            ) : (
              <>
                {/* Hero area */}
                <div className="mb-6 text-center">
                  <h1 className="mb-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    Konek<span className="text-sky-400">Snip</span>
                  </h1>
                  <p className="text-lg text-white/50">
                    Paste, drop, or pick a file — get a link to share in
                    seconds.
                  </p>
                </div>

                {/* Upload instructions */}
                <div className="w-full max-w-xl rounded-2xl border border-white/6 bg-[#2a2a3a] p-8 shadow-xl">
                  <p className="text-center text-base text-white/80">
                    Paste from your clipboard (
                    {isMac ? (
                      <>
                        <Kbd>Cmd</Kbd> + <Kbd>V</Kbd>
                      </>
                    ) : (
                      <>
                        <Kbd>Ctrl</Kbd> + <Kbd>V</Kbd>
                      </>
                    )}
                    ) to upload screenshots or images, or{" "}
                    <span className="font-medium text-white/90">
                      drag and drop
                    </span>{" "}
                    onto this page, or{" "}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer font-medium text-sky-400 underline underline-offset-2 transition-colors hover:text-sky-300"
                    >
                      pick a file
                    </button>
                    .
                  </p>
                </div>
              </>
            )}
          </main>

          {/* Footer */}
          <footer className="px-6 py-4 text-center text-xs text-white/50">
            Powered by{" "}
            <a
              href="https://koneksi.co.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-muted-foreground hover:text-white"
            >
              Koneksi
            </a>{" "}
            &mdash; Privatized, Decentralized Storage on IPFS
          </footer>
        </>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileInput}
      />

      {/* Recording floating bar */}
      {isRecording && (
        <RecordingBar
          onStop={stopRecording}
          onCancel={cancelRecording}
          onPauseResume={pauseResume}
        />
      )}

      {/* Share modal */}
      {showModal && (
        <ShareModal
          fileId={uploadedFile.file_id}
          fileName={uploadedFileName}
          onClose={handleReset}
        />
      )}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-sm font-semibold text-sky-300">
      {children}
    </kbd>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SnipPage />
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  );
}
