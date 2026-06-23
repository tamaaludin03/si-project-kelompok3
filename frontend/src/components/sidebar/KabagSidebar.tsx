"use client";

import { useEffect, useState } from "react";
import {
  API_BASE_URL,
  CountMap,
  fetchJson,
  getTotal,
  SidebarSection,
  SidebarShell,
} from "./SidebarShell";

const sections: SidebarSection[] = [
  {
    title: "Menu Pegawai",
    menus: [
      { label: "Dashboard Pegawai", href: "/dashboard?as=pegawai" },
      { label: "Ajukan Cuti", href: "/cuti/ajukan" },
      { label: "Ajukan Izin", href: "/izin/ajukan" },
      { label: "Status Pengajuan", href: "/dashboard/status-pengajuan", countKey: "aktif" },
      { label: "Riwayat Pengajuan", href: "/riwayat" },
      { label: "Notifikasi", href: "/notifikasi" },
      { label: "Profil Saya", href: "/profil" },
    ],
  },
  {
    title: "Menu KABAG",
    menus: [
      { label: "Dashboard KABAG", href: "/kabag/dashboard" },
      {
        label: "Approval",
        countKey: "totalPending",
        children: [
          { label: "Approval Cuti", href: "/kabag/approval-cuti", countKey: "cutiPending" },
          { label: "Approval Izin", href: "/kabag/approval-izin", countKey: "izinPending" },
        ],
      },
      { label: "Riwayat Approval", href: "/kabag/riwayat-approval" },
      { label: "Data Pegawai Unit", href: "/kabag/data-pegawai" },
      { label: "Notifikasi Approval", href: "/kabag/notifikasi", countKey: "totalPending" },
    ],
  },
];

export default function KabagSidebar() {
  const [counts, setCounts] = useState<CountMap>({});

  useEffect(() => {
    let alive = true;

    async function loadCounts() {
      const nip = typeof window !== "undefined" ? (localStorage.getItem("nip") || "") : "";
      const [cutiPending, izinPending, cutiMine, izinMine] = await Promise.all([
        fetchJson(`${API_BASE_URL}/cuti/kabag/pending`),
        fetchJson(`${API_BASE_URL}/izin/kabag/pending`),
        nip ? fetchJson(`${API_BASE_URL}/cuti/mine/${nip}`) : Promise.resolve([]),
        nip ? fetchJson(`${API_BASE_URL}/izin/mine/${nip}`) : Promise.resolve([]),
      ]);

      const cutiTotal = getTotal(cutiPending);
      const izinTotal = getTotal(izinPending);

      if (!alive) return;

      const FINAL = ["disetujui_final", "disetujui_direktur", "selesai", "ditolak_kaur", "ditolak_kabag", "ditolak_direktur", "direset_admin"];
      function getItems(p: any): any[] {
        return Array.isArray(p?.data?.items) ? p.data.items : Array.isArray(p?.data) ? p.data : Array.isArray(p) ? p : [];
      }
      const aktif = getItems(cutiMine).filter((i: any) => !FINAL.includes(String(i.status || "").toLowerCase())).length
                  + getItems(izinMine).filter((i: any) => !FINAL.includes(String(i.status || "").toLowerCase())).length;

      setCounts({
        cutiPending: cutiTotal,
        izinPending: izinTotal,
        totalPending: cutiTotal + izinTotal,
        aktif,
      });
    }

    loadCounts();
    const timer = window.setInterval(loadCounts, 300000);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <SidebarShell
      title="Dashboard KABAG"
      subtitle="Menu pegawai dan approval lanjutan pengajuan cuti/izin."
      sections={sections}
      counts={counts}
    />
  );
}
