"use client";

import { useEffect, useState } from "react";
import PageTransition from "@/components/PageTransition";
import AppShell from "@/components/layout/AppShell";
import PegawaiSidebar from "@/components/sidebar/PegawaiSidebar";
import KaurSidebar from "@/components/sidebar/KaurSidebar";
import KabagSidebar from "@/components/sidebar/KabagSidebar";
import SdmSidebar from "@/components/sidebar/SdmSidebar";
import AdminSidebar from "@/components/sidebar/AdminSidebar";
import DirekturAdministrasiSidebar from "@/components/sidebar/DirekturAdministrasiSidebar";
import KepalaAdministrasiSidebar from "@/components/sidebar/KepalaAdministrasiSidebar";
import DireksiSidebar from "@/components/sidebar/DireksiSidebar";

function readRole(): string {
  if (typeof window === "undefined") return "pegawai";
  const raw = localStorage.getItem("simciUser") || localStorage.getItem("user");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const r = parsed?.internal_role || parsed?.role;
      if (r) return String(r).toLowerCase();
    } catch { /* ignore */ }
  }
  return (localStorage.getItem("internal_role") || localStorage.getItem("role") || "pegawai").toLowerCase();
}

function RoleAwareSidebar() {
  const [role, setRole] = useState("");

  useEffect(() => { setRole(readRole()); }, []);

  if (!role) return null;

  switch (role) {
    case "kaur":                   return <KaurSidebar />;
    case "kabag":                  return <KabagSidebar />;
    case "sdm":                    return <SdmSidebar />;
    case "admin":
    case "it":                     return <AdminSidebar />;
    case "direktur":
    case "direktur-administrasi":
    case "direktur_administrasi":  return <DirekturAdministrasiSidebar />;
    case "kepala-administrasi":
    case "kepala_administrasi":    return <KepalaAdministrasiSidebar />;
    case "direksi":                return <DireksiSidebar />;
    default:                       return <PegawaiSidebar />;
  }
}

export default function PegawaiLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell sidebar={<RoleAwareSidebar />}>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
