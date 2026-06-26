"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

const SIGNIFICANT_ACTIONS = [
  "APPROVE_CUTI_KAUR", "REJECT_CUTI_KAUR",
  "APPROVE_IZIN_KAUR", "REJECT_IZIN_KAUR",
  "APPROVE_CUTI_FINAL", "REJECT_CUTI_KABAG",
  "APPROVE_IZIN_FINAL", "REJECT_IZIN_KABAG",
  "APPROVE_CUTI_DIREKTUR", "REJECT_CUTI_DIREKTUR",
  "APPROVE_IZIN_DIREKTUR", "REJECT_IZIN_DIREKTUR",
  "TERBITKAN_SURAT_CUTI",
];

function fmt(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    APPROVE_CUTI_KAUR: "Kep. Urusan menyetujui cuti",
    REJECT_CUTI_KAUR: "Kep. Urusan menolak cuti",
    APPROVE_IZIN_KAUR: "Kep. Urusan menyetujui izin",
    REJECT_IZIN_KAUR: "Kep. Urusan menolak izin",
    APPROVE_CUTI_FINAL: "Kep. Bagian menyetujui cuti (final)",
    REJECT_CUTI_KABAG: "Kep. Bagian menolak cuti",
    APPROVE_IZIN_FINAL: "Kep. Bagian menyetujui izin (final)",
    REJECT_IZIN_KABAG: "Kep. Bagian menolak izin",
    APPROVE_CUTI_DIREKTUR: "Direktur menyetujui cuti",
    REJECT_CUTI_DIREKTUR: "Direktur menolak cuti",
    APPROVE_IZIN_DIREKTUR: "Direktur menyetujui izin",
    REJECT_IZIN_DIREKTUR: "Direktur menolak izin",
    TERBITKAN_SURAT_CUTI: "SDM menerbitkan surat cuti",
  };
  return map[action] || action;
}

function actionColor(action: string) {
  if (action.includes("APPROVE") || action.includes("TERBITKAN")) return "bg-emerald-100 text-emerald-700";
  if (action.includes("REJECT")) return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

type AuditLog = { id: number; action: string; description?: string | null; actor_name?: string | null; actor_role?: string | null; entity?: string; created_at: string };

export default function KepAdmNotifikasiPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pendingCuti, setPendingCuti] = useState(0);
  const [pendingIzin, setPendingIzin] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true); setError("");
    try {
      const token = localStorage.getItem("token");
      const h: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const [cr, ir, lr] = await Promise.all([
        fetch(`${API_BASE_URL}/cuti/direktur/pending`, { headers: h, cache: "no-store" }),
        fetch(`${API_BASE_URL}/izin/direktur/pending`, { headers: h, cache: "no-store" }),
        fetch(`${API_BASE_URL}/audit-log`, { headers: h, cache: "no-store" }),
      ]);
      if (cr.ok) { const d = await cr.json(); setPendingCuti(d?.data?.total ?? 0); }
      if (ir.ok) { const d = await ir.json(); setPendingIzin(d?.data?.total ?? 0); }
      setLogs(lr.ok ? ((await lr.json())?.data ?? []) : []);
    } catch { setError("Gagal memuat notifikasi."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    loadData();
    const t = window.setInterval(loadData, 300_000);
    return () => window.clearInterval(t);
  }, []);

  const filteredLogs = logs.filter(l => SIGNIFICANT_ACTIONS.includes(l.action)).slice(0, 30);
  const totalPending = pendingCuti + pendingIzin;

  const statCards = [
    { label: "Menunggu Persetujuan", value: totalPending, color: "border-violet-100 bg-violet-50/60 text-violet-700" },
    { label: "Cuti Pending", value: pendingCuti, color: "border-amber-100 bg-amber-50/60 text-amber-700" },
    { label: "Izin Pending", value: pendingIzin, color: "border-emerald-100 bg-emerald-50/60 text-emerald-700" },
    { label: "Aktivitas Tercatat", value: filteredLogs.length, color: "border-slate-100 bg-slate-50/60 text-slate-700" },
  ];

  return (
    <main className="min-h-screen bg-transparent px-3 py-4 sm:px-6 sm:py-8 space-y-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Kepala Administrasi</p>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-slate-900">Notifikasi</h1>
        <p className="mt-1 text-sm text-slate-400">Pantau seluruh aktivitas approval pengajuan cuti dan izin pegawai.</p>
        <div className="mt-4 flex gap-3">
          {totalPending > 0 && (
            <span className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-1.5 text-sm font-bold text-violet-700">
              {totalPending} menunggu persetujuan
            </span>
          )}
          <button onClick={loadData} className="rounded-2xl border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Muat Ulang
          </button>
        </div>
        {error && <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className={`rounded-3xl border p-5 shadow-sm ${s.color}`}>
            <p className="text-xs font-bold uppercase tracking-wide opacity-70">{s.label}</p>
            <p className="mt-2 text-3xl font-extrabold">{s.value}</p>
          </div>
        ))}
      </div>

      {totalPending > 0 && (
        <div className="rounded-3xl border border-violet-100 bg-violet-50 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="font-extrabold text-violet-900">Ada {totalPending} pengajuan menunggu persetujuan</p>
            <p className="text-sm text-violet-600 mt-0.5">Cuti: {pendingCuti} · Izin: {pendingIzin}</p>
          </div>
          <a href="/kepala-administrasi/approval-final" className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700">
            Proses Sekarang →
          </a>
        </div>
      )}

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900 mb-4">Aktivitas Terkini Sistem</h2>
        {loading ? (
          <div className="flex items-center gap-3 py-4">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 py-8 text-center text-sm text-slate-400">Belum ada aktivitas.</div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${actionColor(log.action)}`}>
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
