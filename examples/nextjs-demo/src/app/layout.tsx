import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backend Template Demo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen">
        <Providers>
          <nav className="border-b border-zinc-800 px-6 py-3 flex items-center gap-6">
            <span className="text-sm font-semibold text-zinc-400 tracking-wide uppercase">
              Demo
            </span>
            <Link href="/" className="text-sm text-zinc-300 hover:text-white">
              Health
            </Link>
            <Link
              href="/messages"
              className="text-sm text-zinc-300 hover:text-white"
            >
              Messages
            </Link>
            <Link
              href="/rate-limit"
              className="text-sm text-zinc-300 hover:text-white"
            >
              Rate Limit
            </Link>
            <Link
              href="/uploads"
              className="text-sm text-zinc-300 hover:text-white"
            >
              Uploads
            </Link>
            <Link
              href="/errorping"
              className="text-sm text-zinc-300 hover:text-white"
            >
              Errorping
            </Link>
          </nav>
          <main className="max-w-3xl mx-auto px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
