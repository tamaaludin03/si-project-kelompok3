"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ProfileType = {
  nip?: string;
  nama?: string;
  jabatan?: string;
  role?: string;
  unit?: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileType | null>(null);

  const handleLogout = () => {
    localStorage.removeItem("nip");
    localStorage.removeItem("nama");
    localStorage.removeItem("role");
    localStorage.removeItem("jabatan");
    localStorage.removeItem("unit");
    router.push("/login");
  };

  useEffect(() => {
    setProfile({
      nip: localStorage.getItem("nip") || "-",
      nama: localStorage.getItem("nama") || "Admin IT",
      role: localStorage.getItem("role") || "admin",
      jabatan: localStorage.getItem("jabatan") || "Admin IT",
      unit: localStorage.getItem("unit") || "Teknologi Informasi",
    });
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
              Dashboard Admin IT
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Halo, {profile?.nama || "Admin IT"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {profile?.jabatan || "Admin IT"} •{" "}
              {profile?.unit || "Teknologi Informasi"}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-2xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
          >
            Logout
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
            <p className="text-sm text-violet-700">User Aktif</p>
            <p className="mt-2 text-3xl font-bold text-violet-800">182</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <p className="text-sm text-blue-700">Sesi Login Hari Ini</p>
            <p className="mt-2 text-3xl font-bold text-blue-800">96</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <p className="text-sm text-amber-700">Tiket Gangguan</p>
            <p className="mt-2 text-3xl font-bold text-amber-800">5</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <p className="text-sm text-emerald-700">Sistem Normal</p>
            <p className="mt-2 text-3xl font-bold text-emerald-800">12</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-semibold text-slate-800">Panel Operasional</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Area ini disiapkan untuk monitoring user, log aktivitas, kontrol akses,
            dan status layanan sistem internal.
          </p>
        </div>
      </section>
    </main>
  );
}