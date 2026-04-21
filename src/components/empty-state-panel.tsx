type EmptyStatePanelProps = {
  title: string;
  description: string;
  eyebrow?: string;
};

export function EmptyStatePanel({
  title,
  description,
  eyebrow,
}: EmptyStatePanelProps) {
  return (
    <section className="rounded-md border border-dashed border-zinc-300 bg-white px-6 py-10 text-center shadow-sm sm:px-8">
      <div className="mx-auto max-w-2xl">
        {eyebrow ? (
          <p className="text-sm font-semibold uppercase text-emerald-700">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="mt-2 text-2xl font-bold leading-tight text-zinc-950 sm:text-3xl">
          {title}
        </h3>
        <p className="mt-4 text-base leading-7 text-zinc-600 sm:text-lg">
          {description}
        </p>
      </div>
    </section>
  );
}
