"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL, CountMap, fetchJson, getTotal, SidebarSection, SidebarShell } from "./SidebarShell";

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
    title: "Menu SDM",
    menus: [
      { label: "Dashboard", href: "/sdm/dashboard" },
      { label: "Data Pegawai", href: "/sdm/data-pegawai", countKey: "pegawai" },
      { label: "Monitoring STR & SIP", href: "/sdm/monitoring-str-sip" },
      { label: "Pengajuan Masuk", href: "/sdm/pengajuan-masuk", countKey: "pengajuan" },
      { label: "Statistik", href: "/sdm/statistik" },
      { label: "Laporan", href: "/sdm/laporan" },
      { label: "Notifikasi Surat", href: "/sdm/notifikasi" },
    ],
  },
];

export default function SdmSidebar() {
  const [counts, setCounts] = useState<CountMap>({});

  useEffect(() => {
    let alive = true;

    async function loadCounts() {
      const nip = typeof window !== "undefined" ? (localStorage.getItem("nip") || "") : "";
      const [pegawai, cuti, izin, cutiMine, izinMine] = await Promise.all([
        fetchJson(`${API_BASE_URL}/pegawai/admin/list`),
        fetchJson(`${API_BASE_URL}/cuti/sdm/monitoring`),
        fetchJson(`${API_BASE_URL}/izin/sdm/monitoring`),
        nip ? fetchJson(`${API_BASE_URL}/cuti/mine/${nip}`) : Promise.resolve([]),
        nip ? fetchJson(`${API_BASE_URL}/izin/mine/${nip}`) : Promise.resolve([]),
      ]);

      if (!alive) return;

      const FINAL = ["disetujui_final", "disetujui_direktur", "selesai", "ditolak_kaur", "ditolak_kabag", "ditolak_direktur", "direset_admin"];
      function getItems(p: any): any[] {
        return Array.isArray(p?.data?.items) ? p.data.items : Array.isArray(p?.data) ? p.data : Array.isArray(p) ? p : [];
      }
      const aktif = getItems(cutiMine).filter((i: any) => !FINAL.includes(String(i.status || "").toLowerCase())).length
                  + getItems(izinMine).filter((i: any) => !FINAL.includes(String(i.status || "").toLowerCase())).length;

      setCounts({
        pegawai: getTotal(pegawai),
        pengajuan: getTotal(cuti) + getTotal(izin),
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
      title="Dashboard SDM"
      subtitle="Monitoring pegawai, STR/SIP, pengajuan, dan laporan."
      sections={sections}
      counts={counts}
    />
  );
}
