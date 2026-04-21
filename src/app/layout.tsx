import type { Metadata } from "next";
import { AppDisclaimerFooter } from "@/components/app-disclaimer-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Safety Culture Reflection Assistant",
  description:
    "An OHS seminar activity for collecting anonymous internship observations and discussing workplace safety culture.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <div className="flex-1">{children}</div>
        <AppDisclaimerFooter />
      </body>
    </html>
  );
}
