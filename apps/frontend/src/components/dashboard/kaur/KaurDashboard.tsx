"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = "http://localhost:3001";

type ProfileType = {
  nip?: string;
  nama?: string;
  jabatan?: string;
  role?: string;
  unit?: string;
};

export default function KaurDashboard() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);

  const [nip, setNip] = useState("-");
  const [nama, setNama] = useState("Pegawai");
  const [role, setRole] = useState("kaur");
  const [jabatan, setJabatan] = useState("Kaur");
  const [unit, setUnit] = useState("-");

  const handleLogout = () => {
    localStorage.removeItem("nip");
    localStorage.removeItem("nama");
    localStorage.removeItem("role");
    localStorage.removeItem("jabatan");
    localStorage.removeItem("unit");
    router.push("/login");
  };

  useEffect(() => {
    const storedNip = localStorage.getItem("nip") || "-";
    const storedNama = localStorage.getItem("nama") || "Pegawai";
    const storedRole = localStorage.getItem("role") || "kaur";
    const storedJabatan = localStorage.getItem("jabatan") || "Kaur";
    const storedUnit = localStorage.getItem("unit") || "-";

    setNip(storedNip);
    setNama(storedNama);
    setRole(storedRole);
    setJabatan(storedJabatan);
    setUnit(storedUnit);

    if (storedNip === "-") {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE_URL}/pegawai/me/${storedNip}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Gagal memuat profil");
        const data = await res.json();
        setProfile(data.data || null);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
        <div className="bg-gradient-to-r from-emerald-50 via-violet-50 to-fuchsia-50 px-6 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
                Dashboard Kaur
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">
                Halo, {profile?.nama || nama}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {profile?.jabatan || jabatan} • Unit {profile?.unit || unit} • NIP{" "}
                {profile?.nip || nip}
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 md:items-end">
              <div className="rounded-2xl border border-violet-200 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur-sm">
                Anda masuk sebagai approver pada sistem cuti dan izin.
              </div>

              <button
                onClick={handleLogout}
                className="rounded-2xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <span className="text-lg font-bold">K</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Area Kerja Kaur
              </h2>
              <p className="text-sm text-slate-500">
                Titik awal setelah login untuk proses approval.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
              <p className="text-sm font-semibold text-violet-800">Data Login</p>
              <div className="mt-3 space-y-1 text-sm text-violet-700">
                <p>Role: {profile?.role || role}</p>
                <p>Jabatan: {profile?.jabatan || jabatan}</p>
                <p>Unit: {profile?.unit || unit}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-sm font-semibold text-emerald-800">
                Status Dashboard
              </p>
              <div className="mt-3 space-y-1 text-sm text-emerald-700">
                <p>Dashboard siap digunakan.</p>
                <p>Menunggu integrasi data approval dari backend.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-emerald-50 p-5">
            <p className="text-sm font-semibold text-slate-800">
              Ruang Approval
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Bagian ini disiapkan untuk daftar pengajuan cuti dan izin yang masuk
              ke Kaur. Untuk sementara dikosongkan terlebih dahulu agar alur login
              dan identitas pengguna menjadi fokus utama.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <span className="text-lg font-bold">!</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Notifikasi
              </h2>
              <p className="text-sm text-slate-500">
                Belum ada notifikasi.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-lg font-bold text-emerald-700 shadow-sm">
              0
            </div>
            <p className="mt-4 text-sm font-semibold text-emerald-800">
              Notifikasi masih kosong
            </p>
            <p className="mt-2 text-sm text-emerald-700">
              Pemberitahuan approval, revisi, atau pembaruan pengajuan akan
              muncul di sini.
            </p>
          </div>
        </div>
      </section>

      {loading && (
        <section className="rounded-3xl border border-violet-100 bg-violet-50 p-6 shadow-sm">
          <p className="text-sm text-violet-700">Memuat data dashboard...</p>
        </section>
      )}
    </main>
  );
}