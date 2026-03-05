import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  removeFromUploadHistory,
  clearUploadHistory,
  type StoredUpload,
} from "@/lib/upload-history";
import { Copy, Check, ExternalLink, ImageIcon, Trash2, X } from "lucide-react";

interface UploadHistoryProps {
  items: StoredUpload[];
  onRefresh: () => void;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function HistoryItem({
  item,
  onRemove,
  onCopy,
}: {
  item: StoredUpload;
  onRemove: () => void;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(item.share_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy();
    } catch {
      onCopy();
    }
  }

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 transition-colors hover:bg-white/10">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/10">
        <ImageIcon className="size-4 text-white/60" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white/90">
          {item.file_name}
        </p>
        <p className="truncate text-xs text-white/40">
          {formatDate(item.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={handleCopy}
          className="text-white/60 hover:text-white"
          title="Copy link"
        >
          {copied ? (
            <Check className="size-4 text-emerald-400" />
          ) : (
            <Copy className="size-4" />
          )}
        </Button>
        <a
          href={item.share_url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          title="Open in new tab"
        >
          <ExternalLink className="size-4" />
        </a>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onRemove}
          className="text-white/40 hover:text-red-400"
          title="Remove from list"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function UploadHistory({
  items,
  onRefresh,
  onClose,
}: UploadHistoryProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  function handleRemove(fileId: string) {
    removeFromUploadHistory(fileId);
    onRefresh();
  }

  function handleClearAll() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearUploadHistory();
    setConfirmClear(false);
    onRefresh();
  }

  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-full min-w-[360px] max-w-[420px] rounded-xl border border-white/10 bg-[#2a2a3a] shadow-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Your images</h3>
        <div className="flex items-center gap-1">
          {items.length > 0 && (
            <Button
              size="xs"
              variant="ghost"
              onClick={handleClearAll}
              className={
                confirmClear
                  ? " hover:text-red-300"
                  : "text-white/50 hover:text-white/80"
              }
            >
              {confirmClear ? "Click again to clear all" : "Clear all"}
            </Button>
          )}
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/40">
            No uploads yet. Paste or drop an image to get started.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.file_id}>
                <HistoryItem
                  item={item}
                  onRemove={() => handleRemove(item.file_id)}
                  onCopy={() => {}}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
