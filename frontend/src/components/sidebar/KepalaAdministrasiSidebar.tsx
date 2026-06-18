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
    title: "Menu Kepala Administrasi",
    menus: [
      { label: "Dashboard Kepala Adm", href: "/kepala-administrasi/dashboard" },
      { label: "Approval Final", href: "/kepala-administrasi/approval-final", countKey: "approvalFinal" },
      { label: "Dokumen Masuk", href: "/kepala-administrasi/dokumen-masuk", countKey: "dokumenMasuk" },
      { label: "Riwayat Approval", href: "/kepala-administrasi/riwayat-approval" },
      { label: "Laporan Cuti & Izin", href: "/kepala-administrasi/laporan-cuti-izin" },
      { label: "Notifikasi", href: "/kepala-administrasi/notifikasi" },
    ],
  },
];

export default function KepalaAdministrasiSidebar() {
  const [counts, setCounts] = useState<CountMap>({});

  useEffect(() => {
    let alive = true;

    async function loadCounts() {
      const nip = typeof window !== "undefined" ? (localStorage.getItem("nip") || "") : "";
      const [cutiPending, izinPending, cutiMine, izinMine] = await Promise.all([
        fetchJson(`${API_BASE_URL}/cuti/kepala-administrasi/pending`),
        fetchJson(`${API_BASE_URL}/izin/kepala-administrasi/pending`),
        nip ? fetchJson(`${API_BASE_URL}/cuti/mine/${nip}`) : Promise.resolve([]),
        nip ? fetchJson(`${API_BASE_URL}/izin/mine/${nip}`) : Promise.resolve([]),
      ]);

      const total = getTotal(cutiPending) + getTotal(izinPending);

      if (!alive) return;

      const FINAL = ["disetujui_final", "disetujui_direktur", "selesai", "ditolak_kaur", "ditolak_kabag", "ditolak_direktur", "direset_admin"];
      function getItems(p: any): any[] {
        return Array.isArray(p?.data?.items) ? p.data.items : Array.isArray(p?.data) ? p.data : Array.isArray(p) ? p : [];
      }
      const aktif = getItems(cutiMine).filter((i: any) => !FINAL.includes(String(i.status || "").toLowerCase())).length
                  + getItems(izinMine).filter((i: any) => !FINAL.includes(String(i.status || "").toLowerCase())).length;

      setCounts({ approvalFinal: total, dokumenMasuk: total, aktif });
    }

    loadCounts();
    const timer = window.setInterval(loadCounts, 30000);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <SidebarShell
      title="Kepala Administrasi"
      subtitle="Menu pegawai dan approval final pengajuan cuti/izin."
      sections={sections}
      counts={counts}
    />
  );
}
