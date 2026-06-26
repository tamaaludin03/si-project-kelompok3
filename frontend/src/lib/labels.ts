// Helper label & format tampilan — bahasa Indonesia, tanpa underscore.

/** Ubah snake_case → "Title Case" (mis. "tidak_masuk" → "Tidak Masuk"). */
export function titleCase(value?: string | null): string {
  if (!value) return "-";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Alias untuk jenis cuti/izin & sejenisnya. */
export const formatJenis = titleCase;

const ROLE_LABELS: Record<string, string> = {
  pegawai: "Pegawai",
  admin: "Admin",
  it: "Admin",
  sdm: "SDM",
  kaur: "Kepala Unit",
  kabag: "Kepala Bagian",
  direktur: "Direktur",
  direktur_administrasi: "Direktur Administrasi",
  "direktur-administrasi": "Direktur Administrasi",
  kepala_administrasi: "Kepala Administrasi",
  "kepala-administrasi": "Kepala Administrasi",
  direksi: "Direktur Utama",
};

/** Label tampilan untuk role / internal_role (value tetap apa adanya). */
export function roleLabel(value?: string | null): string {
  if (!value || value === "-") return "-";
  const key = String(value).toLowerCase().trim();
  return ROLE_LABELS[key] || titleCase(key);
}
