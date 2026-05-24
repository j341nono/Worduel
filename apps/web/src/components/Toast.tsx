"use client";
import clsx from "clsx";
import { useEffect } from "react";

export type ToastTone = "info" | "good" | "bad";

export function Toast({
  text,
  tone = "info",
  big = false,
  onDone,
  ms = 2200,
}: {
  text: string;
  tone?: ToastTone;
  big?: boolean;
  onDone?: () => void;
  ms?: number;
}) {
  useEffect(() => {
    const handle = setTimeout(() => onDone?.(), ms);
    return () => clearTimeout(handle);
  }, [text, ms, onDone]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        "pointer-events-none fixed left-1/2 -translate-x-1/2 rounded-lg shadow-soft animate-toast-in",
        big ? "bottom-24 px-5 py-3 text-base font-semibold" : "bottom-6 px-3 py-2 text-sm",
        tone === "good" && "bg-good text-white",
        tone === "bad" && "bg-bad text-white",
        tone === "info" && "bg-ink-800 text-ink-50 border border-ink-800/60",
      )}
    >
      {text}
    </div>
  );
}

export function ToastStack({
  items,
  onDismiss,
}: {
  items: { id: string; text: string; tone: ToastTone; big?: boolean }[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 pb-6">
      {items.map((t, idx) => (
        <div
          key={t.id}
          className={clsx(
            "pointer-events-auto rounded-lg shadow-soft animate-toast-in",
            t.big ? "px-5 py-3 text-base font-semibold" : "px-3 py-2 text-sm",
            t.tone === "good" && "bg-good text-white",
            t.tone === "bad" && "bg-bad text-white",
            t.tone === "info" && "bg-ink-800 text-ink-50 border border-ink-800/60",
          )}
          style={{ opacity: 1 - idx * 0.1 }}
        >
          {/* Auto-dismiss via inner Toast timer */}
          <AutoDismiss id={t.id} ms={2200 + idx * 200} onDone={onDismiss}>
            {t.text}
          </AutoDismiss>
        </div>
      ))}
    </div>
  );
}

function AutoDismiss({
  id,
  ms,
  onDone,
  children,
}: {
  id: string;
  ms: number;
  onDone: (id: string) => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const h = setTimeout(() => onDone(id), ms);
    return () => clearTimeout(h);
  }, [id, ms, onDone]);
  return <>{children}</>;
}
