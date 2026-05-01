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

export default function KabagDashboard() {
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
      nama: localStorage.getItem("nama") || "Pegawai",
      role: localStorage.getItem("role") || "kabag",
      jabatan: localStorage.getItem("jabatan") || "Kepala Bagian",
      unit: localStorage.getItem("unit") || "Unit Kerja",
    });
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f4f8] p-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
              Dashboard Kabag
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Halo, {profile?.nama || "Kabag"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {profile?.jabatan || "Kepala Bagian"} • {profile?.unit || "Unit Kerja"}
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
            <p className="text-sm text-violet-700">Menunggu Review</p>
            <p className="mt-2 text-3xl font-bold text-violet-800">7</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <p className="text-sm text-emerald-700">Disetujui Bulan Ini</p>
            <p className="mt-2 text-3xl font-bold text-emerald-800">24</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
            <p className="text-sm text-rose-700">Ditolak Bulan Ini</p>
            <p className="mt-2 text-3xl font-bold text-rose-800">3</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm text-slate-700">Total Diproses</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">34</p>
          </div>
        </div>
      </section>
    </main>
  );
}