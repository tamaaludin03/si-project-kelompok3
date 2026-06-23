"use client";

import { useEffect, useState } from "react";
import {
  API_BASE_URL,
  CountMap,
  fetchJson,
  getTotal,
  SidebarShell,
} from "./SidebarShell";

const PEGAWAI_MENUS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    label: "Ajukan Cuti",
    href: "/cuti/ajukan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>
      </svg>
    ),
  },
  {
    label: "Ajukan Izin",
    href: "/izin/ajukan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
  {
    label: "Status Pengajuan",
    href: "/dashboard/status-pengajuan",
    countKey: "aktif",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    label: "Riwayat",
    href: "/riwayat",
    countKey: "riwayat",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/>
        <path d="M3.05 11a9 9 0 011.5-4.65"/>
      </svg>
    ),
  },
  {
    label: "Notifikasi",
    href: "/notifikasi",
    countKey: "notif",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
    ),
  },
  {
    label: "Profil",
    href: "/profil",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export default function PegawaiSidebar() {
  const [counts, setCounts] = useState<CountMap>({});

  useEffect(() => {
    let alive = true;

    async function loadCounts() {
      const identifier =
        localStorage.getItem("nip") ||
        (() => {
          try {
            const raw = localStorage.getItem("simciUser");
            return raw ? (JSON.parse(raw)?.nip || JSON.parse(raw)?.username) : null;
          } catch { return null; }
        })() ||
        localStorage.getItem("username");

      if (!identifier) return;

      const [cuti, izin] = await Promise.all([
        fetchJson(`${API_BASE_URL}/cuti/mine/${identifier}`),
        fetchJson(`${API_BASE_URL}/izin/mine/${identifier}`),
      ]);

      if (!alive) return;
      const FINAL = ["disetujui_final", "disetujui_direktur", "selesai", "ditolak_kaur", "ditolak_kabag", "ditolak_direktur", "direset_admin"];
      function getItems(payload: any): any[] {
        return Array.isArray(payload?.data?.items) ? payload.data.items
          : Array.isArray(payload?.data) ? payload.data
          : Array.isArray(payload) ? payload : [];
      }
      function countAktif(payload: any): number {
        return getItems(payload).filter((i: any) => !FINAL.includes(String(i.status || "").toLowerCase())).length;
      }
      function countNotif(payload: any): number {
        return getItems(payload).filter((i: any) => FINAL.includes(String(i.status || "").toLowerCase())).length;
      }
      setCounts({
        riwayat: getTotal(cuti) + getTotal(izin),
        aktif: countAktif(cuti) + countAktif(izin),
        notif: countNotif(cuti) + countNotif(izin),
      });
    }

    loadCounts();
    const timer = window.setInterval(loadCounts, 300000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  return (
    <SidebarShell
      title="SIMCI"
      menus={PEGAWAI_MENUS}
      counts={counts}
    />
  );
}
