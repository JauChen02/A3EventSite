import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { buildSessionPath, type SessionArea } from "@/lib/routes";

type SessionPlaceholderProps = {
  area: SessionArea;
  eyebrow: string;
  title: string;
  description: string;
  sessionCode: string;
};

export function SessionPlaceholder({
  area,
  eyebrow,
  title,
  description,
  sessionCode,
}: SessionPlaceholderProps) {
  const links: Array<{ label: string; area: SessionArea }> = [
    { label: "Submit", area: "submit" },
    { label: "Wall", area: "wall" },
    { label: "Admin", area: "admin" },
  ];

  return (
    <main className="min-h-screen bg-[#f7faf8] px-6 py-8 text-zinc-950 sm:px-10 lg:px-14">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 transition hover:text-zinc-950"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Home
        </Link>

        <section className="mt-10 rounded-md border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-emerald-700">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
                {title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-700">
                {description}
              </p>
            </div>
            <div className="rounded-md bg-amber-300 px-4 py-3 text-sm font-bold text-zinc-950">
              Session {sessionCode}
            </div>
          </div>

          <div className="mt-8 rounded-md border border-dashed border-zinc-300 bg-[#f7faf8] p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-md bg-emerald-500 text-white">
                <ShieldCheck size={22} aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold text-zinc-950">
                  Foundation route ready
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-700">
                  The full {area} workflow will connect here after the database,
                  analysis, and moderation logic is added.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {links.map((link) => (
              <Link
                className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-200 px-4 text-sm font-semibold transition hover:border-emerald-500"
                href={buildSessionPath(link.area, sessionCode)}
                key={link.area}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
