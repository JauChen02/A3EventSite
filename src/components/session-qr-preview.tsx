"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { buildPublicAppUrlWithOrigin } from "@/lib/env";
import { buildSessionPath } from "@/lib/routes";

type SessionQrPreviewProps = {
  sessionCode: string;
};

export function SessionQrPreview({ sessionCode }: SessionQrPreviewProps) {
  const submitPath = buildSessionPath("submit", sessionCode);
  const origin = useWindowOrigin();
  const qrValue = buildPublicAppUrlWithOrigin(submitPath, origin);

  return (
    <div>
      <p className="text-sm font-semibold uppercase text-emerald-700">
        Session QR
      </p>
      <h2 className="mt-3 text-2xl font-bold leading-tight text-zinc-950">
        Start with session code {sessionCode}.
      </h2>
      <p className="mt-4 text-base leading-7 text-zinc-700">
        Students scan the QR code, open the submit page, and share one concise
        observation from their internship.
      </p>

      <div className="mt-6 inline-flex rounded-md border border-zinc-200 bg-[#f7faf8] p-4">
        <QRCodeSVG
          value={qrValue}
          size={164}
          marginSize={2}
          bgColor="#f7faf8"
          fgColor="#171717"
          title={`QR code for ${sessionCode} submissions`}
        />
      </div>

      <div className="mt-6 grid gap-3">
        <Link
          className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:border-emerald-500"
          href={submitPath}
        >
          Student path: {submitPath}
        </Link>
        <Link
          className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:border-emerald-500"
          href={buildSessionPath("wall", sessionCode)}
        >
          Wall path: {buildSessionPath("wall", sessionCode)}
        </Link>
        <Link
          className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:border-emerald-500"
          href={buildSessionPath("admin", sessionCode)}
        >
          Admin path: {buildSessionPath("admin", sessionCode)}
        </Link>
      </div>
    </div>
  );
}

function useWindowOrigin() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => "",
  );
}

function subscribeToNothing() {
  return () => undefined;
}
