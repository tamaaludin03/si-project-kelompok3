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
    title: "Menu Direktur",
    menus: [
      { label: "Dashboard Direktur", href: "/direktur/dashboard" },
      {
        label: "Approval",
        countKey: "approvalPending",
        children: [
          { label: "Approval Cuti", href: "/direktur/approval-cuti", countKey: "cutiPending" },
          { label: "Approval Izin", href: "/direktur/approval-izin", countKey: "izinPending" },
        ],
      },
      { label: "Riwayat Approval", href: "/direktur/riwayat-approval" },
      { label: "Laporan Cuti & Izin", href: "/direktur/laporan-cuti-izin" },
      { label: "Notifikasi Approval", href: "/direktur/notifikasi", countKey: "approvalPending" },
    ],
  },
];

export default function DirekturAdministrasiSidebar() {
  const [counts, setCounts] = useState<CountMap>({});

  useEffect(() => {
    let alive = true;

    async function loadCounts() {
      const nip = typeof window !== "undefined" ? (localStorage.getItem("nip") || "") : "";
      const [cutiPending, izinPending, cutiMine, izinMine] = await Promise.all([
        fetchJson(`${API_BASE_URL}/cuti/direktur/pending`),
        fetchJson(`${API_BASE_URL}/izin/direktur/pending`),
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

      setCounts({ approvalPending: cutiTotal + izinTotal, cutiPending: cutiTotal, izinPending: izinTotal, aktif });
    }

    loadCounts();
    const timer = window.setInterval(loadCounts, 300000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  return (
    <SidebarShell
      title="Direktur"
      subtitle="Menu pegawai dan approval pengajuan cuti/izin dari Kabag."
      sections={sections}
      counts={counts}
    />
  );
}
