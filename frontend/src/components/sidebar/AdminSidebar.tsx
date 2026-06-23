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
    title: "Menu Admin",
    menus: [
      { label: "Dashboard", href: "/admin/dashboard" },
      { label: "Manajemen User", href: "/admin/manajemen-user", countKey: "user" },
      { label: "Manajemen Role", href: "/admin/manajemen-role" },
      { label: "Data Unit/Bagian", href: "/admin/data-unit" },
      { label: "Data Pengajuan", href: "/admin/data-pengajuan", countKey: "pengajuan" },
    ],
  },
];

export default function AdminSidebar() {
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
        user: getTotal(pegawai),
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
      title="Dashboard Admin/IT"
      subtitle="User, role, unit bagian, pengajuan, dan konfigurasi sistem."
      sections={sections}
      counts={counts}
    />
  );
}
