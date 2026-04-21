import Image from "next/image";
import Link from "next/link";
import {
  ChartNoAxesCombined,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SessionQrPreview } from "@/components/session-qr-preview";
import { buildSessionPath } from "@/lib/routes";

const demoSessionCode = "DEMO";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7faf8] text-zinc-950">
      <section className="relative flex min-h-[68svh] flex-col overflow-hidden bg-zinc-950 px-6 py-6 text-white sm:px-10 lg:px-14">
        <Image
          src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1800&q=80"
          alt="Students and colleagues gathered around a workplace discussion table"
          fill
          className="object-cover opacity-45"
          priority
        />
        <div className="absolute inset-0 bg-black/55" />

        <nav className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-emerald-400 text-zinc-950">
              <ShieldCheck size={22} aria-hidden="true" />
            </span>
            <span className="text-base font-semibold">
              Safety Culture Reflection Assistant
            </span>
          </div>
          <span className="hidden rounded-md border border-white/25 px-3 py-2 text-sm text-white/85 sm:inline-flex">
            OHS seminar activity
          </span>
        </nav>

        <div className="relative z-10 flex flex-1 items-center py-12">
          <div className="max-w-4xl">
            <p className="mb-5 inline-flex rounded-md bg-amber-300 px-3 py-2 text-sm font-semibold text-zinc-950">
              Internship seminar | Safety Culture
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
              Turn anonymous placement observations into a safer class
              conversation.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85">
              Students submit anonymised workplace reflections by QR code.
              OpenAI can help identify safety culture themes, or the app can
              run in a no-cost manual seminar mode. The class uses the shared
              wall to discuss patterns, tensions, and practical OHS lessons.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={buildSessionPath("submit", demoSessionCode)}
                className="inline-flex h-12 items-center justify-center rounded-md bg-emerald-400 px-5 text-base font-semibold text-zinc-950 transition hover:bg-emerald-300"
              >
                Try student submit
              </Link>
              <Link
                href={buildSessionPath("wall", demoSessionCode)}
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/30 px-5 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Open class wall
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-14 sm:px-10 lg:px-14">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-700">
              Built for live discussion
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight text-zinc-950 sm:text-4xl">
              A focused activity for noticing what safety culture feels like in
              real workplaces.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-700">
              The app is being set up for quick seminar sessions: one QR code,
              anonymous student reflections, AI-supported analysis, and
              moderation controls for the presenter.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: MessageSquareText,
                  title: "Reflect",
                  body: "Students describe a workplace safety culture moment without naming people or organisations.",
                },
                {
                  icon: Sparkles,
                  title: "Analyse",
                  body: "Use OpenAI for richer automated analysis, or run the built-in manual seminar mode with no API cost.",
                },
                {
                  icon: ChartNoAxesCombined,
                  title: "Discuss",
                  body: "Pinned responses guide class conversation about leadership, reporting, norms, and learning.",
                },
              ].map((item) => (
                <article
                  className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm"
                  key={item.title}
                >
                  <item.icon
                    className="mb-4 text-emerald-700"
                    size={24}
                    aria-hidden="true"
                  />
                  <h3 className="text-lg font-semibold text-zinc-950">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-zinc-200 bg-white p-6 shadow-sm">
            <SessionQrPreview sessionCode={demoSessionCode} />
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-white px-6 py-10 sm:px-10 lg:px-14">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-red-700">
              Privacy-first classroom setup
            </p>
            <p className="mt-2 max-w-3xl text-base leading-7 text-zinc-700">
              Students are prompted to anonymise people, companies, and sites
              before submitting. Presenter controls will support hiding,
              pinning, deleting, and clearing session responses.
            </p>
          </div>
          <Link
            href={buildSessionPath("admin", demoSessionCode)}
            className="inline-flex h-12 items-center justify-center rounded-md bg-zinc-950 px-5 text-base font-semibold text-white transition hover:bg-zinc-800"
          >
            Open presenter admin
          </Link>
        </div>
      </section>
    </main>
  );
}
