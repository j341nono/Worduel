"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { LanguageToggle } from "./LanguageToggle";

export function HeaderNav() {
  const t = useT();
  return (
    <header className="mb-6 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 font-bold text-white shadow-soft">
          L
        </div>
        <div className="leading-tight">
          <div className="text-lg font-semibold tracking-tight">{t("app.name")}</div>
          <div className="text-xs text-ink-200">{t("app.tagline")}</div>
        </div>
      </Link>
      <div className="flex items-center gap-4">
        <nav className="text-sm text-ink-200">
          <Link className="hover:text-white" href="/cpu">{t("nav.cpu")}</Link>
          <span className="mx-3 text-ink-800">/</span>
          <Link className="hover:text-white" href="/online">{t("nav.online")}</Link>
        </nav>
        <LanguageToggle />
      </div>
    </header>
  );
}
