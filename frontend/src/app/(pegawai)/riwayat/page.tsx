"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";

type ItemRiwayat = {
  id: string;
  rawId: number;
  jenis: "Cuti" | "Izin";
  jenisDetail?: string;
  alasan: string;
  tanggalMulai: string;
  tanggalSelesai?: string;
  jamMulai?: string | null;
  jamSelesai?: string | null;
  tanggalPengajuan?: string;
  status: string;
  surat_cuti_diterbitkan?: boolean;
};

const FINAL_STATUSES_RIWAYAT = ["disetujui_final", "selesai", "ditolak_kaur", "ditolak_kabag", "ditolak_direktur", "disetujui_direktur", "direset_admin"];

type FilterStatus = "SEMUA" | "DISETUJUI" | "DITOLAK";
type FilterJenis  = "SEMUA" | "CUTI" | "IZIN";

function getIdentifier() {
  return localStorage.getItem("nip") || localStorage.getItem("username") || "";
}

function formatTanggal(dateStr?: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function durasiLabel(item: ItemRiwayat) {
  const start = new Date(item.tanggalMulai);
  const end   = item.tanggalSelesai && item.tanggalSelesai !== item.tanggalMulai
    ? new Date(item.tanggalSelesai) : start;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
  const hari = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  return `${hari} Hari`;
}

const STATUS_LABEL: Record<string, string> = {
  pending:             "Menunggu KAUR",
  disetujui_kaur:      "Menunggu KABAG",
  disetujui_final:     "Disetujui Final",
  selesai:             "Selesai",
  ditolak_kaur:        "Ditolak KAUR",
  ditolak_kabag:       "Ditolak KABAG",
  ditolak_direktur:    "Ditolak Direktur",
  pending_direktur:    "Menunggu Direktur",
  disetujui_direktur:  "Disetujui Direktur",
  direset_admin:       "Direset oleh Admin",
};

const STATUS_LABEL_DOKTER: Record<string, string> = {
  ...STATUS_LABEL,
  pending:          "Menunggu KABAG",
  disetujui_kaur:   "Menunggu KABAG",
  ditolak_kaur:     "Ditolak",
};

function statusLabel(s: string, isDokter?: boolean) {
  const map = isDokter ? STATUS_LABEL_DOKTER : STATUS_LABEL;
  return map[s] ?? s;
}

function canDownloadPdf(status: string) {
  const s = status.toLowerCase();
  return s === "disetujui_final" || s === "selesai" || s === "disetujui_direktur";
}

function isMenunggu(s: string) {
  return s === "pending" || s === "disetujui_kaur" || s === "pending_direktur";
}
function isDiSetujui(s: string) {
  return s === "disetujui_final" || s === "selesai" || s === "disetujui_direktur";
}
function isDitolak(s: string) {
  return s.includes("tolak") || s.includes("reject");
}

/* ── Timeline ─────────────────────────────────────────────────── */
function getTimelineSteps(item: ItemRiwayat, userRole: string = "", isDokter?: boolean) {
  const s = item.status.toLowerCase();
  const rejected = isDitolak(s);
  const role = userRole.toLowerCase();

  /* ── Izin ── */
  if (item.jenis === "Izin") {
    const jenis = (item.jenisDetail || "").toLowerCase();
    const isAutoSelesai = jenis === "terlambat" || jenis === "tidak_apel";
    const isKaurFinal   = jenis === "pulang_awal" || jenis === "keluar_jam_kerja";

    if (isAutoSelesai) {
      return [
        { label: "Diajukan",         done: true,            rejected: false },
        { label: "Selesai Otomatis", done: s === "selesai", rejected: false },
      ];
    }
    // SDM/Dokter: pulang_awal/keluar → auto selesai, tidak ada step KAUR
    if (isKaurFinal && (role === "sdm" || isDokter)) {
      return [
        { label: "Diajukan", done: true,                                             rejected: false },
        { label: "Selesai",  done: s === "disetujui_final" || s === "selesai",       rejected: false },
      ];
    }
    if (isKaurFinal) {
      return [
        { label: "Diajukan", done: true,                                                                   rejected: false },
        { label: "KAUR",     done: s.includes("kaur") || s.includes("final") || s === "selesai",          rejected: rejected && s.includes("kaur") },
        { label: "Selesai",  done: s === "disetujui_final" || s === "selesai",                             rejected: false },
      ];
    }
    // SDM/Dokter: tidak_masuk → skip KAUR, langsung ke KABAG (3 step)
    if (role === "sdm" || isDokter) {
      const kabagDone = s.includes("kabag") || s === "disetujui_final" || s === "selesai";
      return [
        { label: "Diajukan", done: true,      rejected: false },
        { label: "KABAG",    done: kabagDone, rejected: rejected && s.includes("kabag") },
        { label: "Selesai",  done: s === "disetujui_final" || s === "selesai", rejected: false },
      ];
    }
    return [
      { label: "Diajukan", done: true,                                                               rejected: false },
      { label: "KAUR",     done: s.includes("kaur") || s.includes("kabag") || s.includes("final"),  rejected: rejected && s.includes("kaur") },
      { label: "KABAG",    done: s.includes("kabag") || s.includes("final"),                         rejected: rejected && s.includes("kabag") },
      { label: "Selesai",  done: s === "disetujui_final",                                            rejected: false },
    ];
  }

  /* ── Cuti Kabag: langsung ke Direktur (3 step) ── */
  const melaluiDirektur = s === "pending_direktur" || s === "disetujui_direktur" || s === "ditolak_direktur";
  if (melaluiDirektur || role === "kabag") {
    return [
      { label: "Diajukan",     done: true,                                                              rejected: false },
      { label: "Direktur",     done: s === "disetujui_direktur" || s === "ditolak_direktur",            rejected: s === "ditolak_direktur" },
      { label: "Surat Terbit", done: s === "disetujui_direktur",                                        rejected: false },
    ];
  }

  /* ── Cuti Kaur/SDM/Dokter: langsung ke Kabag (3 step) ── */
  if (role === "kaur" || role === "sdm" || isDokter) {
    const kabagDoneKaur = isDiSetujui(s) || (rejected && s.includes("kabag"));
    return [
      { label: "Diajukan",     done: true,            rejected: false },
      { label: "KABAG",        done: kabagDoneKaur,   rejected: rejected && s.includes("kabag") },
      { label: "Surat Terbit", done: isDiSetujui(s),  rejected: false },
    ];
  }

  /* ── Cuti biasa Pegawai: Kaur → Kabag → Surat Terbit (4 step) ── */
  const kaurDone  = s !== "pending" && s !== "direset_admin";
  const kabagDone = isDiSetujui(s) || (rejected && s.includes("kabag"));
  const finalDone = isDiSetujui(s);

  return [
    { label: "Diajukan",     done: true,      rejected: false },
    { label: "KAUR",         done: kaurDone,  rejected: rejected && s.includes("kaur") },
    { label: "KABAG",        done: kabagDone, rejected: rejected && s.includes("kabag") },
    { label: "Surat Terbit", done: finalDone, rejected: false },
  ];
}

/* ── Badge ────────────────────────────────────────────────────── */
function BadgeStatus({ status, isDokter }: { status: string; isDokter?: boolean }) {
  const s = status.toLowerCase();
  const label = statusLabel(status, isDokter);
  if (isDiSetujui(s))
    return <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">{label}</span>;
  if (isDitolak(s))
    return <span className="inline-flex rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700">{label}</span>;
  if (s === "direset_admin")
    return <span className="inline-flex rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[11px] font-bold text-orange-700">{label}</span>;
  return <span className="inline-flex rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">{label}</span>;
}

/* ── Card ─────────────────────────────────────────────────────── */
function RiwayatCard({ item, userRole, isDokter }: { item: ItemRiwayat; userRole: string; isDokter?: boolean }) {
  const steps = getTimelineSteps(item, userRole, isDokter);
  const isCuti = item.jenis === "Cuti";

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 transition-colors hover:bg-violet-50/50">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              isCuti ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"
            }`}>{item.jenis}</span>
            <h2 className="text-sm font-extrabold text-slate-900">{item.jenisDetail || "-"}</h2>
            <BadgeStatus status={item.status} isDokter={isDokter} />
          </div>

          <p className="mt-2 text-sm text-slate-500">{item.alasan}</p>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
            <span><span className="font-semibold text-slate-600">Diajukan:</span> {formatTanggal(item.tanggalPengajuan)}</span>
            <span>
              <span className="font-semibold text-slate-600">Tanggal:</span>{" "}
              {formatTanggal(item.tanggalMulai)}
              {item.tanggalSelesai && item.tanggalSelesai !== item.tanggalMulai && (
                <> – {formatTanggal(item.tanggalSelesai)}</>
              )}
              {!isCuti && item.jamMulai && (
                <> · {item.jamMulai}{item.jamSelesai ? ` – ${item.jamSelesai}` : ""}</>
              )}
            </span>
            {isCuti && (
              <span><span className="font-semibold text-slate-600">Durasi:</span> {durasiLabel(item)}</span>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {isCuti ? (
            item.surat_cuti_diterbitkan ? (
              <button type="button"
                onClick={() => window.open(`${API_BASE_URL}/cuti/${item.rawId}/pdf`, "_blank")}
                className="rounded-xl bg-violet-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-800 active:scale-95">
                Unduh Surat
              </button>
            ) : canDownloadPdf(item.status) ? (
              <div className="text-right">
                <span className="inline-flex rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                  Menunggu Surat
                </span>
                <p className="mt-1 text-[10px] text-slate-400">Menunggu SDM menerbitkan surat</p>
              </div>
            ) : (
              <span className="inline-flex rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400">
                PDF belum tersedia
              </span>
            )
          ) : (
            canDownloadPdf(item.status) ? (
              <button type="button"
                onClick={() => window.open(`${API_BASE_URL}/izin/${item.rawId}/pdf`, "_blank")}
                className="rounded-xl bg-violet-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-800 active:scale-95">
                Unduh Surat
              </button>
            ) : (
              <span className="inline-flex rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400">
                PDF belum tersedia
              </span>
            )
          )}
        </div>
      </div>

      {/* Timeline */}
      <div
        className="mt-4 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((step, index) => (
          <div
            key={step.label}
            className={`rounded-xl border px-3 py-3 text-center ${
              step.rejected ? "border-rose-200 bg-rose-50"
              : step.done   ? "border-emerald-200 bg-emerald-50"
              :               "border-slate-200 bg-white"
            }`}
          >
            <div className={`mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
              step.rejected ? "bg-rose-500 text-white"
              : step.done    ? "bg-emerald-500 text-white"
              :               "bg-slate-200 text-slate-500"
            }`}>
              {step.rejected ? "✕" : step.done ? "✓" : index + 1}
            </div>
            <p className={`text-[11px] font-bold leading-tight ${
              step.rejected ? "text-rose-700"
              : step.done    ? "text-emerald-700"
              :               "text-slate-400"
            }`}>{step.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────── */
export default function RiwayatPage() {
  const [allData,      setAllData]      = useState<ItemRiwayat[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("SEMUA");
  const [filterJenis,  setFilterJenis]  = useState<FilterJenis>("SEMUA");
  const [filterTahun,  setFilterTahun]  = useState("SEMUA");
  const [tahunOptions, setTahunOptions] = useState<string[]>([]);
  const [userRole,     setUserRole]     = useState("");
  const [isDokter,     setIsDokter]     = useState(false);

  useEffect(() => {
    const role = (localStorage.getItem("internal_role") || localStorage.getItem("role") || "").toLowerCase();
    setUserRole(role);
    const jabatan = (localStorage.getItem("jabatan") || "").toLowerCase();
    setIsDokter(jabatan.includes("dokter"));
  }, []);

  useEffect(() => {
    async function fetchRiwayat() {
      try {
        setLoading(true); setError("");
        const identifier = getIdentifier();
        const token = localStorage.getItem("token");
        if (!identifier) { setError("Data akun tidak ditemukan, silakan login ulang."); return; }
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

        const [cutiRes, izinRes] = await Promise.all([
          fetch(`${API_BASE_URL}/cuti/mine/${identifier}`,  { headers }),
          fetch(`${API_BASE_URL}/izin/mine/${identifier}`,  { headers }),
        ]);
        if (!cutiRes.ok || !izinRes.ok) throw new Error("Gagal memuat riwayat pengajuan.");

        const rawCuti = await cutiRes.json();
        const rawIzin = await izinRes.json();

        const cutiArr = rawCuti?.data?.items || rawCuti?.items || rawCuti?.data || rawCuti || [];
        const izinArr = rawIzin?.data?.items || rawIzin?.items || rawIzin?.data || rawIzin || [];

        const mappedCuti: ItemRiwayat[] = Array.isArray(cutiArr)
          ? cutiArr.map((item: any) => ({
              id: `cuti-${item.id}`, rawId: item.id, jenis: "Cuti" as const,
              jenisDetail: item.jenis_cuti ? "Cuti " + item.jenis_cuti.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "-", alasan: item.alasan || "-",
              tanggalMulai: item.tanggal_mulai, tanggalSelesai: item.tanggal_selesai,
              tanggalPengajuan: item.created_at, status: item.status || "pending",
              surat_cuti_diterbitkan: Boolean(item.surat_cuti_diterbitkan),
            })) : [];

        const mappedIzin: ItemRiwayat[] = Array.isArray(izinArr)
          ? izinArr.map((item: any) => ({
              id: `izin-${item.id}`, rawId: item.id, jenis: "Izin" as const,
              jenisDetail: item.jenis_izin || "-", alasan: item.alasan || "-",
              tanggalMulai: item.tanggal, tanggalSelesai: item.tanggal,
              jamMulai: item.jam_mulai || null, jamSelesai: item.jam_selesai || null,
              tanggalPengajuan: item.created_at, status: item.status || "pending",
            })) : [];

        // Hanya tampilkan yang sudah selesai/final — aktif tampil di Status Pengajuan
        const gabunganRaw = [...mappedCuti, ...mappedIzin].filter((item) =>
          FINAL_STATUSES_RIWAYAT.includes(item.status.toLowerCase())
        );

        // Newest first
        const gabungan = gabunganRaw.sort((a, b) =>
          new Date(b.tanggalPengajuan || b.tanggalMulai).getTime() -
          new Date(a.tanggalPengajuan || a.tanggalMulai).getTime()
        );

        setAllData(gabungan);

        const tahunSet = new Set<string>();
        gabungan.forEach((item) => {
          const t = new Date(item.tanggalPengajuan || item.tanggalMulai).getFullYear();
          if (!Number.isNaN(t)) tahunSet.add(String(t));
        });
        setTahunOptions(Array.from(tahunSet).sort((a, b) => Number(b) - Number(a)));
      } catch (err: any) {
        setError(err.message || "Terjadi kesalahan saat memuat riwayat.");
      } finally {
        setLoading(false);
      }
    }
    fetchRiwayat();
  }, []);

  const filtered = allData.filter((item) => {
    const s = item.status.toLowerCase();
    if (filterJenis === "CUTI" && item.jenis !== "Cuti") return false;
    if (filterJenis === "IZIN" && item.jenis !== "Izin") return false;
    if (filterStatus === "DISETUJUI" && !isDiSetujui(s)) return false;
    if (filterStatus === "DITOLAK"   && !isDitolak(s))   return false;
    if (filterTahun !== "SEMUA") {
      const year = new Date(item.tanggalPengajuan || item.tanggalMulai).getFullYear();
      if (String(year) !== filterTahun) return false;
    }
    return true;
  });

  const cutiCount = allData.filter((i) => i.jenis === "Cuti").length;
  const izinCount = allData.filter((i) => i.jenis === "Izin").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .riwayat-wrap, .riwayat-wrap * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .riwayat-wrap { -webkit-font-smoothing: antialiased; }
      `}</style>

      <main className="riwayat-wrap min-h-screen bg-transparent">
        <div className="mx-auto max-w-6xl space-y-5 px-3 py-4 sm:px-6 sm:py-8">

          {/* Header + filter */}
          <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-7 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Riwayat</p>
                <h1 className="mt-1.5 text-2xl font-extrabold text-slate-900 tracking-tight">Riwayat Pengajuan</h1>
                <p className="mt-1.5 text-sm text-slate-400">Daftar pengajuan cuti dan izin yang sudah selesai (disetujui atau ditolak).</p>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 cursor-pointer"
                  >
                    <option value="SEMUA">Semua Status</option>
                    <option value="DISETUJUI">Disetujui</option>
                    <option value="DITOLAK">Ditolak</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">Tahun</label>
                  <select
                    value={filterTahun}
                    onChange={(e) => setFilterTahun(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 cursor-pointer"
                  >
                    <option value="SEMUA">Semua Tahun</option>
                    {tahunOptions.map((th) => <option key={th} value={th}>{th}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Tab Jenis */}
            <div className="mt-5 flex gap-2">
              {([
                { key: "SEMUA", label: "Semua", count: allData.length },
                { key: "CUTI",  label: "Cuti",  count: cutiCount },
                { key: "IZIN",  label: "Izin",  count: izinCount },
              ] as { key: FilterJenis; label: string; count: number }[]).map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilterJenis(key)}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                    filterJenis === key
                      ? "bg-violet-700 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                  }`}
                >
                  {label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                    filterJenis === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}>{count}</span>
                </button>
              ))}
            </div>
          </section>

          {loading && (
            <section className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
              <div className="space-y-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl border border-slate-100 p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Skeleton className="h-5 w-10 rounded-full" />
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-3/4 mb-3" />
                    <div className="flex gap-4 mb-4">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 1, 2, 3].map((j) => <Skeleton key={j} className="h-16 rounded-xl" />)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          {!loading && !error && (
            <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-7 shadow-sm">
              {filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  {allData.length === 0 ? "Belum ada riwayat pengajuan yang selesai." : "Tidak ada pengajuan yang sesuai dengan filter."}
                </p>
              ) : (
                <div className="space-y-4">
                  {filtered.map((item) => <RiwayatCard key={item.id} item={item} userRole={userRole} isDokter={isDokter} />)}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </>
  );
}
