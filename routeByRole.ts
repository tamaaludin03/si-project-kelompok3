export function getDashboardPathByRole(role?: string) {
  const normalized = (role || "").toLowerCase().trim();

  if (normalized.includes("direksi")) return "/direksi/dashboard";
  if (
    normalized.includes("kepala administrasi") ||
    normalized.includes("kepala-administrasi")
  ) {
    return "/kepala-administrasi/dashboard";
  }
  if (normalized.includes("admin")) return "/admin/dashboard";
  if (normalized.includes("sdm")) return "/sdm/dashboard";
  if (normalized.includes("kabag")) return "/kabag/dashboard";
  if (normalized.includes("kaur")) return "/kaur/dashboard";

  return "/pegawai/dashboard";
}