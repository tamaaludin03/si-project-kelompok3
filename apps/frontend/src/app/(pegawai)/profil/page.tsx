"use client";

import { useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:3001";

type ProfileType = {
  nip?: string;
  nama?: string;
  jabatan?: string;
  role?: string;
  email?: string | null;
  no_hp?: string | null;
};

type SummaryType = {
  jatahCutiTahunan?: number;
  cutiDiambil?: number;
  sisaCuti?: number;
  totalIzin?: number;
};

export default function ProfilPage() {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [summary, setSummary] = useState<SummaryType | null>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [noHp, setNoHp] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const nip = localStorage.getItem("nip");
    if (!nip) {
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`${API_BASE_URL}/pegawai/me/${nip}`),
      fetch(`${API_BASE_URL}/dashboard/summary/${nip}`),
    ])
      .then(async ([profileRes, summaryRes]) => {
        if (!profileRes.ok || !summaryRes.ok) {
          throw new Error("Gagal memuat profil");
        }

        const profileData = await profileRes.json();
        const summaryData = await summaryRes.json();

        const p = profileData.data || {};
        const s = summaryData?.data?.summary || summaryData?.data || {};

        const savedEmail = localStorage.getItem("profil_email");
        const savedNoHp = localStorage.getItem("profil_no_hp");

        setProfile(p);
        setEmail(savedEmail ?? p.email ?? "");
        setNoHp(savedNoHp ?? p.no_hp ?? "");

        setSummary({
          jatahCutiTahunan: s.jatahCutiTahunan ?? 12,
          cutiDiambil: s.cutiDiambil ?? s.totalHariCutiDisetujui ?? 0,
          sisaCuti: s.sisaCuti ?? 12,
          totalIzin: s.totalIzin ?? 0,
        });
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();

    localStorage.setItem("profil_email", email);
    localStorage.setItem("profil_no_hp", noHp);

    setProfile((prev) => ({
      ...prev,
      email,
      no_hp: noHp,
    }));

    setMessage("Kontak berhasil disimpan.");
  }

  return (
    <main className="page-shell p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="section-title text-2xl md:text-3xl">Profil Saya</h1>
          <p className="text-soft">Informasi pegawai dan ringkasan cuti.</p>
        </div>

        {loading ? (
          <div className="card-simci p-6">Memuat profil...</div>
        ) : (
          <>
            <section className="card-simci p-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-2xl font-bold text-[var(--primary)]">
                  {(profile?.nama || "P").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[var(--text)]">
                    {profile?.nama || "-"}
                  </h2>
                  <p className="text-soft">NIP: {profile?.nip || "-"}</p>
                  <p className="text-soft">{profile?.jabatan || "-"}</p>
                </div>
              </div>
            </section>

            <section className="card-simci p-6">
              <h2 className="text-lg font-semibold text-[var(--text)] mb-4">
                Kontak
              </h2>

              {message ? (
                <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {message}
                </div>
              ) : null}

              <form
                onSubmit={handleSave}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-[var(--text)]">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setMessage("");
                    }}
                    className="input-simci"
                    placeholder="Masukkan email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text)]">
                    No. HP
                  </label>
                  <input
                    type="text"
                    value={noHp}
                    onChange={(e) => {
                      setNoHp(e.target.value);
                      setMessage("");
                    }}
                    className="input-simci"
                    placeholder="Masukkan no. HP"
                  />
                </div>

                <button type="submit" className="btn-primary w-full">
                  Simpan Kontak
                </button>
              </form>

              <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <p className="text-sm font-medium text-[var(--text)]">
                  Ringkasan Cuti
                </p>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-[var(--border)] bg-white p-3">
                    <p className="text-sm text-soft">Jatah Cuti</p>
                    <p className="text-lg font-semibold text-[var(--text)]">
                      {summary?.jatahCutiTahunan ?? 12} hari
                    </p>
                  </div>

                  <div className="rounded-lg border border-[var(--border)] bg-white p-3">
                    <p className="text-sm text-soft">Cuti Diambil</p>
                    <p className="text-lg font-semibold text-[var(--text)]">
                      {summary?.cutiDiambil ?? 0} hari
                    </p>
                  </div>

                  <div className="rounded-lg border border-[var(--border)] bg-white p-3">
                    <p className="text-sm text-soft">Sisa Cuti</p>
                    <p className="text-lg font-semibold text-[var(--accent)]">
                      {summary?.sisaCuti ?? 12} hari
                    </p>
                  </div>

                  <div className="rounded-lg border border-[var(--border)] bg-white p-3">
                    <p className="text-sm text-soft">Total Izin</p>
                    <p className="text-lg font-semibold text-[var(--text)]">
                      {summary?.totalIzin ?? 0} kali
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}