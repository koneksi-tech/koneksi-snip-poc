import { useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Trash2 } from "lucide-react";

interface RecordingPreviewProps {
  blob: Blob;
  onUpload: () => void;
  onDiscard: () => void;
  isUploading?: boolean;
}

export function RecordingPreview({
  blob,
  onUpload,
  onDiscard,
  isUploading,
}: RecordingPreviewProps) {
  const videoUrl = useMemo(() => URL.createObjectURL(blob), [blob]);

  useEffect(() => {
    return () => URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) onDiscard();
      }}
    >
      <div className="relative mx-4 w-full max-w-2xl rounded-xl border border-white/10 bg-[#2a2a3a] p-6 shadow-2xl">
        <button
          onClick={onDiscard}
          disabled={isUploading}
          className="absolute right-4 top-4 rounded-md p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <X className="size-5" />
        </button>

        <h2 className="mb-1 text-lg font-semibold text-white">
          Recording Complete
        </h2>
        <p className="mb-4 text-sm text-white/50">
          {sizeMB} MB &middot; Review your recording before uploading.
        </p>

        <div className="mb-4 overflow-hidden rounded-lg border border-white/10 bg-black">
          <video
            src={videoUrl}
            controls
            className="w-full"
            style={{ maxHeight: "400px" }}
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onDiscard}
            disabled={isUploading}
            className="gap-2 border-white/10 text-white/70 hover:text-white"
          >
            <Trash2 className="size-4" />
            Discard
          </Button>
          <Button
            onClick={onUpload}
            disabled={isUploading}
            className="flex-1 gap-2 bg-sky-600 text-white hover:bg-sky-500"
          >
            <Upload className="size-4" />
            {isUploading ? "Uploading..." : "Upload & Share"}
          </Button>
        </div>
      </div>
    </div>
  );
}
