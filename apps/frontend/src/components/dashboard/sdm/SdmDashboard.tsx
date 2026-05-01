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

export default function SdmDashboard() {
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
      role: localStorage.getItem("role") || "sdm",
      jabatan: localStorage.getItem("jabatan") || "SDM",
      unit: localStorage.getItem("unit") || "Sumber Daya Manusia",
    });
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
              Dashboard SDM
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Halo, {profile?.nama || "SDM"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {profile?.jabatan || "SDM"} • {profile?.unit || "Sumber Daya Manusia"}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-2xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
          >
            Logout
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
            <p className="text-sm font-medium text-violet-700">Pengajuan Masuk</p>
            <p className="mt-2 text-3xl font-bold text-violet-800">48</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <p className="text-sm font-medium text-emerald-700">Diproses Hari Ini</p>
            <p className="mt-2 text-3xl font-bold text-emerald-800">19</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-700">Final Approval</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">12</p>
          </div>
        </div>
      </section>
    </main>
  );
}