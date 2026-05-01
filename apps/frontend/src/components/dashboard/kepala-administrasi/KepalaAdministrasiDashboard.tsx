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

export default function KepalaAdministrasiDashboard() {
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
      nama: localStorage.getItem("nama") || "Kepala Administrasi",
      role: localStorage.getItem("role") || "kepala-administrasi",
      jabatan: localStorage.getItem("jabatan") || "Kepala Administrasi",
      unit: localStorage.getItem("unit") || "Administrasi",
    });
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f5fa] p-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
              Dashboard Kepala Administrasi
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Halo, {profile?.nama || "Kepala Administrasi"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {profile?.jabatan || "Kepala Administrasi"} •{" "}
              {profile?.unit || "Administrasi"}
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
            <p className="text-sm text-violet-700">Surat Masuk</p>
            <p className="mt-2 text-3xl font-bold text-violet-800">18</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <p className="text-sm text-emerald-700">Dokumen Diproses</p>
            <p className="mt-2 text-3xl font-bold text-emerald-800">27</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm text-slate-700">Arsip Harian</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">41</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-semibold text-slate-800">Ringkasan Administrasi</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Halaman ini disiapkan untuk kontrol surat masuk, dokumen internal,
            disposisi administrasi, dan pemantauan arsip kerja harian.
          </p>
        </div>
      </section>
    </main>
  );
}