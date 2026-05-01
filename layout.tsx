"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

export default function PegawaiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [nama, setNama] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const storedNama = localStorage.getItem("nama");
    if (storedNama) setNama(storedNama);
  }, []);

  function confirmLogout() {
    localStorage.removeItem("nip");
    localStorage.removeItem("nama");
    localStorage.removeItem("role");
    localStorage.removeItem("token");
    router.push("/login");
  }

  const menu = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/cuti/ajukan", label: "Ajukan Cuti" },
    { href: "/izin/ajukan", label: "Ajukan Izin" },
    { href: "/riwayat", label: "Riwayat" },
    { href: "/profil", label: "Profil" },
  ];

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <aside className="w-56 bg-white border-r border-[var(--border)] flex flex-col">
        <div className="px-4 py-4 border-b border-[var(--border)]">
          <p className="text-sm font-semibold text-[var(--primary)]">SIMCI</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            Sistem Informasi Cuti & Izin
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {menu.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "text-[var(--text)] hover:bg-[var(--surface-soft)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)] space-y-1">
          <p className="font-medium truncate">{nama || "Pengguna"}</p>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="text-[11px] text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
          >
            Keluar
          </button>
        </div>
      </aside>

      <div className="flex-1">{children}</div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[var(--text)]">Keluar akun?</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Anda yakin ingin logout dari akun ini?
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-soft)]"
              >
                Batal
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
              >
                Ya, keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}