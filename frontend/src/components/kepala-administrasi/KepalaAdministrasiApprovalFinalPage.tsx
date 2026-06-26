"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import Modal from "@/components/ui/Modal";

type PegawaiType = {
  nip?: string;
  nama?: string;
  jabatan?: string;
  unit?: string;
};

type LampiranFile = {
  id?: number;
  nama_file?: string | null;
  file_name?: string | null;
  path_file?: string | null;
  file_url?: string | null;
  url?: string | null;
};

type CutiItem = {
  id: number;
  jenis_cuti: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alasan?: string | null;
  status: string;
  is_urgent?: boolean;
  created_at: string;
  catatan_kaur?: string | null;
  catatan_kabag?: string | null;
  pegawai?: PegawaiType;
  lampiran?: LampiranFile[];
};

type IzinItem = {
  id: number;
  jenis_izin: string;
  tanggal: string;
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  alasan?: string | null;
  status: string;
  is_urgent?: boolean;
  created_at: string;
  catatan_kaur?: string | null;
  catatan_kabag?: string | null;
  pegawai?: PegawaiType;
  lampiran?: LampiranFile[];
};

type ApprovalRow = {
  id: number;
  kategori: "Cuti" | "Izin";
  jenis: string;
  periode: string;
  alasan: string;
  status: string;
  urgent?: boolean;
  createdAt: string;
  nama: string;
  nip: string;
  jabatan: string;
  unit: string;
  catatanKaur?: string | null;
  catatanKabag?: string | null;
  lampiran?: LampiranFile[];
};

type ActionMode = "approve" | "reject";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getLampiranUrl(file?: LampiranFile | null) {
  const rawPath = file?.path_file || file?.file_url || file?.url || "";
  if (!rawPath) return "#";
  if (rawPath.startsWith("http")) return rawPath;
  if (rawPath.startsWith("/")) return `${API_BASE_URL}${rawPath}`;
  return `${API_BASE_URL}/${rawPath}`;
}

export default function KepalaAdministrasiApprovalFinalPage() {
  const router = useRouter();
  const [cutiItems, setCutiItems] = useState<CutiItem[]>([]);
  const [izinItems, setIzinItems] = useState<IzinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState<"semua" | "cuti" | "izin">("semua");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<ActionMode>("approve");
  const [selected, setSelected] = useState<ApprovalRow | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setErrorMsg("");
      const nip = localStorage.getItem("nip");
      if (!nip) { router.replace("/login"); return; }

      const token = localStorage.getItem("token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const [cutiRes, izinRes] = await Promise.all([
        fetch(`${API_BASE_URL}/cuti/kepala-administrasi/pending`, { headers }),
        fetch(`${API_BASE_URL}/izin/kepala-administrasi/pending`, { headers }),
      ]);

      const cutiData = await cutiRes.json().catch(() => null);
      const izinData = await izinRes.json().catch(() => null);

      if (cutiRes.ok) setCutiItems(cutiData?.data?.items || []);
      if (izinRes.ok) setIzinItems(izinData?.data?.items || []);

      if (!cutiRes.ok || !izinRes.ok) {
        setErrorMsg("Sebagian data final approval gagal dimuat.");
      } else {
        setMessage("");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Terjadi kesalahan saat memuat data final approval.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const rows = useMemo<ApprovalRow[]>(() => {
    const cutiRows: ApprovalRow[] = cutiItems.map((item) => ({
      id: item.id, kategori: "Cuti",
      jenis: item.jenis_cuti,
      periode: `${formatDate(item.tanggal_mulai)} - ${formatDate(item.tanggal_selesai)}`,
      alasan: item.alasan || "-",
      status: item.status || "Menunggu",
      urgent: item.is_urgent, createdAt: item.created_at,
      nama: item.pegawai?.nama || "-", nip: item.pegawai?.nip || "-",
      jabatan: item.pegawai?.jabatan || "-", unit: item.pegawai?.unit || "-",
      catatanKaur: item.catatan_kaur, catatanKabag: item.catatan_kabag,
      lampiran: item.lampiran,
    }));
    const izinRows: ApprovalRow[] = izinItems.map((item) => ({
      id: item.id, kategori: "Izin",
      jenis: item.jenis_izin,
      periode: `${formatDate(item.tanggal)}${item.jam_mulai && item.jam_selesai ? ` • ${item.jam_mulai} - ${item.jam_selesai}` : ""}`,
      alasan: item.alasan || "-",
      status: item.status || "Menunggu",
      urgent: item.is_urgent, createdAt: item.created_at,
      nama: item.pegawai?.nama || "-", nip: item.pegawai?.nip || "-",
      jabatan: item.pegawai?.jabatan || "-", unit: item.pegawai?.unit || "-",
      catatanKaur: item.catatan_kaur, catatanKabag: item.catatan_kabag,
      lampiran: item.lampiran,
    }));
    return [...cutiRows, ...izinRows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [cutiItems, izinItems]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !keyword ||
        row.nama.toLowerCase().includes(keyword) ||
        row.nip.toLowerCase().includes(keyword) ||
        row.jabatan.toLowerCase().includes(keyword) ||
        row.unit.toLowerCase().includes(keyword) ||
        row.jenis.toLowerCase().includes(keyword);
      const matchesKategori = filterKategori === "semua" || row.kategori.toLowerCase() === filterKategori;
      const matchesUrgent = !urgentOnly || row.urgent;
      return matchesSearch && matchesKategori && matchesUrgent;
    });
  }, [rows, search, filterKategori, urgentOnly]);

  function openActionModal(action: ActionMode, row: ApprovalRow) {
    setMode(action);
    setSelected(row);
    setNote("");
    setErrorMsg("");
    setModalOpen(true);
  }

  async function submitAction() {
    const nip = localStorage.getItem("nip");
    if (!nip) { setErrorMsg("NIP tidak ditemukan, silakan login ulang."); return; }
    if (!selected) return;
    if (!note.trim()) {
      setErrorMsg(mode === "approve" ? "Catatan persetujuan wajib diisi." : "Alasan penolakan wajib diisi.");
      return;
    }

    const base = selected.kategori === "Cuti" ? "cuti" : "izin";
    const endpoint = mode === "approve"
      ? `${API_BASE_URL}/${base}/${selected.id}/approve-kepala-administrasi`
      : `${API_BASE_URL}/${base}/${selected.id}/reject-kepala-administrasi`;

    try {
      setSubmitting(true);
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nip, catatan: note.trim(), note: note.trim(), alasan: note.trim(), reason: note.trim() }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorMsg(data?.message || "Gagal memproses persetujuan final.");
        return;
      }

      if (selected.kategori === "Cuti") {
        setCutiItems((prev) => prev.filter((item) => item.id !== selected.id));
      } else {
        setIzinItems((prev) => prev.filter((item) => item.id !== selected.id));
      }

      setMessage(data?.message || (mode === "approve" ? "Pengajuan berhasil disetujui final." : "Pengajuan berhasil ditolak."));
      setModalOpen(false);
      setSelected(null);
      setNote("");
      setErrorMsg("");
    } catch (error) {
      console.error(error);
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-transparent px-3 py-4 sm:px-6 sm:py-8 text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mx-auto max-w-6xl space-y-5">

        {/* Header */}
        <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
          <button onClick={() => router.back()} className="mb-4 text-sm font-semibold text-slate-500 hover:text-slate-900">← Kembali</button>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Kepala Administrasi</p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-slate-900">Persetujuan Final</h1>
          <p className="mt-1.5 text-sm text-slate-400">Pengajuan yang telah disetujui Kepala Urusan dan Kepala Bagian, menunggu keputusan final.</p>
        </section>

        {/* Stat cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-violet-100 bg-violet-50/60 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-600">Total Menunggu</p>
            <p className="mt-2 text-4xl font-extrabold text-violet-800">{rows.length}</p>
          </div>
          <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-600">Cuti</p>
            <p className="mt-2 text-4xl font-extrabold text-amber-800">{cutiItems.length}</p>
          </div>
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Izin</p>
            <p className="mt-2 text-4xl font-extrabold text-emerald-800">{izinItems.length}</p>
          </div>
        </div>

        {/* Filter */}
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["semua", "cuti", "izin"] as const).map((k) => (
                <button key={k} onClick={() => setFilterKategori(k)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${filterKategori === k ? "bg-violet-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {k === "semua" ? "Semua" : k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
              <button onClick={() => setUrgentOnly(!urgentOnly)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${urgentOnly ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                ⚡ Mendesak
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, NIP..."
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400" />
              <button onClick={loadData}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Muat Ulang
              </button>
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">{message}</div>
        )}
        {errorMsg && !modalOpen && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">{errorMsg}</div>
        )}

        {/* Card list */}
        {loading ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
            <p className="mt-3 text-sm text-slate-400">Memuat data...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center">
            <p className="text-sm font-semibold text-slate-500">Tidak ada pengajuan final yang menunggu keputusan.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRows.map((row) => (
              <div key={`${row.kategori}-${row.id}`}
                className={`rounded-3xl border bg-white shadow-sm ${row.urgent ? "border-amber-200" : "border-slate-100"}`}>

                <div className={`rounded-t-3xl p-5 ${row.urgent ? "bg-amber-50/60" : "bg-slate-50/60"}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 font-extrabold text-violet-700">
                        {(row.nama || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex flex-wrap gap-1.5 mb-1">
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">{row.kategori}</span>
                          {row.urgent && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">⚡ Mendesak</span>}
                        </div>
                        <p className="text-base font-extrabold text-slate-900">{row.nama}</p>
                        <p className="text-sm text-slate-500">{row.nip} · {row.jabatan} · {row.unit}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{row.jenis}</p>
                      <p className="text-sm text-slate-500">{row.periode}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  {(row.catatanKaur || row.catatanKabag) && (
                    <div className="grid gap-3 md:grid-cols-2">
                      {row.catatanKaur && (
                        <div className="rounded-2xl bg-violet-50/60 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-violet-600 mb-1">Catatan Kepala Urusan</p>
                          <p className="text-sm text-slate-700">{row.catatanKaur}</p>
                        </div>
                      )}
                      {row.catatanKabag && (
                        <div className="rounded-2xl bg-emerald-50/60 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-emerald-600 mb-1">Catatan Kepala Bagian</p>
                          <p className="text-sm text-slate-700">{row.catatanKabag}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {row.lampiran && row.lampiran.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {row.lampiran.map((file, i) => (
                        <a key={file.id ?? i} href={getLampiranUrl(file)} target="_blank" rel="noopener noreferrer"
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                          📎 {file.nama_file || file.file_name || `Lampiran ${i + 1}`}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => openActionModal("approve", row)}
                      className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition">
                      Setujui Final
                    </button>
                    <button onClick={() => openActionModal("reject", row)}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100 transition">
                      Tolak
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && selected && (
        <Modal open onClose={() => { setModalOpen(false); setErrorMsg(""); }} className="max-w-lg rounded-3xl">
          <div className="p-4 sm:p-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Kepala Administrasi</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">
              {mode === "approve" ? "Setujui Final" : "Tolak Pengajuan"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{selected.kategori} · {selected.jenis} · {selected.nama}</p>

            {errorMsg && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{errorMsg}</div>
            )}

            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4}
              placeholder={mode === "approve" ? "Catatan persetujuan final..." : "Alasan penolakan..."}
              className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-400" />

            <div className="mt-5 flex justify-end gap-2">
              <button disabled={submitting} onClick={() => { setModalOpen(false); setErrorMsg(""); }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Batal
              </button>
              <button disabled={submitting} onClick={submitAction}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white transition ${mode === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}>
                {submitting ? "Memproses..." : mode === "approve" ? "Setujui Final" : "Tolak"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}
