"use client";
import clsx from "clsx";
import { useEffect } from "react";

export function CenterFlash({
  text,
  tone,
  onDone,
  ms = 1600,
}: {
  text: string;
  tone: "good" | "bad";
  onDone: () => void;
  ms?: number;
}) {
  useEffect(() => {
    const h = setTimeout(onDone, ms);
    return () => clearTimeout(h);
  }, [text, ms, onDone]);
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      <div
        className={clsx(
          "animate-flash-pop rounded-2xl px-8 py-6 text-center shadow-soft",
          tone === "good" ? "bg-good/95 text-white" : "bg-bad/95 text-white",
        )}
      >
        <div className="text-xl font-bold">{text}</div>
      </div>
    </div>
  );
}
