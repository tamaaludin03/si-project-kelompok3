"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { formatJenis } from "@/lib/labels";

const ALL_APPROVAL_ACTIONS = [
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
    APPROVE_CUTI_KAUR: "Kep. Urusan ✓ cuti",
    REJECT_CUTI_KAUR: "Kep. Urusan ✗ cuti",
    APPROVE_IZIN_KAUR: "Kep. Urusan ✓ izin",
    REJECT_IZIN_KAUR: "Kep. Urusan ✗ izin",
    APPROVE_CUTI_FINAL: "Kep. Bagian ✓ cuti (final)",
    REJECT_CUTI_KABAG: "Kep. Bagian ✗ cuti",
    APPROVE_IZIN_FINAL: "Kep. Bagian ✓ izin (final)",
    REJECT_IZIN_KABAG: "Kep. Bagian ✗ izin",
    APPROVE_CUTI_DIREKTUR: "Direktur ✓ cuti",
    REJECT_CUTI_DIREKTUR: "Direktur ✗ cuti",
    APPROVE_IZIN_DIREKTUR: "Direktur ✓ izin",
    REJECT_IZIN_DIREKTUR: "Direktur ✗ izin",
    TERBITKAN_SURAT_CUTI: "Surat cuti diterbitkan",
  };
  return map[action] || action;
}

function actionColor(action: string) {
  if (action.includes("APPROVE") || action.includes("TERBITKAN")) return "bg-emerald-100 text-emerald-700";
  if (action.includes("REJECT")) return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

type PendingItem = {
  id: number;
  jenis_cuti?: string;
  jenis_izin?: string;
  is_urgent?: boolean;
  created_at: string;
  pegawai?: { nip?: string; nama?: string; jabatan?: string; unit?: string };
};
type AuditLog = { id: number; action: string; description?: string | null; actor_name?: string | null; created_at: string };

export default function DireksiNotifikasiPage() {
  const [cutiPending, setCutiPending] = useState<PendingItem[]>([]);
  const [izinPending, setIzinPending] = useState<PendingItem[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
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
      setCutiPending(cr.ok ? ((await cr.json())?.data?.items ?? []) : []);
      setIzinPending(ir.ok ? ((await ir.json())?.data?.items ?? []) : []);
      setLogs(lr.ok ? ((await lr.json())?.data ?? []) : []);
    } catch { setError("Gagal memuat notifikasi."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    loadData();
    const t = window.setInterval(loadData, 300_000);
    return () => window.clearInterval(t);
  }, []);

  const filteredLogs = logs.filter(l => ALL_APPROVAL_ACTIONS.includes(l.action)).slice(0, 30);
  const totalPending = cutiPending.length + izinPending.length;

  return (
    <main className="min-h-screen bg-transparent px-3 py-4 sm:px-6 sm:py-8 space-y-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Direktur Utama</p>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-slate-900">Notifikasi</h1>
        <p className="mt-1 text-sm text-slate-400">Pantau seluruh alur approval pengajuan cuti dan izin pegawai RSGM.</p>
        <div className="mt-4 flex gap-3">
          {totalPending > 0 && (
            <span className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-1.5 text-sm font-bold text-violet-700">
              {totalPending} menunggu persetujuan Anda
            </span>
          )}
          <button onClick={loadData} className="rounded-2xl border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Muat Ulang
          </button>
        </div>
        {error && <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      </header>

      {/* Pending untuk Direktur */}
      {totalPending > 0 && (
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-extrabold text-slate-900 mb-4">
            Menunggu Persetujuan Anda
            <span className="ml-2 rounded-full bg-violet-600 px-2.5 py-0.5 text-xs font-bold text-white">{totalPending}</span>
          </h2>
          <div className="space-y-3">
            {[...cutiPending.map(i => ({ ...i, _type: "Cuti" })), ...izinPending.map(i => ({ ...i, _type: "Izin" }))].map((item) => (
              <div
                key={`${item._type}-${item.id}`}
                className={`rounded-3xl border bg-white shadow-sm ${item.is_urgent ? "border-amber-200" : "border-slate-100"}`}
              >
                <div className={`flex items-start justify-between gap-4 rounded-t-3xl p-5 ${item.is_urgent ? "bg-amber-50/60" : "bg-slate-50/60"}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-sm font-extrabold text-slate-700">
                      {item.pegawai?.nama?.[0] ?? "?"}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900">{item.pegawai?.nama ?? "-"}</p>
                      <p className="text-xs text-slate-500">{item.pegawai?.jabatan} · {item.pegawai?.unit}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">{item._type}</span>
                    {item.is_urgent && <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">⚡ Mendesak</span>}
                  </div>
                </div>
                <div className="px-5 pb-5 pt-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{formatJenis(item.jenis_cuti ?? item.jenis_izin)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{timeAgo(item.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Feed aktivitas seluruh sistem */}
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900 mb-4">Aktivitas Approval Seluruh Sistem</h2>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
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
