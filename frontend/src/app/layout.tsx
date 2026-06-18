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
      <body className="relative min-h-screen overflow-x-hidden bg-[#f7f5fb] antialiased">
        {/* CONTENT */}
        <div className="relative min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}