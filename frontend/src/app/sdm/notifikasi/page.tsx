"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

const SDM_ACTIONS = ["TERBITKAN_SURAT_CUTI", "DOWNLOAD_PDF_CUTI", "DOWNLOAD_PDF_IZIN"];

function fmt(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(v?: string | null) {
  if (!v) return "";
  const m = Math.floor((Date.now() - new Date(v).getTime()) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    TERBITKAN_SURAT_CUTI: "Surat cuti diterbitkan",
    DOWNLOAD_PDF_CUTI: "PDF cuti diunduh",
    DOWNLOAD_PDF_IZIN: "PDF izin diunduh",
  };
  return map[action] || action;
}

type MonitoringItem = {
  id: number;
  jenis_cuti?: string;
  jenis_izin?: string;
  status: string;
  surat_cuti_diterbitkan?: boolean;
  created_at: string;
  pegawai?: { nip?: string; nama?: string; unit?: string };
};
type AuditLog = { id: number; action: string; description?: string | null; actor_name?: string | null; created_at: string };

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: "Menunggu KAUR",
    disetujui_kaur: "Disetujui KAUR",
    disetujui_final: "Siap Surat",
    ditolak_kaur: "Ditolak KAUR",
    ditolak_kabag: "Ditolak KABAG",
    selesai: "Selesai",
  };
  return map[s] || s;
}

function statusColor(s: string) {
  if (s === "disetujui_final") return "bg-amber-100 text-amber-700 border-amber-200";
  if (s === "selesai") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s.includes("ditolak")) return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function SdmNotifikasiPage() {
  const [cutiMonitoring, setCutiMonitoring] = useState<MonitoringItem[]>([]);
  const [izinMonitoring, setIzinMonitoring] = useState<MonitoringItem[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true); setError("");
    try {
      const token = localStorage.getItem("token");
      const h: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const [cr, ir, lr] = await Promise.all([
        fetch(`${API_BASE_URL}/cuti/sdm/monitoring`, { headers: h, cache: "no-store" }),
        fetch(`${API_BASE_URL}/izin/sdm/monitoring`, { headers: h, cache: "no-store" }),
        fetch(`${API_BASE_URL}/audit-log`, { headers: h, cache: "no-store" }),
      ]);
      if (cr.ok) { const d = await cr.json(); setCutiMonitoring(d?.data?.items ?? d?.data ?? []); }
      if (ir.ok) { const d = await ir.json(); setIzinMonitoring(d?.data?.items ?? d?.data ?? []); }
      setLogs(lr.ok ? ((await lr.json())?.data ?? []) : []);
    } catch { setError("Gagal memuat notifikasi."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    loadData();
    const t = window.setInterval(loadData, 30_000);
    return () => window.clearInterval(t);
  }, []);

  const needsSurat = useMemo(() =>
    cutiMonitoring.filter(i => i.status === "disetujui_final" && !i.surat_cuti_diterbitkan),
    [cutiMonitoring]
  );

  const recentActivity = useMemo(() =>
    [...cutiMonitoring, ...izinMonitoring]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10),
    [cutiMonitoring, izinMonitoring]
  );

  const sdmLogs = logs.filter(l => SDM_ACTIONS.includes(l.action)).slice(0, 15);

  return (
    <main className="min-h-screen bg-transparent px-3 py-4 sm:px-6 sm:py-8 space-y-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">SDM</p>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-slate-900">Notifikasi</h1>
        <p className="mt-1 text-sm text-slate-400">Pengajuan yang perlu diterbitkan surat dan riwayat aktivitas SDM.</p>
        <div className="mt-4 flex gap-3">
          {needsSurat.length > 0 && (
            <span className="rounded-2xl border border-violet-200 bg-violet-100 px-4 py-1.5 text-sm font-bold text-violet-700">
              {needsSurat.length} cuti perlu surat
            </span>
          )}
          <button onClick={loadData} className="rounded-2xl border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Muat Ulang
          </button>
        </div>
        {error && <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      </header>

      {/* Perlu Surat */}
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900 mb-4">
          Cuti Perlu Diterbitkan Surat
          {needsSurat.length > 0 && (
            <span className="ml-2 rounded-full bg-violet-600 px-2.5 py-0.5 text-xs font-bold text-white">{needsSurat.length}</span>
          )}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
          </div>
        ) : needsSurat.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 py-8 text-center text-sm text-slate-400">
            Tidak ada cuti yang menunggu penerbitan surat.
          </div>
        ) : (
          <div className="space-y-3">
            {needsSurat.map((item) => (
              <div key={item.id} className="rounded-3xl border border-amber-200 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-4 rounded-t-3xl bg-amber-50/60 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-sm font-extrabold text-amber-700">
                      {item.pegawai?.nama?.[0] ?? "?"}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900">{item.pegawai?.nama ?? "-"}</p>
                      <p className="text-xs text-slate-500">{item.pegawai?.nip} · {item.pegawai?.unit}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">Siap Surat</span>
                </div>
                <div className="px-5 pb-5 pt-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.jenis_cuti ?? "-"}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{timeAgo(item.created_at)}</p>
                  </div>
                  <a href="/sdm/pengajuan-masuk" className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700">
                    Terbitkan →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Aktivitas Terkini */}
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900 mb-4">Pengajuan Masuk Terbaru</h2>
        {recentActivity.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 py-8 text-center text-sm text-slate-400">Belum ada data.</div>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusColor(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
                <p className="min-w-0 flex-1 text-sm font-semibold text-slate-800 truncate">
                  {item.pegawai?.nama ?? "-"} · {item.jenis_cuti ?? item.jenis_izin ?? "-"}
                </p>
                <p className="shrink-0 text-xs text-slate-400">{timeAgo(item.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Riwayat SDM */}
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900 mb-4">Riwayat Aktivitas SDM</h2>
        {sdmLogs.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 py-8 text-center text-sm text-slate-400">Belum ada aktivitas.</div>
        ) : (
          <div className="space-y-2">
            {sdmLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                <span className="mt-0.5 shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  {actionLabel(log.action)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700 truncate">{log.description ?? "-"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{fmt(log.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
