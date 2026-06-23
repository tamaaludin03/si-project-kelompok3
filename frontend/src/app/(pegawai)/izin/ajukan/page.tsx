"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
const MAX_FILE_MB = 5;

type JenisIzin = "terlambat" | "tidak_masuk" | "tidak_apel" | "pulang_awal" | "keluar_jam_kerja";

const JENIS_IZIN_OPTIONS: {
  value: JenisIzin; label: string; description: string; needJamMulai: boolean;
}[] = [
  { value: "terlambat",        label: "Izin datang terlambat",        description: "Digunakan saat pegawai datang melewati jam masuk kerja.",                                                                  needJamMulai: true  },
  { value: "pulang_awal",      label: "Izin pulang sebelum waktunya", description: "Digunakan saat pegawai perlu pulang sebelum jam kerja selesai.",                                                          needJamMulai: true  },
  { value: "tidak_masuk",      label: "Izin tidak masuk kerja",       description: "Digunakan saat pegawai tidak dapat hadir pada hari kerja. ⚠ Izin ini akan MEMOTONG kuota cuti tahunan Anda sebesar 1 hari.", needJamMulai: false },
  { value: "tidak_apel",       label: "Izin tidak mengikuti apel",    description: "Digunakan saat pegawai hadir kerja namun tidak dapat mengikuti apel.",                                                    needJamMulai: false },
  { value: "keluar_jam_kerja", label: "Izin keluar di jam kerja",     description: "Digunakan saat pegawai perlu keluar sementara pada jam kerja.",                                                            needJamMulai: true  },
];

function getIdentifier() {
  return localStorage.getItem("nip") || localStorage.getItem("username") || "";
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_32px_80px_rgba(0,0,0,0.14)]">
        <div className="p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Konfirmasi</p>
          <h2 className="mt-1.5 text-base font-extrabold text-slate-900">Ajukan Izin?</h2>
          <p className="mt-2 text-sm text-slate-500">
            Apakah Anda yakin ingin mengajukan izin ini? Pengajuan akan dikirim ke atasan untuk diproses.
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
      </div>
    </div>
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

export default function AjukanIzinPage() {
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const IZIN_ALLOWED_ROLES = ["pegawai", "kaur", "kabag", "sdm", "admin", "it", "direktur"];
    const role = (localStorage.getItem("internal_role") || localStorage.getItem("role") || "").toLowerCase();
    if (!IZIN_ALLOWED_ROLES.includes(role)) {
      setBlocked(true);
      setTimeout(() => router.replace(getRoleDashboard(role)), 1500);
    }
    setMounted(true);
  }, [router]);

  const [jenis, setJenis]             = useState<JenisIzin>("terlambat");
  const [tanggal, setTanggal]         = useState("");
  const [jamMulai, setJamMulai]       = useState("");
  const [alasan, setAlasan]           = useState("");
  const [lampiran, setLampiran]       = useState<File | null>(null);
  const [fileKey, setFileKey]         = useState(0);
  const [fileSizeError, setFileSizeError] = useState("");
  const [loading, setLoading]         = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedJenis = useMemo(() => JENIS_IZIN_OPTIONS.find((i) => i.value === jenis), [jenis]);
  const needJamMulai  = selectedJenis?.needJamMulai ?? false;
  const isSick        = jenis === "tidak_masuk" && alasan.toLowerCase().includes("sakit");
  const jamLabel      = jenis === "terlambat" ? "Jam Datang" : "Jam Mulai";

  function clearError(field: string) {
    setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!tanggal)                    errs.tanggal  = "Tanggal izin wajib diisi.";
    if (needJamMulai && !jamMulai)   errs.jamMulai = `${jamLabel} wajib diisi untuk jenis izin ini.`;
    if (!alasan.trim())              errs.alasan   = "Alasan pengajuan wajib diisi.";
    // Lampiran untuk izin sakit kini OPSIONAL — tidak ada validasi wajib.
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
      formData.append("jenis_izin", jenis);
      formData.append("tanggal", tanggal);
      formData.append("alasan", alasan.trim());
      if (jamMulai)  formData.append("jam_mulai", jamMulai);
      if (lampiran)  formData.append("lampiran", lampiran);

      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/izin`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Gagal mengajukan izin.");

      setShowSuccess(true);
      setTanggal(""); setJamMulai(""); setAlasan(""); setJenis("terlambat");
      setLampiran(null); setFileKey((k) => k + 1);

      setTimeout(() => { setShowSuccess(false); router.push("/riwayat"); }, 2500);
    } catch (err: any) {
      setFieldErrors({ _global: err.message || "Terjadi kesalahan saat mengajukan izin." });
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
    clearError("lampiran");
  }

  if (blocked) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-8 py-6 text-center shadow">
        <p className="text-sm font-semibold text-amber-800">Anda tidak memiliki akses ke halaman ini</p>
        <p className="mt-1 text-xs text-amber-600">Mengalihkan ke dashboard...</p>
      </div>
    </div>
  );

  if (!mounted) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .izin-wrap, .izin-wrap * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .izin-wrap { -webkit-font-smoothing: antialiased; }
      `}</style>
      <main className="izin-wrap min-h-screen bg-transparent">
        <div className="mx-auto max-w-4xl space-y-5 px-3 py-4 sm:px-6 sm:py-8">
          <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-7 shadow-sm">
            <Skeleton className="h-3 w-24 mb-3 rounded-full" />
            <Skeleton className="h-7 w-44 mb-2" />
            <Skeleton className="h-4 w-72 mb-1" />
            <Skeleton className="h-4 w-40 mt-3" />
          </section>
          <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-7 shadow-sm">
            <Skeleton className="h-3 w-20 mb-2 rounded-full" />
            <Skeleton className="h-6 w-48 mb-6" />
            <Skeleton className="h-14 mb-5" />
            <Skeleton className="h-10 mb-5 rounded-xl" />
            <Skeleton className="h-14 mb-5" />
            <Skeleton className="h-24 mb-5" />
            <Skeleton className="h-20 mb-5 rounded-2xl" />
            <div className="flex justify-end gap-3 mt-2">
              <Skeleton className="h-11 w-24" />
              <Skeleton className="h-11 w-28" />
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
        .izin-wrap, .izin-wrap * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .izin-wrap { -webkit-font-smoothing: antialiased; }
      `}</style>

      {showSuccess && <SuccessToast message="Pengajuan izin berhasil diajukan!" />}
      {showConfirm && <ConfirmModal onConfirm={doSubmit} onCancel={() => setShowConfirm(false)} />}

      <main className="izin-wrap min-h-screen bg-transparent">
        <div className="mx-auto max-w-4xl space-y-5 px-3 py-4 sm:px-6 sm:py-8">

          {/* Header */}
          <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-7 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Form Pengajuan</p>
            <h1 className="mt-1.5 text-2xl font-extrabold text-slate-900 tracking-tight">Pengajuan Izin</h1>
            <p className="mt-1.5 text-sm text-slate-400">Lengkapi formulir izin pegawai sesuai kebutuhan administrasi RSGM.</p>
            <p className="mt-3 text-xs text-slate-400">
              <span className="text-rose-500 font-bold">*</span> Wajib diisi &nbsp;·&nbsp; Tanpa tanda bintang = opsional
            </p>
          </section>

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
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Data Izin</p>
                <h2 className="mt-1 text-lg font-extrabold text-slate-900">Informasi Pengajuan</h2>
              </div>

              <FormSelect
                label="Jenis Izin" value={jenis} required
                onChange={(v) => { setJenis(v as JenisIzin); setJamMulai(""); clearError("jamMulai"); }}
                options={JENIS_IZIN_OPTIONS.map((i) => ({ label: i.label, value: i.value }))}
              />

              {selectedJenis && (
                <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                  {selectedJenis.description}
                </div>
              )}

              <div className={`grid gap-5 ${needJamMulai ? "md:grid-cols-2" : ""}`}>
                <FormInput
                  type="date" label="Tanggal" value={tanggal} required
                  onChange={(v) => { setTanggal(v); clearError("tanggal"); }}
                  error={fieldErrors.tanggal}
                />
                {needJamMulai && (
                  <FormInput
                    type="time" label={jamLabel} value={jamMulai} required
                    onChange={(v) => { setJamMulai(v); clearError("jamMulai"); }}
                    error={fieldErrors.jamMulai}
                    hint="Format 24 jam. Isi jam awal kejadian/izin."
                  />
                )}
              </div>

              <FormTextarea
                label="Alasan Pengajuan" value={alasan} required
                onChange={(v) => { setAlasan(v); clearError("alasan"); clearError("lampiran"); }}
                placeholder="Tuliskan alasan izin"
                error={fieldErrors.alasan}
              />

              {/* Lampiran */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Lampiran Pendukung
                    {isSick && <span className="ml-1 text-[10px] font-semibold normal-case text-slate-400">(opsional)</span>}
                  </label>
                  {isSick && (
                    lampiran ? (
                      <p className="mt-0.5 text-[11px] font-semibold text-emerald-600">
                        Surat terlampir. Izin ini tidak memotong jatah cuti.
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[11px] font-semibold text-amber-600">
                        Belum melampirkan surat. Izin ini akan memotong jatah cuti.
                      </p>
                    )
                  )}
                </div>
                {!lampiran && (
                  <label className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border bg-transparent px-4 py-2.5 text-sm font-semibold transition hover:bg-violet-50 ${
                    fieldErrors.lampiran ? "border-rose-400 text-rose-500" : "border-violet-600 text-violet-600"
                  }`}>
                    Pilih File
                    <input
                      key={fileKey}
                      type="file" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
                <p className="text-xs text-slate-400">Format: PDF, JPG, PNG. Maksimal {MAX_FILE_MB}MB.</p>
                {fileSizeError && (
                  <p className="text-[11px] font-semibold text-rose-600">{fileSizeError}</p>
                )}
                {fieldErrors.lampiran && (
                  <p className="text-[11px] font-semibold text-rose-600">{fieldErrors.lampiran}</p>
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
                  {loading ? "Mengirim..." : "Ajukan Izin"}
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

function FormInput({ label, value, onChange, placeholder, type = "text", disabled = false, required = false, error, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; disabled?: boolean; required?: boolean; error?: string; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}{required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      <input
        type={type} value={value} disabled={disabled}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
          error
            ? "border-rose-400 focus:border-rose-400 focus:ring-rose-100"
            : "border-slate-200 focus:border-violet-400 focus:ring-violet-100"
        }`}
      />
      {error && <p className="text-[11px] font-semibold text-rose-600">{error}</p>}
      {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
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
