"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import { API_BASE_URL } from "@/lib/api";
import Modal from "@/components/ui/Modal";

type Pegawai = { nip?: string; nama?: string; jabatan?: string; unit?: string; jenis_kelamin?: string };

type CutiItem = {
  id: number;
  jenis_cuti: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alasan?: string | null;
  tujuan_cuti?: string | null;
  no_hp_selama_cuti?: string | null;
  penyerahan_tugas_kepada?: string | null;
  jabatan_pengganti?: string | null;
  status: string;
  created_at?: string;
  is_urgent?: boolean;
  catatan_kaur?: string | null;
  pegawai?: Pegawai;
  lampiran?: { id?: number; nama_file?: string; path_file?: string }[];
};

type ModalState = { open: boolean; type: "approve" | "reject" | null; item: CutiItem | null };

function extractItems(payload: any): CutiItem[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function statusClass(status?: string) {
  const v = (status || "").toLowerCase();
  if (v.includes("tolak") || v.includes("reject"))  return "border-rose-200 bg-rose-50 text-rose-700";
  if (v.includes("approve") || v.includes("setuju")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function statusLabel(status?: string) {
  const v = (status || "").toLowerCase();
  if (v.includes("tolak") || v.includes("reject"))  return "Ditolak";
  if (v.includes("approve") || v.includes("setuju")) return "Disetujui";
  return "Menunggu";
}

function formatJenis(value?: string) {
  if (!value) return "-";
  return "Cuti " + value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type LampiranFile = {
  id?: number; nama_file?: string | null; file_name?: string | null;
  path_file?: string | null; file_url?: string | null; url?: string | null;
};

function calcDurasi(mulai?: string | null, selesai?: string | null) {
  if (!mulai || !selesai) return "-";
  const s = new Date(mulai), e = new Date(selesai);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "-";
  return `${Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1)} hari`;
}

function getLampiranUrl(file?: LampiranFile | null) {
  const raw = file?.path_file || file?.file_url || file?.url || "";
  if (!raw) return "#";
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("/")) return `${API_BASE_URL}${raw}`;
  return `${API_BASE_URL}/${raw}`;
}

/* ── Main component ─────────────────────────────────────────── */
export default function KabagApprovalCutiPage() {
  const [items, setItems]             = useState<CutiItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [message, setMessage]         = useState("");
  const [msgType, setMsgType]         = useState<"error" | "success" | "info">("info");
  const [search, setSearch]           = useState("");
  const [urgentOnly, setUrgentOnly]   = useState(false);
  const [jenisFilter, setJenisFilter] = useState("semua");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [modal, setModal]             = useState<ModalState>({ open: false, type: null, item: null });
  const [note, setNote]               = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [detailItem,      setDetailItem]      = useState<CutiItem | null>(null);
  const [sisaCuti,        setSisaCuti]        = useState<any>(null);
  const [sisaCutiLoading, setSisaCutiLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");
      const token = localStorage.getItem("token");
      const nip   = localStorage.getItem("nip") || "";
      const nipQuery = nip ? `?nip=${encodeURIComponent(nip)}` : "";
      const res   = await fetch(`${API_BASE_URL}/cuti/kabag/pending${nipQuery}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage("Gagal memuat data pengajuan cuti. Silakan coba lagi.");
        setMsgType("error"); setItems([]); return;
      }
      setItems(extractItems(json).filter((i: any) => i.pegawai?.nip !== nip));
    } catch {
      setMessage("Terjadi kesalahan. Silakan muat ulang halaman.");
      setMsgType("error"); setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const t = window.setInterval(loadData, 300_000);
    return () => window.clearInterval(t);
  }, []);

  const jenisOptions = useMemo(() =>
    ["semua", ...Array.from(new Set(items.map((i) => i.jenis_cuti).filter(Boolean)))],
    [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((item) => {
      const pg = item.pegawai || {};
      const matchSearch = !q || [pg.nama, pg.nip, pg.jabatan, pg.unit, item.jenis_cuti, item.alasan, item.catatan_kaur]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      const matchUrgent = urgentOnly ? Boolean(item.is_urgent) : true;
      const matchJenis  = jenisFilter === "semua" ? true : item.jenis_cuti === jenisFilter;
      const mulai = new Date(item.tanggal_mulai).getTime();
      const from  = dateFrom ? new Date(dateFrom).getTime() : null;
      const to    = dateTo   ? new Date(dateTo).getTime()   : null;
      return matchSearch && matchUrgent && matchJenis
        && (from ? mulai >= from : true) && (to ? mulai <= to : true);
    });
  }, [items, search, urgentOnly, jenisFilter, dateFrom, dateTo]);

  function openModal(type: "approve" | "reject", item: CutiItem) {
    setModal({ open: true, type, item }); setNote(""); setMessage("");
  }
  function closeModal() {
    if (submitting) return;
    setModal({ open: false, type: null, item: null }); setNote("");
  }

  async function submitDecision() {
    if (!modal.item || !modal.type) return;
    const trimmedNote = note.trim();
    if (!trimmedNote) {
      setMessage(modal.type === "approve" ? "Catatan persetujuan wajib diisi." : "Alasan penolakan wajib diisi.");
      setMsgType("error"); return;
    }
    try {
      setSubmitting(true); setMessage("");
      const token    = localStorage.getItem("token");
      const actorNip = localStorage.getItem("nip") || "";
      if (!actorNip) {
        setMessage("Data akun tidak ditemukan. Silakan login ulang.");
        setMsgType("error"); return;
      }
      const endpoint = modal.type === "approve"
        ? `${API_BASE_URL}/cuti/${modal.item.id}/approve-kabag`
        : `${API_BASE_URL}/cuti/${modal.item.id}/reject-kabag`;
      const body = modal.type === "approve"
        ? { nip: actorNip, catatan_kabag: trimmedNote, catatan: trimmedNote, note: trimmedNote }
        : { nip: actorNip, rejected_reason_kabag: trimmedNote, alasan: trimmedNote, reason: trimmedNote };
      const res  = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(json?.message || "Gagal memproses keputusan. Silakan coba lagi.");
        setMsgType("error"); return;
      }
      setToast({ msg: modal.type === "approve" ? "Pengajuan berhasil disetujui!" : "Pengajuan berhasil ditolak!", type: modal.type === "approve" ? "success" : "error" });
      closeModal(); await loadData();
    } catch {
      setMessage("Terjadi kesalahan saat memproses keputusan."); setMsgType("error");
    } finally {
      setSubmitting(false);
    }
  }

  function openDetail(item: CutiItem) {
    setDetailItem(item); setSisaCuti(null);
    if (item.pegawai?.nip) {
      setSisaCutiLoading(true);
      const token = localStorage.getItem("token");
      fetch(`${API_BASE_URL}/cuti/sisa-cuti/${item.pegawai.nip}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).then(r => r.json()).then(json => setSisaCuti(json?.data || null)).catch(() => setSisaCuti(null)).finally(() => setSisaCutiLoading(false));
    }
  }
  function closeDetail() { setDetailItem(null); setSisaCuti(null); }

  function resetFilter() {
    setSearch(""); setUrgentOnly(false); setJenisFilter("semua"); setDateFrom(""); setDateTo("");
  }

  const msgCls = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    error:   "bg-rose-50 border-rose-200 text-rose-800",
    info:    "bg-amber-50 border-amber-200 text-amber-800",
  }[msgType];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="min-h-screen bg-transparent">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      <div className="mx-auto max-w-6xl space-y-5 px-3 py-4 sm:px-6 sm:py-8">

        {/* ── Header ── */}
        <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-500">Kepala Bagian</p>
              <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">Persetujuan Cuti</h1>
              <p className="mt-1.5 text-sm text-slate-400">
                Pengajuan yang telah disetujui Kepala Unit dan menunggu keputusan Anda.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-2xl border border-violet-100 bg-violet-50 px-3.5 py-1.5 text-xs font-bold text-violet-700">
                {items.length} pengajuan
              </span>
              <button onClick={loadData}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-95">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                Muat Ulang
              </button>
            </div>
          </div>
        </section>

        {/* ── Filter ── */}
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          {/* Search row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} type="text"
                placeholder="Cari nama, NIP, jabatan, unit, jenis cuti..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 focus:bg-white" />
            </div>
            <label className="flex cursor-pointer select-none items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">
              <input type="checkbox" checked={urgentOnly} onChange={(e) => setUrgentOnly(e.target.checked)} className="h-4 w-4 accent-violet-600 rounded" />
              Mendesak saja
            </label>
          </div>

          {/* Filter grid */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Jenis Cuti</label>
              <select value={jenisFilter} onChange={(e) => setJenisFilter(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100">
                {jenisOptions.map((j) => (
                  <option key={j} value={j}>{j === "semua" ? "Semua Jenis" : formatJenis(j)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Dari Tanggal</label>
              <input value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} type="date"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Sampai Tanggal</label>
              <input value={dateTo} onChange={(e) => setDateTo(e.target.value)} type="date"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
            </div>
            <div className="flex items-end">
              <button onClick={resetFilter}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">
                Hapus Filter
              </button>
            </div>
          </div>
        </section>

        {/* ── Notif ── */}
        {message && (
          <div className={`rounded-2xl border px-5 py-3.5 text-sm font-semibold ${msgCls}`}>{message}</div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
            <p className="mt-3 text-sm text-slate-400">Memuat data pengajuan cuti...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Tidak ada pengajuan cuti saat ini.</p>
            <p className="mt-1 text-xs text-slate-400">Data akan muncul setelah disetujui oleh Kepala Unit.</p>
          </div>
        ) : (
          <>
            <p className="px-1 text-xs font-semibold text-slate-400">
              Menampilkan {filtered.length} dari {items.length} pengajuan
            </p>

            <div className="space-y-3">
              {filtered.map((item) => {
                const lampiran = (item.lampiran || []) as LampiranFile[];
                return (
                  <div key={item.id}
                    className={`rounded-3xl border bg-white shadow-sm transition hover:shadow-md ${item.is_urgent ? "border-amber-200" : "border-slate-100"}`}>

                    {/* Card header */}
                    <div className={`flex flex-wrap items-start justify-between gap-3 rounded-t-3xl px-3 py-3 sm:px-6 sm:py-4 ${item.is_urgent ? "bg-amber-50/60" : "bg-slate-50/60"}`}>
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-base font-extrabold text-violet-700">
                          {(item.pegawai?.nama || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-slate-900">{item.pegawai?.nama || "-"}</p>
                          <p className="text-xs text-slate-500">NIP {item.pegawai?.nip || "-"} &nbsp;·&nbsp; {item.pegawai?.jabatan || "-"}</p>
                          <p className="text-xs text-slate-400">Unit: {item.pegawai?.unit || "-"}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.is_urgent && (
                          <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-700">
                            ⚡ Mendesak
                          </span>
                        )}
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${statusClass(item.status)}`}>
                          {statusLabel(item.status)}
                        </span>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="grid grid-cols-1 gap-4 px-3 py-4 sm:px-6 sm:py-5 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Jenis Cuti</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{formatJenis(item.jenis_cuti)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Periode</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {formatDate(item.tanggal_mulai)}
                          <span className="mx-1.5 text-slate-400">–</span>
                          {formatDate(item.tanggal_selesai)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Alasan</p>
                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">{item.alasan || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Catatan Kepala Unit</p>
                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">{item.catatan_kaur || "-"}</p>
                      </div>
                    </div>

                    {/* Card footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-3 py-3 sm:px-6 sm:py-4">
                      {/* Lampiran */}
                      <div className="flex flex-wrap items-center gap-2">
                        {lampiran.length === 0 ? (
                          <span className="text-xs text-slate-400">Tidak ada lampiran</span>
                        ) : lampiran.map((f, i) => {
                          const label = f.nama_file || f.file_name || `Lampiran ${i + 1}`;
                          return (
                            <a key={f.id || i} href={getLampiranUrl(f)} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100">
                              📎 {label.length > 20 ? label.slice(0, 20) + "…" : label}
                            </a>
                          );
                        })}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => openDetail(item)}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-95">
                          <Eye size={14} />
                          Detail
                        </button>
                        <button onClick={() => openModal("reject", item)}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100 active:scale-95">
                          Tolak
                        </button>
                        <button onClick={() => openModal("approve", item)}
                          className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95">
                          Setujui
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {detailItem && (
        <Modal open onClose={closeDetail} className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-4 sm:px-7 sm:py-5 rounded-t-3xl">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-500">Detail Pengajuan</p>
                <h3 className="mt-1 text-xl font-extrabold text-slate-900">Cuti</h3>
              </div>
              <button onClick={closeDetail} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-4 px-4 py-4 sm:px-7 sm:py-5">
              {/* Pegawai */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Data Pegawai</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[["Nama", detailItem.pegawai?.nama], ["NIP", detailItem.pegawai?.nip], ["Jabatan", detailItem.pegawai?.jabatan], ["Unit", detailItem.pegawai?.unit]].map(([label, val]) => (
                    <div key={String(label)}>
                      <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
                      <p className="mt-0.5 font-semibold text-slate-800">{val || "-"}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Jenis & Periode */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Detail Pengajuan</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Jenis Cuti</p>
                    <p className="mt-0.5 font-semibold text-slate-800">{formatJenis(detailItem.jenis_cuti)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Periode</p>
                    <p className="mt-0.5 font-semibold text-slate-800">{formatDate(detailItem.tanggal_mulai)} – {formatDate(detailItem.tanggal_selesai)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Durasi</p>
                    <p className="mt-0.5 font-semibold text-slate-800">{calcDurasi(detailItem.tanggal_mulai, detailItem.tanggal_selesai)}</p>
                  </div>
                </div>
              </div>
              {/* Alasan */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Alasan / Tujuan</p>
                <p className="text-sm text-slate-700">{detailItem.alasan || "-"}</p>
                {detailItem.tujuan_cuti && <p className="mt-1.5 text-sm text-slate-600">{detailItem.tujuan_cuti}</p>}
              </div>
              {/* Informasi Tambahan */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Informasi Tambahan</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[["No HP Selama Cuti", detailItem.no_hp_selama_cuti], ["Penyerahan Tugas Kepada", detailItem.penyerahan_tugas_kepada], ["Jabatan Pengganti", detailItem.jabatan_pengganti]].map(([label, val]) => (
                    <div key={String(label)}>
                      <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
                      <p className="mt-0.5 font-semibold text-slate-800">{val || "-"}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Catatan Kaur */}
              {detailItem.catatan_kaur && (
                <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Catatan Kepala Unit</p>
                  <p className="text-sm text-slate-700">{detailItem.catatan_kaur}</p>
                </div>
              )}
              {/* Sisa Kuota */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Sisa Kuota Cuti</p>
                {sisaCutiLoading ? (
                  <p className="text-xs text-slate-400">Memuat...</p>
                ) : sisaCuti?.kuota ? (() => {
                  const isFemale = (detailItem.pegawai?.jenis_kelamin ?? "P") === "P";
                  const MALE_KUOTA = ["tahunan", "besar", "menikah"];
                  const entries = Object.entries(sisaCuti.kuota).filter(([k]) =>
                    isFemale ? true : MALE_KUOTA.includes(k)
                  );
                  const LABEL: Record<string, string> = { tahunan: "Tahunan", besar: "Besar/Ibadah", haid: "Haid", menikah: "Menikah", melahirkan: "Melahirkan" };
                  return (
                    <div className="grid grid-cols-3 gap-2">
                      {entries.map(([k, v]: [string, any]) => (
                        <div key={k} className="rounded-xl border border-slate-200 bg-white p-2.5 text-center">
                          <p className="text-[10px] font-bold uppercase text-slate-500">{LABEL[k] ?? k}</p>
                          <p className="mt-1 text-xl font-black text-violet-700">{v.sisa}</p>
                          <p className="text-[10px] text-slate-400">{v.terpakai}/{v.jatah} terpakai</p>
                        </div>
                      ))}
                    </div>
                  );
                })() : (
                  <p className="text-xs text-slate-400">Data kuota tidak tersedia</p>
                )}
              </div>
              {/* Lampiran */}
              {(detailItem.lampiran || []).length > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Lampiran</p>
                  <div className="flex flex-wrap gap-2">
                    {(detailItem.lampiran || []).map((f: any, i: number) => (
                      <a key={f.id || i} href={getLampiranUrl(f)} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100">
                        📎 {f.nama_file || f.file_name || `Lampiran ${i + 1}`}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-4 py-4 sm:px-7 sm:py-5">
              <button onClick={closeDetail}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                Tutup
              </button>
              <button onClick={() => { closeDetail(); openModal("reject", detailItem); }}
                className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-100">
                Tolak
              </button>
              <button onClick={() => { closeDetail(); openModal("approve", detailItem); }}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700">
                Setujui
              </button>
            </div>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}

      {/* ── Modal ── */}
      {modal.open && modal.item && (
        <Modal open onClose={closeModal} className="max-w-lg rounded-3xl">
          <div className="p-4 sm:p-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-500">
              {modal.type === "approve" ? "Konfirmasi Persetujuan" : "Konfirmasi Penolakan"}
            </p>
            <h3 className="mt-1.5 text-xl font-extrabold text-slate-900">
              {modal.type === "approve" ? "Setujui Pengajuan Cuti" : "Tolak Pengajuan Cuti"}
            </h3>

            {/* Pegawai info */}
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-sm font-extrabold text-violet-700">
                {(modal.item.pegawai?.nama || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{modal.item.pegawai?.nama || "-"}</p>
                <p className="text-xs text-slate-500">
                  {formatJenis(modal.item.jenis_cuti)} &nbsp;·&nbsp;
                  {formatDate(modal.item.tanggal_mulai)} – {formatDate(modal.item.tanggal_selesai)}
                </p>
              </div>
            </div>

            {/* Catatan Kepala Unit */}
            {modal.item.catatan_kaur && (
              <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Catatan Kepala Unit</p>
                <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">{modal.item.catatan_kaur}</p>
              </div>
            )}

            {/* Input catatan */}
            <div className="mt-5 space-y-1.5">
              <label className="text-sm font-bold text-slate-700">
                {modal.type === "approve" ? "Catatan Persetujuan" : "Alasan Penolakan"}
                <span className="ml-1 text-rose-500">*</span>
              </label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4}
                placeholder={modal.type === "approve"
                  ? "Contoh: Disetujui, pengajuan layak diteruskan ke Kepala Administrasi."
                  : "Contoh: Ditolak karena kebutuhan operasional bagian belum memungkinkan."}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />
              {message && <p className="text-xs font-semibold text-rose-600">{message}</p>}
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeModal} disabled={submitting}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60">
                Batal
              </button>
              <button onClick={submitDecision} disabled={submitting}
                className={`rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-60 ${modal.type === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}>
                {submitting ? "Memproses..." : modal.type === "approve" ? "Setujui" : "Tolak"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
