"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";

type ProfileType = {
  id?: number;
  username?: string;
  nip?: string;
  nama?: string;
  jabatan?: string;
  jenis_pegawai?: string | null;
  role?: string;
  internal_role?: string | null;
  email?: string | null;
  no_hp?: string | null;
  is_nakes?: boolean;
  nomor_str?: string | null;
  str_seumur_hidup?: boolean;
  nomor_sip?: string | null;
  tanggal_terbit_sip?: string | null;
  expired_sip?: string | null;
  status_str?: string;
  status_sip?: string;
  ttd_digital?: string | null;
};

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "expired":        return "Sudah Kedaluwarsa";
    case "kurang_1_bulan": return "< 1 Bulan";
    case "kurang_3_bulan": return "< 3 Bulan";
    case "kurang_6_bulan": return "< 6 Bulan";
    case "kurang_1_tahun": return "< 1 Tahun";
    case "aman":           return "Aman";
    default:               return "Belum Diisi";
  }
}

function getStatusClass(status?: string) {
  switch (status) {
    case "expired":        return "border-rose-200 bg-rose-50 text-rose-700";
    case "kurang_1_bulan": return "border-orange-200 bg-orange-50 text-orange-700";
    case "kurang_3_bulan":
    case "kurang_6_bulan":
    case "kurang_1_tahun": return "border-amber-200 bg-amber-50 text-amber-700";
    case "aman":           return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:               return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

// Ambil identifier: nip atau fallback ke username
function getIdentifier() {
  return localStorage.getItem("nip") || localStorage.getItem("username") || "";
}

export default function ProfilPage() {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // TTD digital state
  const [ttdFile, setTtdFile] = useState<File | null>(null);
  const [ttdPreview, setTtdPreview] = useState<string | null>(null);
  const [ttdSaving, setTtdSaving] = useState(false);
  const [ttdMessage, setTtdMessage] = useState("");
  const [ttdError, setTtdError] = useState("");

  const [form, setForm] = useState({
    email: "",
    noHp: "",
    isNakes: false,
    nomorSTR: "",
    strSeumurHidup: false,
    nomorSIP: "",
    tanggalTerbitSIP: "",
    expiredSIP: "",
  });

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const identifier = getIdentifier();

      if (!identifier) {
        setError("Data akun tidak ditemukan. Silakan login ulang.");
        return;
      }

      const token = localStorage.getItem("token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const profileRes = await fetch(`${API_BASE_URL}/pegawai/me/${identifier}`, { headers });

      if (!profileRes.ok) throw new Error("Gagal memuat profil pegawai.");

      const profileData = await profileRes.json();
      const p = profileData.data || profileData || {};

      setProfile(p);
      setForm({
        email: p.email ?? "",
        noHp: p.no_hp ?? "",
        isNakes: Boolean(p.is_nakes),
        nomorSTR: p.nomor_str ?? "",
        strSeumurHidup: Boolean(p.str_seumur_hidup),
        nomorSIP: p.nomor_sip ?? "",
        tanggalTerbitSIP: toDateInput(p.tanggal_terbit_sip),
        expiredSIP: toDateInput(p.expired_sip),
      });
    } catch (err: any) {
      setError(err.message || "Gagal memuat profil.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProfile(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const identifier = profile?.nip || profile?.username || getIdentifier();
    if (!identifier) { setError("Identitas akun tidak ditemukan."); return; }

    if (form.isNakes && (!form.nomorSTR.trim())) {
      setError("Pegawai nakes wajib mengisi nomor STR.");
      return;
    }
    if (form.isNakes && (!form.nomorSIP.trim() || !form.expiredSIP)) {
      setError("Pegawai nakes wajib mengisi nomor SIP dan masa berlaku SIP.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const token = localStorage.getItem("token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(`${API_BASE_URL}/pegawai/me/${identifier}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          email: form.email || null,
          no_hp: form.noHp || null,
          is_nakes: form.isNakes,
          nomor_str: form.nomorSTR || null,
          str_seumur_hidup: form.strSeumurHidup,
          nomor_sip: form.nomorSIP || null,
          tanggal_terbit_sip: form.tanggalTerbitSIP || null,
          expired_sip: form.expiredSIP || null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Gagal menyimpan profil.");

      setProfile(data?.data || null);
      setMessage(data?.message || "Profil berhasil disimpan.");
      setIsEditing(false);
      await loadProfile();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  }

  function handleTtdFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setTtdFile(file);
    setTtdMessage("");
    setTtdError("");
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setTtdPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setTtdPreview(null);
    }
  }

  async function handleUploadTTD() {
    if (!ttdFile) { setTtdError("Pilih file tanda tangan terlebih dahulu."); return; }
    const identifier = profile?.nip || profile?.username || getIdentifier();
    if (!identifier) { setTtdError("Identitas akun tidak ditemukan."); return; }

    try {
      setTtdSaving(true);
      setTtdMessage("");
      setTtdError("");
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", ttdFile);
      const res = await fetch(`${API_BASE_URL}/pegawai/upload-signature/${identifier}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Gagal mengupload tanda tangan.");
      setTtdMessage("Tanda tangan digital berhasil disimpan.");
      setTtdFile(null);
      await loadProfile();
    } catch (err: any) {
      setTtdError(err.message || "Gagal menyimpan tanda tangan.");
    } finally {
      setTtdSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');.profil-wrap,.profil-wrap *{font-family:'Plus Jakarta Sans',sans-serif!important}`}</style>
        <main className="profil-wrap min-h-screen bg-transparent p-3 sm:p-6 md:p-8">
          <div className="mx-auto max-w-6xl space-y-5">
            <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-7 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24 rounded-full" />
                  <Skeleton className="h-7 w-56" />
                  <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-10 w-24 self-start" />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14" />)}
              </div>
              <Skeleton className="h-16 mt-6 rounded-2xl" />
            </section>
            <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-7 shadow-sm">
              <Skeleton className="h-3 w-20 mb-2 rounded-full" />
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-80 mb-6" />
              <div className="flex flex-col gap-6 md:flex-row">
                <Skeleton className="flex-1 min-h-[14rem] rounded-2xl" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-36 rounded-2xl" />
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-10 w-44" />
                </div>
              </div>
            </section>
          </div>
        </main>
      </>
    );
  }


  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .profil-wrap, .profil-wrap * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .profil-wrap { -webkit-font-smoothing: antialiased; }
      `}</style>

      <main className="profil-wrap min-h-screen bg-transparent p-6 md:p-8">
        <div className="mx-auto max-w-6xl space-y-5">

          {message && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* ── HEADER ── */}
          <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-7 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Profil Pegawai</p>
                <h1 className="mt-1.5 text-2xl font-extrabold text-slate-900 tracking-tight">Informasi Akun Pegawai</h1>
                <p className="mt-1.5 text-sm text-slate-400">Kelola data profil, status nakes, dan masa berlaku STR/SIP.</p>
              </div>

              <button
                type="button"
                onClick={() => { setIsEditing(!isEditing); setMessage(""); setError(""); }}
                className={`self-start rounded-xl border px-5 py-2.5 text-sm font-bold transition active:scale-95 ${
                  isEditing
                    ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                }`}
              >
                {isEditing ? "Batal Edit" : "Edit Profil"}
              </button>
            </div>

            <form onSubmit={handleSave}>
              {/* Info dasar */}
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <InputField label="Nama Lengkap" value={profile?.nama || ""} disabled />
                <InputField label="NIP" value={profile?.nip || "Tidak ada NIP"} disabled />
                <InputField label="Jabatan" value={profile?.jabatan || ""} disabled />
                <InputField label="Role" value={profile?.role || ""} disabled />
                <InputField
                  label="Email"
                  value={form.email}
                  disabled={!isEditing}
                  onChange={(v) => setForm({ ...form, email: v })}
                />
                <InputField
                  label="No. HP"
                  value={form.noHp}
                  disabled={!isEditing}
                  onChange={(v) => setForm({ ...form, noHp: v })}
                />
              </div>

              {/* Status Nakes */}
              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Status Tenaga Kesehatan</p>
                    <p className="mt-0.5 text-xs text-slate-400">Aktifkan jika pegawai wajib memiliki STR/SIP.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!isEditing}
                    onClick={() => setForm((prev) => ({ ...prev, isNakes: !prev.isNakes }))}
                    className={`rounded-full px-5 py-2 text-sm font-bold transition active:scale-95 disabled:opacity-60 ${
                      form.isNakes
                        ? "bg-violet-100 text-violet-700 hover:bg-violet-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {form.isNakes ? "Nakes ✓" : "Non-Nakes"}
                  </button>
                </div>
              </div>

              {/* STR/SIP */}
              {form.isNakes && (
                <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/40 p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Dokumen Nakes</p>
                      <h2 className="mt-1 text-lg font-extrabold text-slate-900">Data STR dan SIP</h2>
                      <p className="mt-0.5 text-xs text-slate-400">Tersimpan ke database dan dapat dipantau oleh SDM.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge label="STR" status={profile?.status_str} />
                      <StatusBadge label="SIP" status={profile?.status_sip} />
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {/* STR — berlaku seumur hidup, cukup centang */}
                    <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Data STR</p>
                      <InputField label="Nomor STR" value={form.nomorSTR} disabled={!isEditing} onChange={(v) => setForm({ ...form, nomorSTR: v })} />
                      <div className="flex items-center gap-3">
                        <input
                          id="str-seumur-hidup"
                          type="checkbox"
                          checked={form.strSeumurHidup}
                          disabled={!isEditing}
                          onChange={(e) => setForm({ ...form, strSeumurHidup: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 disabled:cursor-not-allowed"
                        />
                        <label htmlFor="str-seumur-hidup" className="text-sm font-semibold text-slate-700 cursor-pointer">
                          STR berlaku seumur hidup
                        </label>
                      </div>
                      <p className="text-xs text-slate-400">STR (Surat Tanda Registrasi) berlaku seumur hidup — tidak perlu mengisi tanggal masa berlaku.</p>
                    </div>

                    {/* SIP — masih pakai tanggal */}
                    <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Data SIP</p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <InputField label="Nomor SIP" value={form.nomorSIP} disabled={!isEditing} onChange={(v) => setForm({ ...form, nomorSIP: v })} />
                        <InputField label="Tanggal Terbit SIP" type="date" value={form.tanggalTerbitSIP} disabled={!isEditing} onChange={(v) => setForm({ ...form, tanggalTerbitSIP: v })} />
                        <InputField label="Berlaku SIP Sampai" type="date" value={form.expiredSIP} disabled={!isEditing} onChange={(v) => setForm({ ...form, expiredSIP: v })} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-violet-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 active:scale-95 disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              )}
            </form>
          </section>

          {/* ── TANDA TANGAN DIGITAL ── */}
          <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-7 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Dokumen</p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-900">Tanda Tangan Digital</h2>
            <p className="mt-1 text-sm text-slate-400">
              Tanda tangan ini akan otomatis muncul di surat cuti dan izin yang Anda ajukan setelah disetujui.
            </p>

            {ttdMessage && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{ttdMessage}</div>
            )}
            {ttdError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{ttdError}</div>
            )}

            <div className="mt-5 flex flex-col gap-6 md:flex-row md:items-stretch">
              {/* Preview area */}
              <div className="flex flex-1 flex-col">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Preview Tanda Tangan</p>
                <div className="flex w-full flex-1 min-h-[14rem] items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden">
                  {ttdPreview ? (
                    <img src={ttdPreview} alt="Preview TTD" className="max-h-full max-w-full object-contain p-4" />
                  ) : profile?.ttd_digital ? (
                    <img
                      src={`${API_BASE_URL}${profile.ttd_digital}`}
                      alt="TTD Tersimpan"
                      className="max-h-full max-w-full object-contain p-4"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-center px-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-slate-300">
                          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-400">Belum ada tanda tangan</p>
                        <p className="mt-0.5 text-xs text-slate-300">Upload tanda tangan di form sebelah kanan</p>
                      </div>
                    </div>
                  )}
                </div>
                {profile?.ttd_digital && !ttdPreview && (
                  <p className="mt-2 text-xs font-semibold text-emerald-600">✓ Tanda tangan sudah tersimpan</p>
                )}
              </div>

              {/* Upload controls */}
              <div className="flex flex-1 flex-col gap-4">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Upload Tanda Tangan Baru</p>
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-5 transition hover:border-violet-400 hover:bg-violet-50">
                    <span className="text-2xl">📎</span>
                    <span className="text-sm font-semibold text-violet-700">
                      {ttdFile ? ttdFile.name : "Klik untuk pilih file"}
                    </span>
                    <span className="text-xs text-slate-400">Format PNG atau JPG, maksimal 2MB</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleTtdFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs text-violet-700 leading-relaxed">
                  <p className="font-bold mb-1">Tips mendapatkan TTD yang bagus:</p>
                  <ul className="space-y-0.5 list-disc list-inside">
                    <li>Tanda tangan di kertas putih bersih dengan tinta hitam/biru</li>
                    <li>Foto dari atas, pencahayaan cukup, tidak berbayang</li>
                    <li>Crop rapat hanya bagian tanda tangan</li>
                    <li>Simpan sebagai PNG (background putih/transparan)</li>
                  </ul>
                </div>

                <div className="mt-auto flex gap-3">
                  <button
                    type="button"
                    onClick={handleUploadTTD}
                    disabled={!ttdFile || ttdSaving}
                    className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {ttdSaving ? "Menyimpan..." : "Simpan Tanda Tangan"}
                  </button>
                  {ttdFile && (
                    <button
                      type="button"
                      onClick={() => { setTtdFile(null); setTtdPreview(null); setTtdError(""); }}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Cara kerja */}
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-700 mb-2">Cara kerja TTD digital di surat:</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-slate-500">
                <span>1. Upload tanda tangan di sini</span>
                <span>→</span>
                <span>2. Ajukan cuti/izin</span>
                <span>→</span>
                <span>3. Setelah disetujui, tanda tangan otomatis muncul di PDF</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function InputField({
  label, value, disabled, onChange, type = "text",
}: {
  label: string; value: string; disabled?: boolean;
  onChange?: (value: string) => void; type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
          disabled
            ? "border-slate-100 bg-slate-50 text-slate-500 cursor-default"
            : "border-slate-200 bg-white text-slate-800 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
        }`}
      />
    </div>
  );
}

function StatusBadge({ label, status }: { label: string; status?: string }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${getStatusClass(status)}`}>
      {label}: {getStatusLabel(status)}
    </span>
  );
}
