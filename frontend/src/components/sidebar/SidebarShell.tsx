"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Calendar, FileText, Clock, Bell, User, Users,
  CheckSquare, BarChart2, Settings, Mail, AlertTriangle, ChevronRight,
  LogOut, ClipboardList, Database, Building, Shield,
  Layers, FileCheck, Activity, BookOpen, CreditCard, Stethoscope,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { API_BASE_URL as _API_BASE_URL } from "@/lib/api";
import { useSidebar } from "@/components/layout/SidebarContext";

// ─── Exports ──────────────────────────────────────────────────────────────────
export const API_BASE_URL = _API_BASE_URL;

export type CountMap = Record<string, number>;

export type SidebarMenuItem = {
  label: string;
  href?: string;
  countKey?: string;
  icon?: React.ReactNode;
  children?: SidebarMenuItem[];
};

export type SidebarSection = {
  title: string;
  menus: SidebarMenuItem[];
};

export async function fetchJson(url: string) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) return null;
  return res.json();
}

export function getTotal(payload: any): number {
  if (!payload) return 0;
  if (typeof payload?.data?.total === "number") return payload.data.total;
  if (Array.isArray(payload?.data?.items)) return payload.data.items.length;
  if (Array.isArray(payload?.data)) return payload.data.length;
  if (Array.isArray(payload)) return payload.length;
  return 0;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function readUser() {
  if (typeof window === "undefined") return { name: "User", jabatan: "" };
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
      };
    } catch { /* ignore */ }
  }
  return {
    name: localStorage.getItem("nama") || localStorage.getItem("username") || "User",
    jabatan: localStorage.getItem("jabatan") || "",
  };
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function clearSession() {
  [
    "token", "nip", "role", "internal_role",
    "simciUser", "user", "currentUser", "nama", "username", "jabatan",
  ].forEach((k) => localStorage.removeItem(k));
}

function resolveIcon(label: string, provided?: React.ReactNode): React.ReactNode {
  if (provided) return provided;
  const l = label.toLowerCase();
  if (l.includes("dashboard") || l.includes("beranda")) return <LayoutDashboard size={16} />;
  if (l.includes("cuti") && !l.includes("approval") && !l.includes("persetujuan")) return <Calendar size={16} />;
  if (l.includes("izin") && !l.includes("approval") && !l.includes("persetujuan")) return <FileText size={16} />;
  if (l.includes("riwayat") || l.includes("history")) return <Clock size={16} />;
  if (l.includes("notifikasi") || l.includes("notif")) return <Bell size={16} />;
  if (l.includes("profil") || l.includes("profile")) return <User size={16} />;
  if (l.includes("approval") || l.includes("persetujuan")) return <CheckSquare size={16} />;
  if (l.includes("laporan") || l.includes("report") || l.includes("statistik")) return <BarChart2 size={16} />;
  if (l.includes("pegawai") || l.includes("karyawan")) return <Users size={16} />;
  if (l.includes("admin") || l.includes("pengaturan")) return <Settings size={16} />;
  if (l.includes("surat") || l.includes("masuk")) return <Mail size={16} />;
  if (l.includes("urgent") || l.includes("darurat")) return <AlertTriangle size={16} />;
  if (l.includes("rekap") || l.includes("monitoring")) return <Activity size={16} />;
  if (l.includes("data")) return <Database size={16} />;
  if (l.includes("unit") || l.includes("bagian") || l.includes("cabang")) return <Building size={16} />;
  if (l.includes("akses") || l.includes("role") || l.includes("hak")) return <Shield size={16} />;
  if (l.includes("str") || l.includes("sip") || l.includes("lisensi")) return <Stethoscope size={16} />;
  if (l.includes("manajemen") || l.includes("kelola")) return <ClipboardList size={16} />;
  if (l.includes("verifikasi") || l.includes("validasi")) return <FileCheck size={16} />;
  if (l.includes("ajukan") || l.includes("submit") || l.includes("buat")) return <BookOpen size={16} />;
  if (l.includes("gaji") || l.includes("slip")) return <CreditCard size={16} />;
  return <Layers size={16} />;
}

// ─── Logout modal ─────────────────────────────────────────────────────────────
function LogoutModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onCancel} />
      <div className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40">
        <div className="flex flex-col items-center px-6 pt-6 pb-4 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
            <LogOut className="h-5 w-5 text-rose-500" />
          </div>
          <p className="text-base font-bold text-slate-800">Keluar dari sistem?</p>
          <p className="mt-1 text-sm text-slate-400 leading-relaxed">
            Sesi Anda akan diakhiri dan Anda akan diarahkan ke halaman login.
          </p>
        </div>
        <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-[0.98]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-rose-500 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 active:scale-[0.98]"
          >
            Ya, Keluar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────
function NavItem({
  menu,
  counts,
  isExpanded,
  onNavClick,
}: {
  menu: SidebarMenuItem;
  counts: CountMap;
  isExpanded: boolean;
  onNavClick?: () => void;
}) {
  const pathname = usePathname();
  const href = menu.href || "#";
  const menuPath = href.split("?")[0];
  const active = pathname === menuPath || pathname.startsWith(`${menuPath}/`);
  const count = menu.countKey && counts[menu.countKey] > 0 ? counts[menu.countKey] : 0;
  const icon = resolveIcon(menu.label, menu.icon as React.ReactNode | undefined);

  return (
    <Link
      href={href}
      title={!isExpanded ? menu.label : undefined}
      onClick={onNavClick}
      className={`group flex items-center rounded-xl px-3 py-2.5 transition-all duration-150 ${
        active
          ? "bg-peg-surface-soft text-peg-brand"
          : "text-slate-500 hover:bg-peg-surface-soft hover:text-slate-700"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center transition-colors ${
          active ? "text-peg-brand" : "text-slate-400 group-hover:text-peg-brand-mid"
        }`}
      >
        {icon}
      </span>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.span
            key="label"
            initial={{ opacity: 0, width: 0, marginLeft: 0 }}
            animate={{ opacity: 1, width: "auto", marginLeft: 12 }}
            exit={{ opacity: 0, width: 0, marginLeft: 0 }}
            transition={{ duration: 0.18 }}
            className="min-w-0 flex-1 truncate text-sm font-medium overflow-hidden whitespace-nowrap"
          >
            {menu.label}
          </motion.span>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {isExpanded && count > 0 && (
          <motion.span
            key="badge"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="ml-auto shrink-0 rounded-full bg-peg-surface-tint px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none text-peg-brand-hover"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

// ─── Collapsible nav item ──────────────────────────────────────────────────────
function CollapsibleNavItem({
  menu,
  counts,
  isExpanded,
  onNavClick,
}: {
  menu: SidebarMenuItem;
  counts: CountMap;
  isExpanded: boolean;
  onNavClick?: () => void;
}) {
  const pathname = usePathname();
  const children = menu.children || [];

  const isChildActive = children.some((c) => {
    const p = (c.href || "").split("?")[0];
    return pathname === p || pathname.startsWith(`${p}/`);
  });

  const [open, setOpen] = useState(isChildActive);

  useEffect(() => {
    if (!isExpanded) setOpen(false);
  }, [isExpanded]);

  useEffect(() => {
    if (isChildActive && isExpanded) setOpen(true);
  }, [isChildActive, isExpanded]);

  const count = menu.countKey && counts[menu.countKey] > 0 ? counts[menu.countKey] : 0;
  const icon = resolveIcon(menu.label, menu.icon as React.ReactNode | undefined);

  return (
    <div>
      <button
        type="button"
        title={!isExpanded ? menu.label : undefined}
        onClick={() => isExpanded && setOpen((o) => !o)}
        className={`group flex w-full items-center rounded-xl px-3 py-2.5 transition-all duration-150 ${
          isChildActive
            ? "bg-peg-surface-soft text-peg-brand"
            : "text-slate-500 hover:bg-peg-surface-soft hover:text-slate-700"
        }`}
      >
        <span className={`flex h-4 w-4 shrink-0 items-center justify-center transition-colors ${
          isChildActive ? "text-peg-brand" : "text-slate-400 group-hover:text-peg-brand-mid"
        }`}>
          {icon}
        </span>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.span
              key="label"
              initial={{ opacity: 0, width: 0, marginLeft: 0 }}
              animate={{ opacity: 1, width: "auto", marginLeft: 12 }}
              exit={{ opacity: 0, width: 0, marginLeft: 0 }}
              transition={{ duration: 0.18 }}
              className="min-w-0 flex-1 truncate text-sm font-medium overflow-hidden whitespace-nowrap text-left"
            >
              {menu.label}
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.span
              key="controls"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="ml-auto flex shrink-0 items-center gap-1"
            >
              {count > 0 && (
                <span className="rounded-full bg-peg-surface-tint px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none text-peg-brand-hover">
                  {count}
                </span>
              )}
              <ChevronRight
                size={12}
                className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
              />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && open && (
          <motion.div
            key="children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="ml-5 mt-0.5 space-y-0.5 border-l-2 border-slate-100 pl-3">
              {children.map((child) => (
                <NavItem
                  key={child.href || child.label}
                  menu={child}
                  counts={counts}
                  isExpanded={isExpanded}
                  onNavClick={onNavClick}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────
export function SidebarShell({
  menus,
  sections,
  counts,
}: {
  // title/subtitle masih diterima dari wrapper lama, namun brand kini di Navbar
  title?: string;
  subtitle?: string;
  menus?: SidebarMenuItem[];
  sections?: SidebarSection[];
  counts: CountMap;
}) {
  const router = useRouter();
  const { isMobile, isExpanded, mobileOpen, effectiveExpanded, mounted, closeMobile, onNavClick } =
    useSidebar();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState({ name: "User", jabatan: "" });
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => { setUser(readUser()); }, []);

  const av = initials(user.name) || "?";

  const finalSections: SidebarSection[] =
    sections && sections.length > 0
      ? sections
      : [{ title: "Menu", menus: menus || [] }];

  return (
    <>
      {/* ── Sidebar (di bawah navbar, top-14) ───────────────────────────── */}
      <motion.aside
        className="fixed left-0 top-14 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-[1px_0_12px_0_rgba(148,163,184,0.12)]"
        style={{ zIndex: 500 }}
        animate={
          isMobile
            ? { x: mobileOpen ? 0 : -280, width: 240 }
            : { x: 0, width: isExpanded ? 240 : 56 }
        }
        initial={false}
        transition={{ type: "tween", duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* ── Nav ─────────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2">
          <div className="space-y-4">
            {finalSections.map((section) => (
              <div key={section.title}>
                <AnimatePresence initial={false}>
                  {effectiveExpanded && (
                    <motion.p
                      key="section-title"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="mb-1 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap overflow-hidden"
                    >
                      {section.title}
                    </motion.p>
                  )}
                </AnimatePresence>
                <div className="space-y-0.5">
                  {section.menus.map((menu) =>
                    menu.children?.length ? (
                      <CollapsibleNavItem
                        key={menu.label}
                        menu={menu}
                        counts={counts}
                        isExpanded={effectiveExpanded}
                        onNavClick={onNavClick}
                      />
                    ) : (
                      <NavItem
                        key={menu.href || menu.label}
                        menu={menu}
                        counts={counts}
                        isExpanded={effectiveExpanded}
                        onNavClick={onNavClick}
                      />
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* ── User card ───────────────────────────────────────────────── */}
        <div className="shrink-0 p-2 border-t border-slate-100">
          <DropdownMenu onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`flex w-full items-center rounded-xl p-2 transition-colors hover:bg-slate-100 outline-none ${
                  effectiveExpanded ? "gap-2" : "justify-center"
                }`}
              >
                <div className="relative shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-peg-brand text-[11px] font-black text-white select-none">
                    {av}
                  </div>
                  <span className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border-[1.5px] border-white bg-emerald-400" />
                </div>

                <AnimatePresence initial={false}>
                  {effectiveExpanded && (
                    <motion.div
                      key="user-info"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.16 }}
                      className="min-w-0 flex-1 text-left overflow-hidden"
                    >
                      <p className="truncate text-sm font-bold text-slate-800 leading-tight whitespace-nowrap">
                        {user.name}
                      </p>
                      <p className="text-xs text-slate-400 leading-tight mt-0.5 truncate">
                        {user.jabatan || "Akun aktif"}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence initial={false}>
                  {effectiveExpanded && (
                    <motion.span
                      key="chevron"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      className="shrink-0"
                    >
                      <ChevronRight size={14} className="text-slate-400" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-44">
              <DropdownMenuItem
                className="text-rose-600 focus:bg-rose-50 focus:text-rose-600 cursor-pointer"
                onClick={() => setShowLogout(true)}
              >
                <LogOut size={14} className="mr-2" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Logout modal */}
        {showLogout &&
          createPortal(
            <LogoutModal
              onCancel={() => setShowLogout(false)}
              onConfirm={() => {
                clearSession();
                setShowLogout(false);
                try { sessionStorage.setItem("logout_toast", "1"); } catch {}
                router.push("/login");
              }}
            />,
            document.body,
          )}
      </motion.aside>

      {/* ── Mobile: dark backdrop (z-[400], di bawah sidebar z-[500]) ─── */}
      {mounted && isMobile && mobileOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/40"
            style={{ zIndex: 400 }}
            onClick={closeMobile}
          />,
          document.body,
        )}
    </>
  );
}
