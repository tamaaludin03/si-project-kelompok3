"use client";

import { useEffect, useState } from "react";
import PageTransition from "@/components/PageTransition";
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
    <div className="min-h-screen bg-transparent">
      <RoleAwareSidebar />
      <div className="flex min-h-screen gap-5 p-4 pl-0">
        <aside className="hidden shrink-0 lg:block" style={{ width: "var(--sidebar-w, 3.5rem)", transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)" }} aria-hidden="true" />
        <main className="min-w-0 flex-1 bg-transparent">
          <div className="mx-auto w-full max-w-[1500px] px-2 py-0">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
