"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { formatJenis } from "@/lib/labels";

const DIREKTUR_ACTIONS = [
  "APPROVE_CUTI_DIREKTUR", "REJECT_CUTI_DIREKTUR",
  "APPROVE_IZIN_DIREKTUR", "REJECT_IZIN_DIREKTUR",
];

function daysUntilAutoDelete(createdAt: string): number {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.ceil(7 - ms / (1000 * 60 * 60 * 24)));
}

const DISMISSED_KEY = "notif_direktur_dismissed";
function loadDismissed(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]")); } catch { return new Set(); }
}

function fmt(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
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
    APPROVE_CUTI_DIREKTUR: "Anda menyetujui cuti",
    REJECT_CUTI_DIREKTUR: "Anda menolak cuti",
    APPROVE_IZIN_DIREKTUR: "Anda menyetujui izin",
    REJECT_IZIN_DIREKTUR: "Anda menolak izin",
  };
  return map[action] || action;
}

function actionColor(action: string) {
  if (action.includes("APPROVE")) return "bg-emerald-100 text-emerald-700";
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
type AuditLog = { id: number; action: string; description?: string | null; created_at: string };

export default function DirekturNotifikasiPage() {
  const [cutiPending, setCutiPending] = useState<PendingItem[]>([]);
  const [izinPending, setIzinPending] = useState<PendingItem[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => { setDismissed(loadDismissed()); }, []);

  function dismissLog(id: number) {
    const next = new Set([...dismissed, id]);
    setDismissed(next);
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])); } catch {}
  }

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

  const relevantLogs = logs
    .filter(l => DIREKTUR_ACTIONS.includes(l.action))
    .filter(l => Date.now() - new Date(l.created_at).getTime() < 7 * 24 * 60 * 60 * 1000)
    .filter(l => !dismissed.has(l.id))
    .slice(0, 15);
  const totalPending = cutiPending.length + izinPending.length;

  return (
    <main className="min-h-screen bg-transparent px-3 py-4 sm:px-6 sm:py-8 space-y-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Direktur</p>
        <h1 className="mt-1.5 text-3xl font-extrabold text-slate-900">Notifikasi</h1>
        <p className="mt-1 text-sm text-slate-400">Pengajuan dari Kepala Bagian dan riwayat keputusan Anda.</p>
        <div className="mt-4 flex gap-3">
          <span className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-1.5 text-sm font-bold text-violet-700">
            {totalPending} dari Kepala Bagian
          </span>
          <button onClick={loadData} className="rounded-2xl border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Muat Ulang
          </button>
        </div>
        {error && <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      </header>

      {/* Perlu Tindakan */}
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900 mb-4">
          Pengajuan dari Kepala Bagian
          {totalPending > 0 && (
            <span className="ml-2 rounded-full bg-violet-600 px-2.5 py-0.5 text-xs font-bold text-white">{totalPending}</span>
          )}
        </h2>

        {loading ? (
          <div className="flex items-center gap-3 py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
            <span className="text-sm text-slate-400">Memuat...</span>
          </div>
        ) : totalPending === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 py-8 text-center text-sm text-slate-400">
            Tidak ada pengajuan yang menunggu keputusan Anda.
          </div>
        ) : (
          <div className="space-y-3">
            {[...cutiPending.map(i => ({ ...i, _type: "Cuti" })), ...izinPending.map(i => ({ ...i, _type: "Izin" }))].map((item) => (
              <div
                key={`${item._type}-${item.id}`}
                className={`rounded-3xl border bg-white shadow-sm ${item.is_urgent ? "border-amber-200" : "border-slate-100"}`}
              >
                <div className={`flex items-start justify-between gap-4 rounded-t-3xl p-5 ${item.is_urgent ? "bg-amber-50/60" : "bg-slate-50/60"}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-sm font-extrabold text-violet-700">
                      {item.pegawai?.nama?.[0] ?? "?"}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900">{item.pegawai?.nama ?? "-"}</p>
                      <p className="text-xs text-slate-500">{item.pegawai?.nip} · {item.pegawai?.unit}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">{item._type}</span>
                    {item.is_urgent && <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">⚡ Mendesak</span>}
                  </div>
                </div>
                <div className="px-5 pb-5 pt-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{formatJenis(item.jenis_cuti ?? item.jenis_izin)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{timeAgo(item.created_at)}</p>
                  </div>
                  <a
                    href={item._type === "Cuti" ? "/direktur/approval-cuti" : "/direktur/approval-izin"}
                    className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700"
                  >
                    Proses →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Riwayat */}
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900 mb-4">Riwayat Keputusan Anda</h2>
        {relevantLogs.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 py-8 text-center text-sm text-slate-400">Belum ada riwayat keputusan.</div>
        ) : (
          <div className="space-y-2">
            {relevantLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${actionColor(log.action)}`}>
                  {actionLabel(log.action)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700 truncate">{log.description ?? "-"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{fmt(log.created_at)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {daysUntilAutoDelete(log.created_at) <= 1
                      ? "Dihapus otomatis besok"
                      : `Dihapus otomatis dalam ${daysUntilAutoDelete(log.created_at)} hari`}
                  </p>
                </div>
                <button onClick={() => dismissLog(log.id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                  title="Hapus notifikasi">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
