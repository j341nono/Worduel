"use client";
import clsx from "clsx";
import { useI18nStore, type Locale } from "@/lib/i18n";

export function LanguageToggle() {
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);
  return (
    <div className="flex items-center gap-1 rounded-md border border-ink-800/70 bg-ink-900/70 p-0.5 text-xs">
      <LangBtn current={locale} value="ja" label="日本語" onClick={setLocale} />
      <LangBtn current={locale} value="en" label="EN" onClick={setLocale} />
    </div>
  );
}

function LangBtn({
  current,
  value,
  label,
  onClick,
}: {
  current: Locale;
  value: Locale;
  label: string;
  onClick: (l: Locale) => void;
}) {
  return (
    <button
      onClick={() => onClick(value)}
      className={clsx(
        "rounded px-2 py-1 transition",
        current === value
          ? "bg-accent-500 text-white"
          : "text-ink-200 hover:text-white",
      )}
      aria-pressed={current === value}
    >
      {label}
    </button>
  );
}
