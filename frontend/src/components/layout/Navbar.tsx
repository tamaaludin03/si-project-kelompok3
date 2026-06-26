"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu, X, Bell, HelpCircle, ChevronDown, User, LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { API_BASE_URL } from "@/lib/api";
import { useSidebar } from "./SidebarContext";

// ─── Helpers ────────────────────────────────────────────────────────────────
function readUser() {
  if (typeof window === "undefined") return { name: "User", jabatan: "", role: "" };
  const raw =
    localStorage.getItem("simciUser") ||
    localStorage.getItem("user") ||
    localStorage.getItem("currentUser");
  if (raw) {
    try {
      const u = JSON.parse(raw);
      return {
        name: u?.nama || u?.name || u?.username || localStorage.getItem("nama") || "User",
        jabatan: u?.jabatan || localStorage.getItem("jabatan") || "",
        role: u?.internal_role || u?.role || localStorage.getItem("internal_role") || localStorage.getItem("role") || "",
      };
    } catch { /* ignore */ }
  }
  return {
    name: localStorage.getItem("nama") || localStorage.getItem("username") || "User",
    jabatan: localStorage.getItem("jabatan") || "",
    role: localStorage.getItem("internal_role") || localStorage.getItem("role") || "",
  };
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}

function clearSession() {
  [
    "token", "nip", "role", "internal_role",
    "simciUser", "user", "currentUser", "nama", "username", "jabatan",
  ].forEach((k) => localStorage.removeItem(k));
}

function roleLabel(role: string) {
  const r = (role || "").toLowerCase();
  const map: Record<string, string> = {
    pegawai: "Pegawai", kaur: "Kepala Unit", kabag: "Kepala Bagian", sdm: "SDM",
    admin: "Admin", it: "Admin", direksi: "Direksi", direktur: "Direktur",
    "direktur-administrasi": "Direktur Administrasi",
    direktur_administrasi: "Direktur Administrasi",
    "kepala-administrasi": "Kepala Administrasi",
    kepala_administrasi: "Kepala Administrasi",
  };
  return map[r] || (role ? role.charAt(0).toUpperCase() + role.slice(1) : "Akun aktif");
}

const FINAL = [
  "disetujui_final", "disetujui_direktur", "selesai",
  "ditolak_kaur", "ditolak_kabag", "ditolak_direktur", "direset_admin",
];

// ─── Navbar ─────────────────────────────────────────────────────────────────
export default function Navbar() {
  const { isMobile, mobileOpen, toggle } = useSidebar();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState({ name: "User", jabatan: "", role: "" });
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(readUser());
  }, []);

  // Badge dot best-effort: ada update final terbaru pada pengajuan milik user
  useEffect(() => {
    let alive = true;
    async function load() {
      const identifier =
        localStorage.getItem("nip") ||
        (() => { try { const r = localStorage.getItem("simciUser"); const u = r ? JSON.parse(r) : null; return u?.nip || u?.username || null; } catch { return null; } })() ||
        localStorage.getItem("username");
      if (!identifier) return;
      const token = localStorage.getItem("token");
      const h: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const [cr, ir] = await Promise.all([
          fetch(`${API_BASE_URL}/cuti/mine/${identifier}`, { headers: h, cache: "no-store" }),
          fetch(`${API_BASE_URL}/izin/mine/${identifier}`, { headers: h, cache: "no-store" }),
        ]);
        const items: any[] = [];
        if (cr.ok) { const d = await cr.json(); items.push(...(d?.data?.items ?? d?.data ?? [])); }
        if (ir.ok) { const d = await ir.json(); items.push(...(d?.data?.items ?? d?.data ?? [])); }
        if (!alive) return;
        setHasUnread(items.some((i) => FINAL.includes(String(i.status || "").toLowerCase())));
      } catch { /* diam — dot tidak tampil */ }
    }
    load();
    return () => { alive = false; };
  }, []);

  function handleLogout() {
    clearSession();
    try { sessionStorage.setItem("logout_toast", "1"); } catch {}
    router.push("/login");
  }

  const av = initials(user.name);

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center gap-1.5 border-b border-slate-200 bg-white px-2.5 sm:gap-3 sm:px-4">
      {/* ── Kiri: hamburger + logo ─────────────────────────────────── */}
      <button
        type="button"
        onClick={toggle}
        aria-label="Buka/tutup menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        {mounted && isMobile && mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <img src="/logo.png" alt="RSGM" className="h-7 w-7 object-contain" />
        </span>
        <span className="hidden leading-none sm:block">
          <span className="block text-sm font-black tracking-tight text-slate-900">SIMCI</span>
          <span className="mt-0.5 block text-[10px] font-medium text-slate-400">RSGM</span>
        </span>
      </Link>

      {/* Pendorong agar kontrol kanan menempel ke kanan */}
      <div className="flex-1" />

      {/* ── Kanan: kontrol ─────────────────────────────────────────── */}
      {/* Notifikasi + badge dot */}
      <Link
        href="/notifikasi"
        aria-label="Notifikasi"
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <Bell size={19} />
        {mounted && hasUnread && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />
        )}
      </Link>

      {/* Help (sembunyi di mobile) — placeholder, belum ada halaman bantuan */}
      <button
        type="button"
        aria-label="Bantuan"
        title="Bantuan"
        className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:flex"
      >
        <HelpCircle size={19} />
      </button>

      <div className="mx-0.5 hidden h-6 w-px bg-slate-200 sm:block" />

      {/* Profil */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex shrink-0 items-center gap-2 rounded-xl p-1 pr-1.5 outline-none transition-colors hover:bg-slate-100 sm:pr-2"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-peg-brand text-[11px] font-black text-white select-none">
              {mounted ? av : "?"}
            </span>
            <span className="hidden min-w-0 text-left md:block">
              <span className="block max-w-[160px] truncate text-sm font-bold leading-tight text-slate-800">
                {mounted ? user.name : "User"}
              </span>
              <span className="block max-w-[160px] truncate text-[11px] leading-tight text-slate-400">
                {mounted ? roleLabel(user.role) : ""}
              </span>
            </span>
            <ChevronDown size={15} className="hidden shrink-0 text-slate-400 md:block" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={8} className="w-52">
          <div className="border-b border-slate-100 px-3 py-2.5 md:hidden">
            <p className="truncate text-sm font-bold text-slate-800">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{roleLabel(user.role)}</p>
          </div>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/profil">
              <User size={14} className="mr-2" />
              Profil Saya
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer text-rose-600 focus:bg-rose-50 focus:text-rose-600"
            onClick={handleLogout}
          >
            <LogOut size={14} className="mr-2" />
            Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

    </header>
  );
}
