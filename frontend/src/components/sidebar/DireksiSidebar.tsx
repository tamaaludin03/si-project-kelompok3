"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL, CountMap, fetchJson, getTotal, SidebarShell } from "./SidebarShell";

const menus = [
  { label: "Dashboard", href: "/direksi/dashboard" },
  { label: "Approval Pengajuan", href: "/direksi/approval", countKey: "notifPending" },
  { label: "Rekap Pengajuan", href: "/direksi/rekap-pengajuan", countKey: "pengajuan" },
  { label: "Monitoring", href: "/direksi/monitoring" },
  { label: "Laporan", href: "/direksi/laporan" },
  { label: "Notifikasi", href: "/direksi/notifikasi" },
  { label: "Profil", href: "/profil" },
];

export default function DireksiSidebar() {
  const [counts, setCounts] = useState<CountMap>({});

  useEffect(() => {
    let alive = true;

    async function loadCounts() {
      const [cuti, izin, cutiPend, izinPend] = await Promise.all([
        fetchJson(`${API_BASE_URL}/cuti/sdm/monitoring`),
        fetchJson(`${API_BASE_URL}/izin/sdm/monitoring`),
        fetchJson(`${API_BASE_URL}/cuti/direksi/pending`),
        fetchJson(`${API_BASE_URL}/izin/direksi/pending`),
      ]);

      if (!alive) return;

      setCounts({
        pengajuan: getTotal(cuti) + getTotal(izin),
        notifPending: getTotal(cutiPend) + getTotal(izinPend),
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
      title="Dashboard Direktur Utama"
      subtitle="Rekap cuti, izin, approval, dan pengajuan per unit."
      menus={menus}
      counts={counts}
    />
  );
}
