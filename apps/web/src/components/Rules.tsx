"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n";

export function Rules() {
  const t = useT();
  const [open, setOpen] = useState(true);

  const sections = [1, 2, 3, 4, 5].map((i) => ({
    title: t(`rules.section${i}Title`),
    body: t(`rules.section${i}Body`),
  }));

  return (
    <div className="card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-lg font-semibold tracking-tight">{t("home.rulesTitle")}</span>
        <span className="text-ink-200" aria-hidden="true">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <ol className="mt-4 space-y-4 text-sm">
          {sections.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-500/20 text-xs font-bold text-accent-400">
                {i + 1}
              </span>
              <div>
                <div className="font-semibold text-ink-100">{s.title}</div>
                <p className="mt-1 text-ink-200 leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
