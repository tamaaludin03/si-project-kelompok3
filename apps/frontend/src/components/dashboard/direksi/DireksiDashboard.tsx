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

type SummaryCard = {
  title: string;
  value: string;
  change: string;
  tone: "violet" | "emerald" | "amber" | "rose";
};

type UnitRow = {
  unit: string;
  cuti: number;
  izin: number;
  distribusi: string;
  status: string;
};

const summaryCards: SummaryCard[] = [
  {
    title: "Total Pengajuan",
    value: "1.284",
    change: "+12%",
    tone: "violet",
  },
  {
    title: "Cuti Disetujui",
    value: "952",
    change: "+5%",
    tone: "emerald",
  },
  {
    title: "Menunggu Review",
    value: "218",
    change: "Tetap",
    tone: "amber",
  },
  {
    title: "Ditolak",
    value: "114",
    change: "-2%",
    tone: "rose",
  },
];

const trendData = [
  { month: "Jan", cuti: 120, izin: 82 },
  { month: "Feb", cuti: 138, izin: 90 },
  { month: "Mar", cuti: 156, izin: 94 },
  { month: "Apr", cuti: 148, izin: 88 },
  { month: "Mei", cuti: 172, izin: 102 },
  { month: "Jun", cuti: 190, izin: 112 },
];

const units: UnitRow[] = [
  {
    unit: "Dept. IT",
    cuti: 82,
    izin: 34,
    distribusi: "18%",
    status: "Tertinggi",
  },
  {
    unit: "Keuangan",
    cuti: 61,
    izin: 26,
    distribusi: "13%",
    status: "Stabil",
  },
  {
    unit: "Operasional",
    cuti: 74,
    izin: 29,
    distribusi: "15%",
    status: "Naik",
  },
  {
    unit: "SDM",
    cuti: 58,
    izin: 21,
    distribusi: "11%",
    status: "Stabil",
  },
];

const insights = [
  "Dept. IT mencatat tingkat cuti tertinggi bulan ini — naik 18% dibanding periode sebelumnya.",
  "Tren pengajuan cuti meningkat setiap akhir kuartal — pola konsisten 3 periode terakhir.",
  "Tingkat penolakan menurun 2% — menunjukkan kualitas pengajuan semakin baik.",
  "5 pegawai tercatat frekuensi izin lebih dari 8 kali dalam 3 bulan terakhir.",
];

function toneClass(tone: SummaryCard["tone"]) {
  switch (tone) {
    case "emerald":
      return {
        badge: "bg-emerald-50 text-emerald-700",
        card: "border-emerald-100",
        value: "text-emerald-700",
      };
    case "amber":
      return {
        badge: "bg-amber-50 text-amber-700",
        card: "border-amber-100",
        value: "text-amber-700",
      };
    case "rose":
      return {
        badge: "bg-rose-50 text-rose-700",
        card: "border-rose-100",
        value: "text-rose-700",
      };
    default:
      return {
        badge: "bg-violet-50 text-violet-700",
        card: "border-violet-100",
        value: "text-violet-700",
      };
  }
}

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("tinggi")) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  if (normalized.includes("naik")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

export default function DireksiDashboard() {
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
      nama: localStorage.getItem("nama") || "Direksi",
      role: localStorage.getItem("role") || "direksi",
      jabatan: localStorage.getItem("jabatan") || "Direksi",
      unit: localStorage.getItem("unit") || "Pimpinan",
    });
  }, []);

  const maxValue = Math.max(...trendData.map((item) => Math.max(item.cuti, item.izin)));

  return (
    <main className="min-h-screen bg-[#f6f4f8] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-700">
                Dashboard Strategis Direksi
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
                Ringkasan data cuti & izin pegawai secara real-time
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Periode: Jan s/d Jun 2024 • Pantau tren, distribusi, dan insight
                pengajuan dari seluruh unit kerja.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">
                  {profile?.nama || "Direksi"}
                </p>
                <p className="text-xs text-slate-500">
                  {profile?.jabatan || "Direksi"} • {profile?.unit || "Pimpinan"}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
              >
                Logout
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const styles = toneClass(card.tone);

            return (
              <div
                key={card.title}
                className={`rounded-[24px] border bg-white p-5 shadow-sm ${styles.card}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-slate-500">{card.title}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles.badge}`}
                  >
                    {card.change}
                  </span>
                </div>
                <p className={`mt-4 text-3xl font-bold ${styles.value}`}>{card.value}</p>
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_0.95fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Tren pengajuan bulanan
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Cuti vs izin — Jan s/d Jun 2024
                </p>
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-5 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-violet-600" />
                  <span className="text-slate-600">Cuti</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">Izin</span>
                </div>
              </div>

              <div className="flex h-80 items-end gap-4 overflow-x-auto rounded-2xl bg-slate-50 px-4 pb-4 pt-6">
                {trendData.map((item) => (
                  <div
                    key={item.month}
                    className="flex min-w-[72px] flex-1 flex-col items-center justify-end gap-3"
                  >
                    <div className="flex h-56 items-end gap-2">
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className="w-5 rounded-t-xl bg-violet-600"
                          style={{
                            height: `${(item.cuti / maxValue) * 180}px`,
                          }}
                        />
                        <span className="text-[11px] font-medium text-slate-500">
                          {item.cuti}
                        </span>
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <div
                          className="w-5 rounded-t-xl bg-emerald-500"
                          style={{
                            height: `${(item.izin / maxValue) * 180}px`,
                          }}
                        />
                        <span className="text-[11px] font-medium text-slate-500">
                          {item.izin}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-slate-600">{item.month}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Distribusi jenis pengajuan
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Proporsi per jenis cuti & izin
            </p>

            <div className="mt-8 flex justify-center">
              <div className="relative h-56 w-56 rounded-full bg-[conic-gradient(#7c3aed_0_40%,#10b981_40_64%,#f59e0b_64_100%)]">
                <div className="absolute inset-6 rounded-full bg-white" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Total
                    </p>
                    <p className="mt-1 text-3xl font-bold text-slate-900">100%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-violet-600" />
                  <span className="text-sm font-medium text-slate-700">
                    Cuti tahunan
                  </span>
                </div>
                <span className="text-sm font-semibold text-slate-800">40%</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-slate-700">
                    Izin tidak masuk
                  </span>
                </div>
                <span className="text-sm font-semibold text-slate-800">24%</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="text-sm font-medium text-slate-700">
                    Jenis lainnya
                  </span>
                </div>
                <span className="text-sm font-semibold text-slate-800">36%</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-bold text-slate-900">Rekap per unit kerja</h2>
            <p className="mt-1 text-sm text-slate-500">
              Distribusi pengajuan dari setiap unit
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-3 font-semibold">Unit</th>
                    <th className="px-3 py-3 font-semibold">Cuti</th>
                    <th className="px-3 py-3 font-semibold">Izin</th>
                    <th className="px-3 py-3 font-semibold">Distribusi</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((item) => (
                    <tr key={item.unit} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-4 font-semibold text-slate-800">
                        {item.unit}
                      </td>
                      <td className="px-3 py-4 text-slate-600">{item.cuti}</td>
                      <td className="px-3 py-4 text-slate-600">{item.izin}</td>
                      <td className="px-3 py-4 text-slate-600">{item.distribusi}</td>
                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Insight otomatis sistem
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ringkasan pola pengajuan yang terdeteksi
            </p>

            <div className="mt-6 space-y-4">
              {insights.map((item, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4"
                >
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}