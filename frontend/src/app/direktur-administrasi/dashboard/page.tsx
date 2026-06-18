"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

function extractItems(payload: any): any[] {
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export default function DirekturAdministrasiDashboardPage() {
  const router = useRouter();
  const [cutiPending, setCutiPending] = useState<any[]>([]);
  const [izinPending, setIzinPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nama, setNama] = useState("");

  useEffect(() => {
    setNama(localStorage.getItem("nama") || "Direktur Administrasi");

    async function loadData() {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const [cutiRes, izinRes] = await Promise.all([
        fetch(`${API_BASE_URL}/cuti/direktur-administrasi/pending`, { headers, cache: "no-store" }),
        fetch(`${API_BASE_URL}/izin/direktur-administrasi/pending`, { headers, cache: "no-store" }),
      ]);

      const cutiJson = await cutiRes.json().catch(() => null);
      const izinJson = await izinRes.json().catch(() => null);

      setCutiPending(cutiRes.ok ? extractItems(cutiJson) : []);
      setIzinPending(izinRes.ok ? extractItems(izinJson) : []);
      setLoading(false);
    }

    loadData();
  }, []);

  const totalPending = cutiPending.length + izinPending.length;

  return (
    <main
      className="min-h-screen bg-transparent px-3 py-4 sm:px-6 sm:py-8 text-slate-900"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-8 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500">Dashboard</p>
          <h1 className="mt-1.5 text-3xl font-extrabold text-slate-900 tracking-tight">
            Direktur Administrasi & Operasional
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">Selamat datang, {nama}. Berikut ringkasan pengajuan dari Kabag.</p>
        </section>

        <div className="grid gap-5 md:grid-cols-3">
          <StatCard label="Menunggu Approval" value={totalPending} accent="indigo" />
          <StatCard label="Pengajuan Cuti" value={cutiPending.length} accent="violet" />
          <StatCard label="Pengajuan Izin" value={izinPending.length} accent="blue" />
        </div>

        <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Pengajuan Masuk</h2>
              <p className="text-sm text-slate-400 mt-1">Pengajuan dari Kabag menunggu persetujuan Anda.</p>
            </div>
            <button
              onClick={() => router.push("/direktur-administrasi/approval")}
              className="rounded-xl bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-800"
            >
              Lihat Semua
            </button>
          </div>

          {loading ? (
            <p className="text-sm font-semibold text-slate-400 py-4">Memuat data...</p>
          ) : totalPending === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-6 text-sm font-semibold text-slate-500 text-center">
              Tidak ada pengajuan yang menunggu persetujuan.
            </div>
          ) : (
            <div className="space-y-3">
              {[
                ...cutiPending.map((item) => ({ ...item, _kategori: "Cuti" })),
                ...izinPending.map((item) => ({ ...item, _kategori: "Izin" })),
              ].slice(0, 5).map((item) => (
                <div
                  key={`${item._kategori}-${item.id}`}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="flex gap-2 mb-1">
                      <span className="rounded-full bg-indigo-100 text-indigo-700 px-3 py-0.5 text-xs font-bold">{item._kategori}</span>
                      {item.is_urgent && <span className="rounded-full bg-red-100 text-red-700 px-3 py-0.5 text-xs font-bold">URGENT</span>}
                    </div>
                    <p className="text-sm font-bold text-slate-800">{item.pegawai?.nama || "-"}</p>
                    <p className="text-xs text-slate-500">{item.jenis_cuti || item.jenis_izin || "-"} · {item.pegawai?.jabatan || "-"}</p>
                  </div>
                  <button
                    onClick={() => router.push("/direktur-administrasi/approval")}
                    className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  const colors: Record<string, string> = {
    indigo: "border-indigo-100 bg-indigo-50/60",
    violet: "border-violet-100 bg-violet-50/60",
    blue: "border-blue-100 bg-blue-50/60",
  };
  const textColors: Record<string, string> = {
    indigo: "text-indigo-700",
    violet: "text-violet-700",
    blue: "text-blue-700",
  };

  return (
    <div className={`rounded-3xl border p-6 shadow-sm ${colors[accent] || "border-slate-100 bg-white"}`}>
      <p className={`text-xs font-bold uppercase tracking-wide ${textColors[accent] || "text-slate-500"}`}>{label}</p>
      <p className={`mt-2 text-4xl font-extrabold ${textColors[accent] || "text-slate-900"}`}>{value}</p>
    </div>
  );
}
