"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import Modal from "@/components/ui/Modal";
const URGENT_LIMIT_DAYS = 7;
const MAX_FILE_MB = 5;

type JenisCuti = "tahunan" | "besar" | "haid" | "menikah" | "melahirkan";

const ALL_JENIS_CUTI_OPTIONS: { value: JenisCuti; label: string; kuota: string; motongTahunan: boolean; khususPerempuan?: boolean }[] = [
  { value: "tahunan",    label: "Cuti Tahunan",      kuota: "12 hari/tahun", motongTahunan: true  },
  { value: "besar",      label: "Cuti Besar/Ibadah", kuota: "10 hari",       motongTahunan: false },
  { value: "haid",       label: "Cuti Haid",         kuota: "1 hari",        motongTahunan: false, khususPerempuan: true },
  { value: "menikah",    label: "Cuti Menikah",      kuota: "3 hari",        motongTahunan: false },
  { value: "melahirkan", label: "Cuti Melahirkan",   kuota: "90 hari",       motongTahunan: false, khususPerempuan: true },
];

function getJenisKelamin(): string {
  try {
    const raw = localStorage.getItem("user") || localStorage.getItem("simciUser");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.jenis_kelamin) return parsed.jenis_kelamin;
    }
  } catch {}
  return localStorage.getItem("jenis_kelamin") || "";
}

function filterJenisCuti(jk: string) {
  if (jk === "L") return ALL_JENIS_CUTI_OPTIONS.filter((o) => !o.khususPerempuan);
  return ALL_JENIS_CUTI_OPTIONS;
}

function getIdentifier() {
  return localStorage.getItem("nip") || localStorage.getItem("username") || "";
}

function getUserUnit(): string {
  try {
    const raw = localStorage.getItem("user") || localStorage.getItem("simciUser");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.unit) return parsed.unit;
    }
  } catch {}
  return localStorage.getItem("unit") || "";
}

function getUrgentInfo(dateValue: string) {
  if (!dateValue) return null;
  const today = new Date(); const target = new Date(dateValue);
  today.setHours(0, 0, 0, 0); target.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return { diffDays, isUrgent: diffDays <= URGENT_LIMIT_DAYS };
}

const CUTI_ALLOWED_ROLES = ["pegawai", "kaur", "kabag", "sdm", "admin", "it", "direktur"];

function getRoleDashboard(role: string): string {
  const map: Record<string, string> = {
    kaur: "/kaur/dashboard", kabag: "/kabag/dashboard",
    sdm: "/sdm/dashboard", direktur: "/direktur/dashboard",
    direksi: "/direksi/dashboard", admin: "/admin/dashboard",
  };
  return map[role] ?? "/dashboard";
}

/* ── Konfirmasi Modal ────────────────────────────────────────── */
function ConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal open onClose={onCancel} className="max-w-sm overflow-hidden">
        <div className="p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Konfirmasi</p>
          <h2 className="mt-1.5 text-base font-extrabold text-slate-900">Ajukan Cuti?</h2>
          <p className="mt-2 text-sm text-slate-500">
            Apakah Anda yakin ingin mengajukan cuti ini? Pengajuan akan dikirim ke atasan untuk diproses.
          </p>
        </div>
        <div className="flex gap-2.5 border-t border-slate-100 px-6 py-4">
          <button onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 active:scale-[0.98]">
            Batal
          </button>
          <button onClick={onConfirm}
            className="flex-1 rounded-xl bg-violet-700 py-2.5 text-sm font-bold text-white transition hover:bg-violet-800 active:scale-[0.98]">
            Ya, Ajukan
          </button>
        </div>
    </Modal>
  );
}

/* ── Success Toast ───────────────────────────────────────────── */
function SuccessToast({ message }: { message: string }) {
  return (
    <div className="fixed inset-x-0 top-6 z-50 flex justify-center pointer-events-none">
      <div className="inline-flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-3.5 shadow-lg">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-sm text-emerald-600">✓</span>
        <p className="text-sm font-semibold text-emerald-800">{message}</p>
      </div>
    </div>
  );
}

export default function AjukanCutiPage() {
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const role = (localStorage.getItem("internal_role") || localStorage.getItem("role") || "").toLowerCase();
    if (!CUTI_ALLOWED_ROLES.includes(role)) {
      setBlocked(true);
      setTimeout(() => router.replace(getRoleDashboard(role)), 1500);
    }
  }, [router]);

  const [jenis, setJenis]                       = useState<JenisCuti>("tahunan");
  const [tanggalMulai, setTanggalMulai]         = useState("");
  const [tanggalSelesai, setTanggalSelesai]     = useState("");
  const [tanggalKembali, setTanggalKembali]     = useState("");
  const [alasan, setAlasan]                     = useState("");
  const [tujuanCuti, setTujuanCuti]             = useState("");
  const [alamatSelamaCuti, setAlamatSelamaCuti] = useState("");
  const [noHpSelamaCuti, setNoHpSelamaCuti]     = useState("");
  const [penyerahanTugasKepada, setPenyerahanTugasKepada] = useState("");
  const [jabatanPengganti, setJabatanPengganti] = useState("");
  const [catatanPegawai, setCatatanPegawai]     = useState("");
  const [lampiran, setLampiran]                 = useState<File | null>(null);
  const [fileKey, setFileKey]                   = useState(0);
  const [fileSizeError, setFileSizeError]       = useState("");
  const [loading, setLoading]                   = useState(false);
  const [loadingData, setLoadingData]           = useState(true);
  const [fieldErrors, setFieldErrors]           = useState<Record<string, string>>({});
  const [sisaCuti, setSisaCuti]                 = useState<any>(null);
  const [pegawaiList, setPegawaiList]           = useState<any[]>([]);
  const [jenisKelamin, setJenisKelamin]         = useState("");
  const [showConfirm, setShowConfirm]           = useState(false);
  const [showSuccess, setShowSuccess]           = useState(false);
  const [showSuggestions, setShowSuggestions]   = useState(false);
  const [hidePenyerahanTugas, setHidePenyerahanTugas] = useState(false);
  const suggestRef                              = useRef<HTMLDivElement>(null);

  const JENIS_CUTI_OPTIONS = useMemo(() => filterJenisCuti(jenisKelamin), [jenisKelamin]);
  const urgentInfo    = useMemo(() => getUrgentInfo(tanggalMulai), [tanggalMulai]);
  const selectedJenis = JENIS_CUTI_OPTIONS.find((j) => j.value === jenis);

  const suggestions = useMemo(() => {
    const q = penyerahanTugasKepada.trim();
    if (!q) return [];
    return pegawaiList
      .filter((p) => p.nama?.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 8);
  }, [penyerahanTugasKepada, pegawaiList]);

  useEffect(() => {
    const role = (localStorage.getItem("internal_role") || localStorage.getItem("role") || "").toLowerCase();
    const jabatan = (localStorage.getItem("jabatan") || "").toLowerCase();
    if (role === "sdm" || role === "admin" || role === "it" || role === "kaur" || role === "kabag" || role === "direktur" || jabatan.includes("dokter")) {
      setHidePenyerahanTugas(true);
    }

    const jk = getJenisKelamin();
    setJenisKelamin(jk);
    if (jk === "L" && (jenis === "haid" || jenis === "melahirkan")) setJenis("tahunan");

    const token = localStorage.getItem("token");
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    const nip = getIdentifier();
    const unit = getUserUnit();
    const params = new URLSearchParams();
    if (unit) params.set("unit", unit);
    if (nip)  params.set("excludeNip", nip);

    const pegawaiFetch = fetch(`${API_BASE_URL}/pegawai/list?${params}`, { headers })
      .then((r) => r.json())
      .then((d) => {
        const items = d?.data?.items || [];
        setPegawaiList(Array.isArray(items) ? items : []);
      })
      .catch(() => {});

    const sisaFetch = nip
      ? fetch(`${API_BASE_URL}/cuti/sisa-cuti/${nip}`, { headers })
          .then((r) => r.json())
          .then((d) => setSisaCuti(d?.data?.kuota || null))
          .catch(() => {})
      : Promise.resolve();

    Promise.all([pegawaiFetch, sisaFetch]).finally(() => setLoadingData(false));
  }, []);

  function clearError(field: string) {
    setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!tanggalMulai)                                              errs.tanggalMulai   = "Tanggal mulai wajib diisi.";
    if (!tanggalSelesai)                                            errs.tanggalSelesai = "Tanggal selesai wajib diisi.";
    else if (tanggalMulai && tanggalSelesai < tanggalMulai)        errs.tanggalSelesai = "Tidak boleh sebelum tanggal mulai.";
    if (tanggalKembali && tanggalSelesai && tanggalKembali < tanggalSelesai)
                                                                    errs.tanggalKembali = "Tidak boleh sebelum tanggal selesai cuti.";
    if (!alasan.trim())                                             errs.alasan         = "Alasan pengajuan wajib diisi.";
    if (!noHpSelamaCuti.trim()) {
      errs.noHp = "Nomor HP selama cuti wajib diisi.";
    } else {
      const digits = noHpSelamaCuti.replace(/\D/g, "").length;
      if (digits < 10)      errs.noHp = "Nomor HP minimal 10 digit.";
      else if (digits > 13) errs.noHp = "Nomor HP maksimal 13 digit.";
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const identifier = getIdentifier();
    if (!identifier) { setFieldErrors({ _global: "Data akun tidak ditemukan, silakan login ulang." }); return; }

    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});

    setShowConfirm(true);
  }

  async function doSubmit() {
    setShowConfirm(false);
    const identifier = getIdentifier();
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("nip", identifier);
      formData.append("jenis_cuti", jenis);
      formData.append("tanggal_mulai", tanggalMulai);
      formData.append("tanggal_selesai", tanggalSelesai);
      formData.append("alasan", alasan.trim());
      formData.append("tujuan_cuti", tujuanCuti);
      formData.append("alamat_selama_cuti", alamatSelamaCuti);
      formData.append("no_hp_selama_cuti", noHpSelamaCuti);
      formData.append("tanggal_kembali", tanggalKembali);
      formData.append("penyerahan_tugas_kepada", penyerahanTugasKepada);
      formData.append("jabatan_pengganti", jabatanPengganti);
      formData.append("catatan_pegawai", catatanPegawai);
      if (lampiran) formData.append("lampiran", lampiran);

      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/cuti`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Gagal mengajukan cuti.");

      setShowSuccess(true);
      setJenis("tahunan"); setTanggalMulai(""); setTanggalSelesai(""); setTanggalKembali("");
      setAlasan(""); setTujuanCuti(""); setAlamatSelamaCuti(""); setNoHpSelamaCuti("");
      setPenyerahanTugasKepada(""); setJabatanPengganti(""); setCatatanPegawai("");
      setLampiran(null); setFileKey((k) => k + 1);

      setTimeout(() => { setShowSuccess(false); router.push("/riwayat"); }, 2500);
    } catch (err: any) {
      setFieldErrors({ _global: err.message || "Terjadi kesalahan saat mengajukan cuti." });
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (file && file.size > MAX_FILE_MB * 1024 * 1024) {
      setFileSizeError(`File "${file.name}" melebihi batas maksimal ${MAX_FILE_MB}MB.`);
      setLampiran(null);
      setFileKey((k) => k + 1);
      return;
    }
    setFileSizeError("");
    setLampiran(file);
  }

  if (blocked) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-8 py-6 text-center shadow">
        <p className="text-sm font-semibold text-amber-800">Anda tidak memiliki akses ke halaman ini</p>
        <p className="mt-1 text-xs text-amber-600">Mengalihkan ke dashboard...</p>
      </div>
    </div>
  );

  if (loadingData) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .cuti-wrap, .cuti-wrap * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .cuti-wrap { -webkit-font-smoothing: antialiased; }
      `}</style>
      <main className="cuti-wrap min-h-screen bg-transparent">
        <div className="mx-auto max-w-5xl space-y-5 px-3 py-4 sm:px-6 sm:py-8">
          <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-7 shadow-sm">
            <Skeleton className="h-3 w-24 mb-3 rounded-full" />
            <Skeleton className="h-7 w-52 mb-2" />
            <Skeleton className="h-4 w-80 mb-1" />
            <Skeleton className="h-4 w-48 mt-3" />
          </section>
          <section className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
            <Skeleton className="h-3 w-36 mb-4 rounded-full" />
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
            </div>
          </section>
          <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-7 shadow-sm">
            <Skeleton className="h-3 w-20 mb-2 rounded-full" />
            <Skeleton className="h-6 w-48 mb-6" />
            <div className="grid gap-5 md:grid-cols-2">
              {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14" />)}
            </div>
            <Skeleton className="h-24 mt-5" />
            <Skeleton className="h-24 mt-5" />
            <div className="flex justify-end mt-6 gap-3">
              <Skeleton className="h-11 w-24" />
              <Skeleton className="h-11 w-32" />
            </div>
          </section>
        </div>
      </main>
    </>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .cuti-wrap, .cuti-wrap * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .cuti-wrap { -webkit-font-smoothing: antialiased; }
      `}</style>

      {showSuccess && <SuccessToast message="Pengajuan cuti berhasil diajukan!" />}
      {showConfirm && <ConfirmModal onConfirm={doSubmit} onCancel={() => setShowConfirm(false)} />}

      <main className="cuti-wrap min-h-screen bg-transparent">
        <div className="mx-auto max-w-5xl space-y-5 px-3 py-4 sm:px-6 sm:py-8">

          {/* Header */}
          <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-7 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Form Pengajuan</p>
            <h1 className="mt-1.5 text-2xl font-extrabold text-slate-900 tracking-tight">Pengajuan Cuti</h1>
            <p className="mt-1.5 text-sm text-slate-400">Lengkapi formulir pengajuan cuti sesuai kebutuhan administrasi RSGM.</p>
            <p className="mt-3 text-xs text-slate-400">
              <span className="text-rose-500 font-bold">*</span> Wajib diisi &nbsp;·&nbsp; Tanpa tanda bintang = opsional
            </p>
          </section>

          {/* Sisa kuota */}
          {sisaCuti && (
            <section className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500 mb-3">Sisa Kuota Cuti Anda</p>
              <div className="grid grid-cols-3 gap-3 items-stretch">
                {JENIS_CUTI_OPTIONS.map((j) => {
                  const q = sisaCuti[j.value];
                  if (!q) return null;
                  return (
                    <div key={j.value} onClick={() => setJenis(j.value)}
                      className={`flex flex-col items-center justify-between rounded-2xl p-3 text-center cursor-pointer transition hover:-translate-y-0.5 border ${
                        jenis === j.value
                          ? "bg-violet-50 border-violet-300 ring-2 ring-violet-100"
                          : "bg-slate-50 border-slate-100 hover:border-violet-200"
                      }`}>
                      <p className={`text-[10px] font-bold leading-tight ${jenis === j.value ? "text-violet-600" : "text-slate-500"}`}>{j.label}</p>
                      <p className={`text-2xl font-extrabold my-1 ${q.sisa === 0 ? "text-rose-600" : "text-violet-700"}`}>{q.sisa}</p>
                      <p className="text-[10px] text-slate-400">dari {q.jatah} hari</p>
                    </div>
                  );
                })}
              </div>
              {jenisKelamin === "L" && (
                <p className="mt-3 text-[11px] text-slate-400">
                  * Cuti Haid dan Cuti Melahirkan tidak ditampilkan karena tidak berlaku untuk pegawai laki-laki.
                </p>
              )}
            </section>
          )}

          {/* Global error */}
          {fieldErrors._global && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
              {fieldErrors._global}
            </div>
          )}

          {/* Form */}
          <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-7 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Data Cuti</p>
                <h2 className="mt-1 text-lg font-extrabold text-slate-900">Informasi Pengajuan</h2>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <FormSelect
                  label="Jenis Cuti" value={jenis}
                  onChange={(v) => setJenis(v as JenisCuti)}
                  options={JENIS_CUTI_OPTIONS.map((j) => ({ label: j.label, value: j.value }))}
                  required
                />
                {/* Tujuan Cuti — maxLength 30 + counter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Tujuan Cuti</label>
                  <input
                    type="text" value={tujuanCuti} maxLength={30}
                    onChange={(e) => setTujuanCuti(e.target.value)}
                    placeholder="Contoh: Mudik keluarga"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                  <p className="text-right text-[11px] text-slate-400">{tujuanCuti.length}/30</p>
                </div>
                <FormInput
                  type="date" label="Tanggal Mulai" value={tanggalMulai}
                  onChange={(v) => { setTanggalMulai(v); clearError("tanggalMulai"); }}
                  required error={fieldErrors.tanggalMulai}
                />
                <FormInput
                  type="date" label="Tanggal Selesai" value={tanggalSelesai}
                  onChange={(v) => { setTanggalSelesai(v); clearError("tanggalSelesai"); }}
                  required error={fieldErrors.tanggalSelesai}
                />
                <FormInput
                  type="date" label="Tanggal Kembali Bekerja" value={tanggalKembali}
                  onChange={(v) => { setTanggalKembali(v); clearError("tanggalKembali"); }}
                  error={fieldErrors.tanggalKembali}
                />
                <FormInput
                  label="No. HP Selama Cuti" value={noHpSelamaCuti}
                  onChange={(v) => { setNoHpSelamaCuti(v); clearError("noHp"); }}
                  placeholder="08xxxxxxxxxx"
                  required
                  error={fieldErrors.noHp}
                  maxLength={15}
                />
              </div>

              {urgentInfo?.isUrgent && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  ⚠ Pengajuan mendesak — tanggal mulai kurang dari {urgentInfo.diffDays} hari lagi.
                </div>
              )}

              {selectedJenis && (
                <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${selectedJenis.motongTahunan ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                  {selectedJenis.motongTahunan
                    ? `⚠ Cuti ini memotong kuota cuti tahunan Anda. Kuota: ${selectedJenis.kuota}.`
                    : `✓ Cuti ini TIDAK memotong cuti tahunan. Kuota tersendiri: ${selectedJenis.kuota}.`}
                </div>
              )}

              <FormTextarea
                label="Alamat Selama Cuti" value={alamatSelamaCuti}
                onChange={setAlamatSelamaCuti} placeholder="Alamat lengkap selama cuti"
              />
              <FormTextarea
                label="Alasan Pengajuan" value={alasan}
                onChange={(v) => { setAlasan(v); clearError("alasan"); }}
                placeholder="Tuliskan alasan pengajuan cuti"
                required error={fieldErrors.alasan}
              />

              {/* Penyerahan Tugas — autocomplete */}
              {!hidePenyerahanTugas && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Penyerahan Tugas</p>
                  <p className="text-xs text-slate-400 mt-1">Opsional — isi jika ada pegawai pengganti selama cuti.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Penyerahan Tugas Kepada
                    </label>
                    <div className="relative" ref={suggestRef}>
                      <input
                        type="text"
                        value={penyerahanTugasKepada}
                        onChange={(e) => {
                          setPenyerahanTugasKepada(e.target.value);
                          if (!e.target.value) setJabatanPengganti("");
                          setShowSuggestions(true);
                        }}
                        onFocus={() => penyerahanTugasKepada.length >= 1 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        placeholder="Ketik nama pegawai pengganti..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      />
                      {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                          {suggestions.map((p) => (
                            <div
                              key={p.id}
                              onMouseDown={() => {
                                setPenyerahanTugasKepada(p.nama);
                                setJabatanPengganti(p.jabatan || "");
                                setShowSuggestions(false);
                              }}
                              className="cursor-pointer px-4 py-2.5 transition hover:bg-violet-50"
                            >
                              <p className="text-sm font-semibold text-slate-800">{p.nama}</p>
                              {p.jabatan && <p className="text-xs text-slate-400">{p.jabatan}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <FormInput
                    label="Jabatan Pengganti" value={jabatanPengganti}
                    onChange={setJabatanPengganti} placeholder="Otomatis terisi atau isi manual"
                  />
                </div>
              </div>
              )}

              {!hidePenyerahanTugas && (
              <FormTextarea
                label="Catatan Pegawai" value={catatanPegawai}
                onChange={setCatatanPegawai} placeholder="Catatan tambahan jika ada"
              />
              )}

              {/* Lampiran */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-3">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Lampiran Pendukung</label>
                {!lampiran && (
                  <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-violet-600 bg-transparent px-4 py-2.5 text-sm font-semibold text-violet-600 transition hover:bg-violet-50">
                    Pilih File
                    <input
                      key={fileKey}
                      type="file" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
                <p className="text-xs text-slate-400">Format: PDF, JPG, PNG. Maksimal {MAX_FILE_MB}MB. (Opsional)</p>
                {fileSizeError && (
                  <p className="text-[11px] font-semibold text-rose-600">{fileSizeError}</p>
                )}
                {lampiran && (
                  <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5">
                    <span className="flex-1 text-xs font-semibold text-violet-700 truncate">✓ {lampiran.name}</span>
                    <button
                      type="button"
                      onClick={() => { setLampiran(null); setFileKey((k) => k + 1); setFileSizeError(""); }}
                      className="flex-shrink-0 rounded-lg p-0.5 text-rose-500 transition hover:bg-rose-100 hover:text-rose-700"
                      title="Hapus file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => router.push("/dashboard")}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-95">
                  Batal
                </button>
                <button type="submit" disabled={loading}
                  className="rounded-xl bg-violet-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 active:scale-95 disabled:opacity-60">
                  {loading ? "Mengirim..." : "Ajukan Cuti"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}

/* ── Shared form components ─────────────────────────────────── */

function FormInput({ label, value, onChange, placeholder, type = "text", disabled = false, required = false, error, maxLength }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; disabled?: boolean; required?: boolean; error?: string; maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}{required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      <input
        type={type} value={value} disabled={disabled} maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
          error
            ? "border-rose-400 focus:border-rose-400 focus:ring-rose-100"
            : "border-slate-200 focus:border-violet-400 focus:ring-violet-100"
        }`}
      />
      {error && <p className="text-[11px] font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

function FormSelect({ label, value, onChange, options, required = false, error }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[]; required?: boolean; error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}{required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:ring-4 cursor-pointer ${
          error
            ? "border-rose-400 focus:border-rose-400 focus:ring-rose-100"
            : "border-slate-200 focus:border-violet-400 focus:ring-violet-100"
        }`}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-[11px] font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

function FormTextarea({ label, value, onChange, placeholder, required = false, error }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}{required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      <textarea
        value={value} onChange={(e) => onChange(e.target.value)} rows={4} placeholder={placeholder}
        className={`w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:ring-4 ${
          error
            ? "border-rose-400 focus:border-rose-400 focus:ring-rose-100"
            : "border-slate-200 focus:border-violet-400 focus:ring-violet-100"
        }`}
      />
      {error && <p className="text-[11px] font-semibold text-rose-600">{error}</p>}
    </div>
  );
}
