"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

type Pegawai = { nip?: string; nama?: string; jabatan?: string; unit?: string };

type CutiItem = {
  id: number; jenis_cuti: string; tanggal_mulai: string; tanggal_selesai: string;
  alasan?: string | null; tujuan_cuti?: string | null; status: string;
  is_urgent?: boolean; created_at?: string;
  pegawai?: Pegawai;
  lampiran?: { id?: number; nama_file?: string; path_file?: string }[];
};

type IzinItem = {
  id: number; jenis_izin: string; tanggal: string;
  jam_mulai?: string | null; jam_selesai?: string | null;
  alasan?: string | null; status: string; is_urgent?: boolean; created_at?: string;
  pegawai?: Pegawai;
  lampiran?: { id?: number; nama_file?: string; path_file?: string }[];
};

type ModalState = {
  open: boolean; type: "approve" | "reject" | null;
  kind: "cuti" | "izin"; id: number; nama: string;
};

function extractItems(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatJenis(value?: string) {
  if (!value) return "-";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getLampiranUrl(file?: any) {
  const raw = file?.path_file || file?.file_url || file?.url || "";
  if (!raw) return "#";
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("/")) return `${API_BASE_URL}${raw}`;
  return `${API_BASE_URL}/${raw}`;
}

export default function DireksiApprovalPage() {
  const [cutiItems, setCutiItems]   = useState<CutiItem[]>([]);
  const [izinItems, setIzinItems]   = useState<IzinItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [message, setMessage]       = useState("");
  const [msgType, setMsgType]       = useState<"error" | "success" | "info">("info");
  const [search, setSearch]         = useState("");
  const [tab, setTab]               = useState<"cuti" | "izin">("cuti");
  const [modal, setModal]           = useState<ModalState>({ open: false, type: null, kind: "cuti", id: 0, nama: "" });
  const [note, setNote]             = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    try {
      setLoading(true); setMessage("");
      const token = localStorage.getItem("token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const [cutiRes, izinRes] = await Promise.all([
        fetch(`${API_BASE_URL}/cuti/direksi/pending`,  { headers, cache: "no-store" }),
        fetch(`${API_BASE_URL}/izin/direksi/pending`,  { headers, cache: "no-store" }),
      ]);
      const cutiJson = await cutiRes.json().catch(() => null);
      const izinJson = await izinRes.json().catch(() => null);
      setCutiItems(cutiRes.ok ? extractItems(cutiJson) : []);
      setIzinItems(izinRes.ok ? extractItems(izinJson) : []);
      if (!cutiRes.ok && !izinRes.ok) {
        setMessage("Gagal memuat data pengajuan."); setMsgType("error");
      }
    } catch {
      setMessage("Terjadi kesalahan. Silakan muat ulang halaman."); setMsgType("error");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    loadData();
    const t = window.setInterval(loadData, 300_000);
    return () => window.clearInterval(t);
  }, []);

  function openModal(type: "approve" | "reject", kind: "cuti" | "izin", id: number, nama: string) {
    setNote(""); setModal({ open: true, type, kind, id, nama });
  }
  function closeModal() { setModal({ open: false, type: null, kind: "cuti", id: 0, nama: "" }); setNote(""); }

  async function handleAction() {
    if (!modal.open || !modal.type) return;
    const trimmedNote = note.trim();
    if (modal.type === "reject" && !trimmedNote) {
      setMessage("Alasan penolakan wajib diisi."); setMsgType("error"); return;
    }

    try {
      setSubmitting(true);
      const nip   = localStorage.getItem("nip") || "";
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const endpoint = modal.type === "approve"
        ? `${API_BASE_URL}/${modal.kind}/${modal.id}/approve-direksi`
        : `${API_BASE_URL}/${modal.kind}/${modal.id}/reject-direksi`;

      const body = modal.type === "approve"
        ? { nip, catatan: trimmedNote }
        : { nip, alasan: trimmedNote };

      const res  = await fetch(endpoint, { method: "PATCH", headers, body: JSON.stringify(body) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Gagal memproses.");

      setMessage(modal.type === "approve" ? "Pengajuan berhasil disetujui." : "Pengajuan berhasil ditolak.");
      setMsgType("success");
      closeModal();
      loadData();
    } catch (err: any) {
      setMessage(err.message || "Terjadi kesalahan."); setMsgType("error");
    } finally { setSubmitting(false); }
  }

  const filteredCuti = useMemo(() => {
    const q = search.toLowerCase().trim();
    return cutiItems.filter((item) => {
      const pg = item.pegawai || {};
      return !q || [pg.nama, pg.nip, pg.jabatan, pg.unit, item.jenis_cuti, item.alasan]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [cutiItems, search]);

  const filteredIzin = useMemo(() => {
    const q = search.toLowerCase().trim();
    return izinItems.filter((item) => {
      const pg = item.pegawai || {};
      return !q || [pg.nama, pg.nip, pg.jabatan, pg.unit, item.jenis_izin, item.alasan]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [izinItems, search]);

  const totalPending = cutiItems.length + izinItems.length;

  return (
    <main className="min-h-screen space-y-5 bg-transparent p-3 sm:p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Direksi</p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">Approval Pengajuan</h1>
            <p className="mt-1 text-sm text-slate-400">
              Pengajuan cuti dan izin dari Direktur yang memerlukan persetujuan Direksi.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {totalPending > 0 && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                {totalPending} Menunggu
              </span>
            )}
            <button
              onClick={loadData}
              className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-600 transition hover:bg-violet-100 active:scale-95"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Muat Ulang
            </button>
          </div>
        </div>

        {message && (
          <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
            msgType === "error"   ? "border-rose-200 bg-rose-50 text-rose-700" :
            msgType === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                                    "border-sky-200 bg-sky-50 text-sky-700"
          }`}>{message}</div>
        )}
      </section>

      {/* Tabs + Search */}
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={() => setTab("cuti")}
              className={`relative rounded-lg px-4 py-1.5 text-sm font-bold transition ${tab === "cuti" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Cuti
              {cutiItems.length > 0 && (
                <span className="ml-1.5 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{cutiItems.length}</span>
              )}
            </button>
            <button
              onClick={() => setTab("izin")}
              className={`relative rounded-lg px-4 py-1.5 text-sm font-bold transition ${tab === "izin" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Izin
              {izinItems.length > 0 && (
                <span className="ml-1.5 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{izinItems.length}</span>
              )}
            </button>
          </div>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, NIP, unit..."
            className="flex-1 min-w-[200px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white"
          />
        </div>
      </section>

      {/* Content */}
      <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
            <span className="text-sm text-slate-400">Memuat data…</span>
          </div>
        ) : tab === "cuti" ? (
          filteredCuti.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 py-12 text-center text-sm text-slate-400">
              Tidak ada pengajuan cuti yang menunggu persetujuan Direksi.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCuti.map((item) => (
                <CutiCard key={item.id} item={item} onApprove={() => openModal("approve", "cuti", item.id, item.pegawai?.nama || String(item.id))} onReject={() => openModal("reject", "cuti", item.id, item.pegawai?.nama || String(item.id))} />
              ))}
            </div>
          )
        ) : (
          filteredIzin.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 py-12 text-center text-sm text-slate-400">
              Tidak ada pengajuan izin yang menunggu persetujuan Direksi.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIzin.map((item) => (
                <IzinCard key={item.id} item={item} onApprove={() => openModal("approve", "izin", item.id, item.pegawai?.nama || String(item.id))} onReject={() => openModal("reject", "izin", item.id, item.pegawai?.nama || String(item.id))} />
              ))}
            </div>
          )
        )}
      </section>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            <h2 className="text-lg font-extrabold text-slate-900">
              {modal.type === "approve" ? "Setujui Pengajuan" : "Tolak Pengajuan"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {modal.type === "approve"
                ? `Anda akan menyetujui pengajuan dari ${modal.nama}.`
                : `Anda akan menolak pengajuan dari ${modal.nama}.`}
            </p>

            <div className="mt-5 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {modal.type === "approve" ? "Catatan (opsional)" : "Alasan Penolakan"}{modal.type === "reject" && <span className="ml-1 text-rose-500">*</span>}
              </label>
              <textarea
                value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                placeholder={modal.type === "approve" ? "Catatan tambahan jika ada" : "Tuliskan alasan penolakan"}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button onClick={closeModal} disabled={submitting}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
                Batal
              </button>
              <button onClick={handleAction} disabled={submitting}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-60 ${
                  modal.type === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {submitting ? "Memproses..." : modal.type === "approve" ? "Setujui" : "Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function CutiCard({ item, onApprove, onReject }: { item: CutiItem; onApprove: () => void; onReject: () => void }) {
  const pg = item.pegawai || {};
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">CUTI</span>
            <span className="text-sm font-bold text-slate-900">{formatJenis(item.jenis_cuti)}</span>
            {item.is_urgent && (
              <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">MENDESAK</span>
            )}
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-800">{pg.nama || "-"}</p>
          <p className="text-xs text-slate-500">NIP {pg.nip || "-"} · {pg.jabatan || "-"} · {pg.unit || "-"}</p>
          <p className="mt-1.5 text-xs text-slate-500">
            {formatDate(item.tanggal_mulai)} – {formatDate(item.tanggal_selesai)}
          </p>
          {item.alasan && <p className="mt-1 text-xs text-slate-400 line-clamp-2">{item.alasan}</p>}
          {item.tujuan_cuti && <p className="mt-0.5 text-xs text-slate-400">Tujuan: {item.tujuan_cuti}</p>}
          {(item.lampiran?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.lampiran!.map((f, i) => (
                <a key={i} href={getLampiranUrl(f)} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-violet-600 hover:bg-violet-50 transition">
                  📎 {f.nama_file || "Lampiran"}
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button onClick={onApprove}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95">
            Setujui
          </button>
          <button onClick={onReject}
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 active:scale-95">
            Tolak
          </button>
        </div>
      </div>
      <p className="mt-2.5 text-[11px] text-slate-400">Diajukan {formatDate(item.created_at)}</p>
    </div>
  );
}

function IzinCard({ item, onApprove, onReject }: { item: IzinItem; onApprove: () => void; onReject: () => void }) {
  const pg = item.pegawai || {};
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">IZIN</span>
            <span className="text-sm font-bold text-slate-900">{formatJenis(item.jenis_izin)}</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-800">{pg.nama || "-"}</p>
          <p className="text-xs text-slate-500">NIP {pg.nip || "-"} · {pg.jabatan || "-"} · {pg.unit || "-"}</p>
          <p className="mt-1.5 text-xs text-slate-500">
            {formatDate(item.tanggal)}
            {item.jam_mulai && ` · ${item.jam_mulai}${item.jam_selesai ? ` – ${item.jam_selesai}` : ""}`}
          </p>
          {item.alasan && <p className="mt-1 text-xs text-slate-400 line-clamp-2">{item.alasan}</p>}
          {(item.lampiran?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.lampiran!.map((f, i) => (
                <a key={i} href={getLampiranUrl(f)} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-violet-600 hover:bg-violet-50 transition">
                  📎 {f.nama_file || "Lampiran"}
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button onClick={onApprove}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95">
            Setujui
          </button>
          <button onClick={onReject}
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 active:scale-95">
            Tolak
          </button>
        </div>
      </div>
      <p className="mt-2.5 text-[11px] text-slate-400">Diajukan {formatDate(item.created_at)}</p>
    </div>
  );
}
