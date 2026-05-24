import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { I18nProvider } from "@/components/I18nProvider";
import { HeaderNav } from "@/components/HeaderNav";

export const metadata: Metadata = {
  title: "Worduel — 3文字単語のリアルタイム対戦",
  description:
    "60秒の1対1リアルタイム対戦。トークンを使って3文字の単語パズルを送り合い、先に解いた方が高得点。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-ink-950 text-ink-50 font-display antialiased">
        <I18nProvider>
          <div className="mx-auto max-w-5xl px-4 py-6">
            <HeaderNav />
            <main>{children}</main>
            <Footer />
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="mt-12 text-center text-xs text-ink-200/60">
      MVP build
    </footer>
  );
}
