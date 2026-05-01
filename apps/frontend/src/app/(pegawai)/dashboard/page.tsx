"use client";

import { useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:3001";

type ProfileType = {
  nip?: string;
  nama?: string;
  jabatan?: string;
  role?: string;
};

type SummaryType = {
  jatahCutiTahunan?: number;
  cutiDiambil?: number;
  sisaCuti?: number;
  totalIzin?: number;
};

type NotificationType = {
  title: string;
  desc: string;
  time: string;
};

export default function PegawaiDashboard() {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [summary, setSummary] = useState<SummaryType | null>(null);
  const [loading, setLoading] = useState(true);

  const [nip, setNip] = useState("-");
  const [nama, setNama] = useState("Pegawai");
  const [role, setRole] = useState("pegawai");

  useEffect(() => {
    const storedNip = localStorage.getItem("nip") || "-";
    const storedNama = localStorage.getItem("nama") || "Pegawai";
    const storedRole = localStorage.getItem("role") || "pegawai";

    setNip(storedNip);
    setNama(storedNama);
    setRole(storedRole);

    if (storedNip === "-") {
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`${API_BASE_URL}/pegawai/me/${storedNip}`),
      fetch(`${API_BASE_URL}/dashboard/summary/${storedNip}`),
    ])
      .then(async ([profileRes, summaryRes]) => {
        if (!profileRes.ok || !summaryRes.ok) {
          throw new Error("Gagal memuat data dashboard");
        }

        const profileData = await profileRes.json();
        const summaryData = await summaryRes.json();

        setProfile(profileData.data || null);

        const rawSummary = summaryData?.data?.summary || summaryData?.data || {};

        setSummary({
          jatahCutiTahunan:
            rawSummary.jatahCutiTahunan ??
            rawSummary.jatah_cuti_tahunan ??
            12,
          cutiDiambil:
            rawSummary.cutiDiambil ??
            rawSummary.totalHariCutiDisetujui ??
            rawSummary.cuti_diambil ??
            0,
          sisaCuti: rawSummary.sisaCuti ?? rawSummary.sisa_cuti ?? 12,
          totalIzin: rawSummary.totalIzin ?? rawSummary.total_izin ?? 0,
        });
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const notifications: NotificationType[] = [
    {
      title: "Selamat datang di dashboard SIMCI.",
      desc: "Data profil dan ringkasan cuti Anda ditampilkan di halaman ini.",
      time: "Baru saja",
    },
    {
      title: "Belum ada notifikasi terbaru.",
      desc: "Notifikasi pengajuan cuti atau izin akan muncul di sini.",
      time: "Hari ini",
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)] md:text-3xl">
            Selamat datang
          </h1>
          <p className="text-[var(--text-muted)]">
            {profile?.nama || nama}, {profile?.jabatan || role}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Memuat dashboard...</p>
        ) : (
          <>
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">
                Jatah Cuti & Izin
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="summary-card-purple p-5">
                  <p className="text-sm text-[var(--text-muted)]">
                    Jatah Cuti Tahunan
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[var(--primary)]">
                    {summary?.jatahCutiTahunan ?? 12}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">hari</p>
                </div>

                <div className="summary-card-green p-5">
                  <p className="text-sm text-[var(--text-muted)]">Cuti Diambil</p>
                  <p className="mt-2 text-3xl font-bold text-[var(--accent)]">
                    {summary?.cutiDiambil ?? 0}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">hari</p>
                </div>

                <div className="summary-card-neutral p-5">
                  <p className="text-sm text-[var(--text-muted)]">Sisa Cuti</p>
                  <p className="mt-2 text-3xl font-bold text-[var(--primary)]">
                    {summary?.sisaCuti ?? 12}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">hari</p>
                </div>

                <div className="summary-card-neutral p-5">
                  <p className="text-sm text-[var(--text-muted)]">Total Izin</p>
                  <p className="mt-2 text-3xl font-bold text-[var(--text)]">
                    {summary?.totalIzin ?? 0}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">kali izin</p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="card-simci p-6">
                <h2 className="dashboard-section-title text-lg mb-4">
                  Profil Saya
                </h2>

                <div className="flex items-center gap-4">
                  <div className="profile-avatar">
                    {(profile?.nama || nama || "P").charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <p className="font-semibold text-[var(--text)]">
                      {profile?.nama || nama}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      NIP: {profile?.nip || nip}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {profile?.jabatan || "Pegawai"}
                    </p>
                  </div>
                </div>

                <button className="btn-primary mt-5 w-full">
                  Lihat Profil
                </button>
              </div>

              <div className="card-simci p-6">
                <h2 className="dashboard-section-title text-lg mb-4">
                  Notifikasi Terbaru
                </h2>

                <div className="space-y-3">
                  {notifications.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <p className="text-sm font-medium text-[var(--text)]">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {item.desc}
                      </p>
                      <p className="mt-2 text-[10px] text-[var(--text-soft)]">
                        {item.time}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}