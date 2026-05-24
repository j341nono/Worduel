"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { Rules } from "@/components/Rules";

export default function HomePage() {
  const t = useT();
  return (
    <section className="mt-6 space-y-6">
      <div className="card">
        <h1 className="text-3xl font-semibold tracking-tight">{t("app.name")}</h1>
        <p className="mt-2 max-w-2xl text-ink-200 leading-relaxed">{t("home.description")}</p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link href="/cpu" className="btn-primary">{t("home.startCpu")}</Link>
          <Link href="/online?mode=create" className="btn-secondary">{t("home.createRoom")}</Link>
          <Link href="/online?mode=join" className="btn-secondary">{t("home.joinRoom")}</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm">
        <Rule title={t("home.rule1Title")} body={t("home.rule1Body")} />
        <Rule title={t("home.rule2Title")} body={t("home.rule2Body")} />
        <Rule title={t("home.rule3Title")} body={t("home.rule3Body")} />
      </div>

      <Rules />
    </section>
  );
}

function Rule({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <div className="text-ink-100 font-semibold">{title}</div>
      <div className="mt-1 text-ink-200">{body}</div>
    </div>
  );
}
