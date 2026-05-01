import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "SIMCI RSGM",
    template: "%s | SIMCI RSGM",
  },
  description: "Sistem Informasi Manajemen Cuti & Izin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--background)] text-[var(--text)] antialiased">
        <div className="relative min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[var(--primary-soft)]/40 via-white/0 to-transparent" />

          <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/72">
            <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 md:h-16 md:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--border)] bg-white shadow-sm">
                  <span className="text-sm font-bold tracking-wide text-[var(--primary)]">
                    S
                  </span>
                </div>

                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-semibold tracking-[0.02em] text-[var(--text)]">
                    SIMCI RSGM
                  </p>
                  <p className="truncate text-[11px] text-[var(--text-muted)] md:text-xs">
                    Sistem Informasi Manajemen Cuti & Izin
                  </p>
                </div>
              </div>

              <div className="hidden items-center gap-2 md:flex">
                <div className="rounded-full border border-[var(--border)] bg-white/90 px-3 py-1.5 text-[11px] font-medium text-[var(--text-muted)] shadow-sm">
                  Internal Employee System
                </div>
              </div>
            </div>
          </header>

          <main className="relative">
            <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6 md:py-7">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}