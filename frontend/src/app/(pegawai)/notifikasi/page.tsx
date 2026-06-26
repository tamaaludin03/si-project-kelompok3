"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatJenis } from "@/lib/labels";

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

type StatusKey = string;

function statusLabel(s: StatusKey, isDokter?: boolean) {
  const map: Record<string, string> = {
    pending: isDokter ? "Menunggu KABAG" : "Menunggu Kep. Urusan",
    disetujui_kaur: isDokter ? "Menunggu KABAG" : "Disetujui Kep. Urusan",
    ditolak_kaur: isDokter ? "Ditolak" : "Ditolak Kep. Urusan",
    disetujui_final: "Disetujui Final",
    ditolak_kabag: "Ditolak Kep. Bagian",
    pending_direktur: "Menunggu Direktur",
    disetujui_direktur: "Disetujui Direktur",
    ditolak_direktur: "Ditolak Direktur",
    selesai: "Surat Terbit",
    direset_admin: "Direset oleh Admin",
  };
  return map[s] || s;
}

function statusStyle(s: StatusKey) {
  if (s === "selesai") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "direset_admin") return "border-orange-200 bg-orange-50 text-orange-700";
  if (s.includes("disetujui")) return "border-sky-200 bg-sky-50 text-sky-700";
  if (s.includes("ditolak")) return "border-rose-200 bg-rose-50 text-rose-700";
  if (s === "pending" || s.includes("pending")) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function isNewStatus(s: StatusKey) {
  return s !== "pending";
}

type MyItem = {
  id: number;
  jenis_cuti?: string;
  jenis_izin?: string;
  tanggal_mulai?: string;
  tanggal?: string;
  status: StatusKey;
  is_urgent?: boolean;
  created_at: string;
  _type?: string;
};

const DISMISSED_KEY = "notif_pegawai_dismissed";

function loadDismissed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]")); } catch { return new Set(); }
}

export default function PegawaiNotifikasiPage() {
  const [cutiList, setCutiList] = useState<MyItem[]>([]);
  const [izinList, setIzinList] = useState<MyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isDokter, setIsDokter] = useState(false);

  useEffect(() => {
    setDismissed(loadDismissed());
    setIsDokter((localStorage.getItem("jabatan") || "").toLowerCase().includes("dokter"));
  }, []);

  function dismissItem(key: string) {
    const next = new Set([...dismissed, key]);
    setDismissed(next);
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])); } catch {}
  }

  async function loadData() {
    setLoading(true); setError("");
    try {
      const identifier = localStorage.getItem("nip") || localStorage.getItem("username") || (() => {
        try { const r = localStorage.getItem("simciUser"); const u = r ? JSON.parse(r) : null; return u?.nip || u?.username || null; } catch { return null; }
      })();
      if (!identifier) { setError("Sesi tidak valid, silakan login ulang."); setLoading(false); return; }

      const token = localStorage.getItem("token");
      const h: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const [cr, ir] = await Promise.all([
        fetch(`${API_BASE_URL}/cuti/mine/${identifier}`, { headers: h, cache: "no-store" }),
        fetch(`${API_BASE_URL}/izin/mine/${identifier}`, { headers: h, cache: "no-store" }),
      ]);
      if (cr.ok) { const d = await cr.json(); setCutiList(d?.data?.items ?? d?.data ?? []); }
      if (ir.ok) { const d = await ir.json(); setIzinList(d?.data?.items ?? d?.data ?? []); }
    } catch { setError("Gagal memuat notifikasi."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    loadData();
    const t = window.setInterval(loadData, 300_000);
    return () => window.clearInterval(t);
  }, []);

  const allItems = useMemo(() => {
    const merged = [
      ...cutiList.map(i => ({ ...i, _type: "Cuti" })),
      ...izinList.map(i => ({ ...i, _type: "Izin" })),
    ];
    return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [cutiList, izinList]);

  const updates = allItems.filter(i => isNewStatus(i.status) && !dismissed.has(`${i._type}-${i.id}`));
  const pending = allItems.filter(i => i.status === "pending");

  return (
    <main className="min-h-screen bg-transparent px-3 py-4 sm:px-6 sm:py-8 space-y-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Pegawai</p>
        <h1 className="mt-1.5 text-3xl font-extrabold text-slate-900">Notifikasi Saya</h1>
        <p className="mt-1 text-sm text-slate-400">Status terkini seluruh pengajuan cuti dan izin Anda. Diperbarui setiap 30 detik.</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            {updates.length > 0 && (
              <span className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-1.5 text-sm font-bold text-sky-700">
                {updates.length} pengajuan diproses
              </span>
            )}
            {pending.length > 0 && (
              <span className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-1.5 text-sm font-bold text-amber-700">
                {pending.length} menunggu approval
              </span>
            )}
          </div>
          <button onClick={loadData} className="ml-auto flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <RefreshCw size={14} />
            Muat Ulang
          </button>
        </div>
        {error && <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      </header>

      {/* Update status */}
      {updates.length > 0 && (
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-extrabold text-slate-900 mb-4">Pembaruan Status</h2>
          <div className="space-y-3">
            {updates.map((item) => (
              <div
                key={`${item._type}-${item.id}`}
                className={`rounded-3xl border bg-white shadow-sm ${
                  item.status === "direset_admin" ? "border-orange-200" :
                  item.status.includes("ditolak") ? "border-rose-200" :
                  item.status === "selesai" ? "border-emerald-200" : "border-slate-100"
                }`}
              >
                <div className={`flex items-center justify-between gap-4 rounded-t-3xl p-5 ${
                  item.status === "direset_admin" ? "bg-orange-50/60" :
                  item.status.includes("ditolak") ? "bg-rose-50/60" :
                  item.status === "selesai" ? "bg-emerald-50/60" : "bg-sky-50/60"
                }`}>
                  <div>
                    <p className="font-extrabold text-slate-900">{formatJenis(item.jenis_cuti ?? item.jenis_izin)}</p>
                    {item.status === "direset_admin" ? (
                      <p className="text-xs text-orange-600 mt-0.5 font-medium">Kuota cuti ini telah direset oleh admin</p>
                    ) : (
                      <p className="text-xs text-slate-500 mt-0.5">{item._type} · {fmt(item.tanggal_mulai ?? item.tanggal)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${statusStyle(item.status)}`}>
                      {statusLabel(item.status, isDokter)}
                    </span>
                    <button onClick={() => dismissItem(`${item._type}-${item.id}`)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                      title="Hapus notifikasi">
                      <X size={12} />
                    </button>
                  </div>
                </div>
                <div className="px-5 py-3">
                  <p className="text-xs text-slate-400">{timeAgo(item.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Semua pengajuan */}
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-900 mb-4">Semua Pengajuan Saya</h2>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <Skeleton className="h-6 w-12 rounded-full shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-24 rounded-full shrink-0" />
                <Skeleton className="h-4 w-16 hidden sm:block shrink-0" />
              </div>
            ))}
          </div>
        ) : allItems.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 py-10 text-center text-sm text-slate-400">
            Belum ada pengajuan cuti atau izin.
          </div>
        ) : (
          <div className="space-y-2">
            {allItems.map((item, idx) => (
              <div key={`${item._type}-${item.id}-${idx}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">{item._type}</span>
                <p className="min-w-0 flex-1 text-sm font-semibold text-slate-800 truncate">
                  {formatJenis(item.jenis_cuti ?? item.jenis_izin)}
                </p>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusStyle(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
                <p className="shrink-0 text-xs text-slate-400 hidden sm:block">{timeAgo(item.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
