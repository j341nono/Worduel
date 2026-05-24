"use client";
import type { ReactNode } from "react";
import { useHydrateLocale } from "@/lib/i18n";

// Reads the persisted locale from localStorage after mount.
export function I18nProvider({ children }: { children: ReactNode }) {
  useHydrateLocale();
  return <>{children}</>;
}
