"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";

// ── Types ────────────────────────────────────────────────────────────────────

type LampiranItem = {
  id?: number;
  nama_file?: string | null;
  path_file?: string | null;
  tipe_file?: string | null;
  ukuran_file?: number | null;
};

type PegawaiType = {
  nama?: string;
  nip?: string;
  jabatan?: string;
  unit?: string;
};

type CutiItem = {
  id: number;
  jenis_cuti: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alasan?: string | null;
  status: string;
  created_at: string;
  is_urgent?: boolean;
  catatan_kaur?: string | null;
  catatan_kabag?: string | null;
  pegawai?: PegawaiType;
  lampiran?: LampiranItem[];
};

type IzinItem = {
  id: number;
  jenis_izin: string;
  tanggal: string;
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  alasan?: string | null;
  status: string;
  created_at: string;
  is_urgent?: boolean;
  catatan_kaur?: string | null;
  catatan_kabag?: string | null;
  pegawai?: PegawaiType;
  lampiran?: LampiranItem[];
};

type ApprovalRow = {
  id: number;
  kategori: "Cuti" | "Izin";
  nama: string;
  nip: string;
  unit: string;
  jabatan: string;
  jenis: string;
  periode: string;
  alasan: string;
  status: string;
  createdAt: string;
  isUrgent: boolean;
  catatanKaur?: string | null;
  catatanKabag?: string | null;
  lampiran: LampiranItem[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractItems(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function todayText() {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Bangun URL dari path_file — identik dengan SdmDashboard */
function getLampiranUrl(lampiran: LampiranItem): string {
  const rawPath = String(lampiran.path_file || "").replace(/\\/g, "/");
  if (!rawPath) return "";
  if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) return rawPath;
  const normalized = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  return `${API_BASE_URL}${normalized}`;
}

function getLampiran(item: any): LampiranItem[] {
  return (
    item.lampiran ||
    item.lampirans ||
    item.cutiLampiran ||
    item.izinLampiran ||
    item.cuti_lampiran ||
    item.izin_lampiran ||
    item.CutiLampiran ||
    item.IzinLampiran ||
    item.attachments ||
    item.files ||
    []
  );
}

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s.includes("tolak") || s.includes("reject")) return "border-red-200 bg-red-50 text-red-700";
  if (s.includes("setuju") || s.includes("approve") || s.includes("final")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

// ── StatCard ─────────────────────────────────────────────────────────────────

const STAT_STYLES = {
  violet:  { card: "border-violet-100 bg-violet-50/60",  num: "text-violet-800",  label: "text-violet-600"  },
  emerald: { card: "border-emerald-100 bg-emerald-50/60", num: "text-emerald-800", label: "text-emerald-600" },
  amber:   { card: "border-amber-100 bg-amber-50/60",    num: "text-amber-800",   label: "text-amber-600"   },
  indigo:  { card: "border-indigo-100 bg-indigo-50/60",  num: "text-indigo-800",  label: "text-indigo-600"  },
};

function StatCard({
  title,
  value,
  desc,
  onClick,
  variant = "violet",
}: {
  title: string;
  value: number;
  desc: string;
  onClick?: () => void;
  variant?: keyof typeof STAT_STYLES;
}) {
  const s = STAT_STYLES[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-3xl border ${s.card} p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]`}
    >
      <p className={`text-xs font-black uppercase tracking-[0.22em] ${s.label}`}>{title}</p>
      <h2 className={`mt-4 text-5xl font-black tracking-tight ${s.num}`}>
        {value.toString().padStart(2, "0")}
      </h2>
      <p className="mt-2 text-sm font-semibold text-slate-600">{desc}</p>
    </button>
  );
}

// ── AdminActionCard ───────────────────────────────────────────────────────────

const ACTION_STYLES = {
  violet:  { card: "border-violet-100 bg-white",  icon: "border-violet-200 bg-violet-50 text-violet-700",   arrow: "text-violet-500"  },
  emerald: { card: "border-emerald-100 bg-white", icon: "border-emerald-200 bg-emerald-50 text-emerald-700", arrow: "text-emerald-500" },
  amber:   { card: "border-amber-100 bg-white",   icon: "border-amber-200 bg-amber-50 text-amber-700",       arrow: "text-amber-500"  },
  indigo:  { card: "border-indigo-100 bg-white",  icon: "border-indigo-200 bg-indigo-50 text-indigo-700",    arrow: "text-indigo-500" },
};

function AdminActionCard({
  title,
  desc,
  href,
  color = "violet",
}: {
  title: string;
  desc: string;
  href: string;
  color?: keyof typeof ACTION_STYLES;
}) {
  const router = useRouter();
  const s = ACTION_STYLES[color];
  const iconText = title.split(" ").map((w) => w.charAt(0)).join("").slice(0, 2).toUpperCase();

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className={`group w-full rounded-3xl border ${s.card} p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border text-xs font-black shadow-sm ${s.icon}`}>
            {iconText}
          </div>
          <p className="text-base font-black tracking-tight text-slate-950">{title}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{desc}</p>
        </div>
        <span className={`mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 text-lg font-black shadow-sm transition duration-300 group-hover:translate-x-1 ${s.arrow}`}>
          →
        </span>
      </div>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function KepalaAdministrasiDashboard() {
  const router = useRouter();

  const [cutiPending, setCutiPending] = useState<CutiItem[]>([]);
  const [izinPending, setIzinPending] = useState<IzinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      try {
        const userObj = JSON.parse(localStorage.getItem("user") || "null") || {};
        setCurrentUser({
          ...userObj,
          nama:          userObj.nama          || localStorage.getItem("nama")          || "-",
          nip:           userObj.nip           || localStorage.getItem("nip")           || "-",
          jabatan:       userObj.jabatan       || localStorage.getItem("jabatan")       || "-",
          unit:          userObj.unit          || localStorage.getItem("unit")          || "-",
          role:          userObj.role          || localStorage.getItem("role")          || "-",
          internal_role: userObj.internal_role || localStorage.getItem("internal_role") || null,
        });
      } catch {
        setCurrentUser(null);
      }

      const token = localStorage.getItem("token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const [cutiRes, izinRes] = await Promise.all([
        fetch(`${API_BASE_URL}/cuti/kepala-administrasi/pending`, { headers, cache: "no-store" }),
        fetch(`${API_BASE_URL}/izin/kepala-administrasi/pending`, { headers, cache: "no-store" }),
      ]);

      const cutiJson = await cutiRes.json().catch(() => null);
      const izinJson = await izinRes.json().catch(() => null);

      if (cutiRes.ok) setCutiPending(extractItems(cutiJson));
      if (izinRes.ok) setIzinPending(extractItems(izinJson));

      if (!cutiRes.ok || !izinRes.ok) {
        setErrorMessage("Sebagian data gagal dimuat. Periksa endpoint approval final.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Gagal memuat dashboard Kepala Administrasi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const timer = window.setInterval(loadData, 300_000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo<ApprovalRow[]>(() => {
    const cutiRows: ApprovalRow[] = cutiPending.map((item) => ({
      id: item.id,
      kategori: "Cuti",
      nama: item.pegawai?.nama || "-",
      nip: item.pegawai?.nip || "-",
      unit: item.pegawai?.unit || "-",
      jabatan: item.pegawai?.jabatan || "-",
      jenis: item.jenis_cuti,
      periode: `${formatDate(item.tanggal_mulai)} - ${formatDate(item.tanggal_selesai)}`,
      alasan: item.alasan || "-",
      status: item.status || "pending_kepala_administrasi",
      createdAt: item.created_at,
      isUrgent: Boolean(item.is_urgent),
      catatanKaur: item.catatan_kaur,
      catatanKabag: item.catatan_kabag,
      lampiran: getLampiran(item),
    }));

    const izinRows: ApprovalRow[] = izinPending.map((item) => ({
      id: item.id,
      kategori: "Izin",
      nama: item.pegawai?.nama || "-",
      nip: item.pegawai?.nip || "-",
      unit: item.pegawai?.unit || "-",
      jabatan: item.pegawai?.jabatan || "-",
      jenis: item.jenis_izin,
      periode: `${formatDate(item.tanggal)}${item.jam_mulai || item.jam_selesai ? `, ${item.jam_mulai || "-"} - ${item.jam_selesai || "-"}` : ""}`,
      alasan: item.alasan || "-",
      status: item.status || "pending_kepala_administrasi",
      createdAt: item.created_at,
      isUrgent: Boolean(item.is_urgent),
      catatanKaur: item.catatan_kaur,
      catatanKabag: item.catatan_kabag,
      lampiran: getLampiran(item),
    }));

    return [...cutiRows, ...izinRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [cutiPending, izinPending]);

  const urgentRows = rows.filter((r) => r.isUrgent);
  const recentRows = rows.slice(0, 5);
  const initials = (currentUser?.nama || "K").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .jakarta { font-family: 'Plus Jakarta Sans', sans-serif !important; -webkit-font-smoothing: antialiased; }
      `}</style>

      <main className="jakarta min-h-screen bg-transparent px-3 py-4 sm:px-6 sm:py-6 text-slate-900">
        <section className="mx-auto max-w-7xl space-y-6">

          {/* ── Header ── */}
          <header className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">

            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-600 text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(109,40,217,0.3)]">
                    {initials}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                </div>
                {/* Info */}
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
                    Kepala Administrasi
                  </p>
                  <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                    Dashboard Approval Final
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                    Monitoring pengajuan cuti dan izin yang telah disetujui Kepala Urusan dan Kepala Bagian.
                    Kepala Administrasi bertugas memberikan keputusan final sebelum data diteruskan ke SDM.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      { label: "NIP",     value: currentUser?.nip     || "-" },
                      { label: "Jabatan", value: currentUser?.jabatan  || "-" },
                      { label: "Unit",    value: currentUser?.unit     || "-" },
                      { label: "Peran",   value: currentUser?.internal_role || currentUser?.role || "-" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</span>
                        <div className="h-2.5 w-px bg-slate-200" />
                        <span className="text-[11px] font-semibold text-slate-700">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3">
                {/* Bell notifikasi */}
                <a href="/kepala-administrasi/notifikasi" className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-violet-300 hover:text-violet-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {(cutiPending.length + izinPending.length) > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white">
                      {(cutiPending.length + izinPending.length) > 9 ? "9+" : cutiPending.length + izinPending.length}
                    </span>
                  )}
                </a>
                <div className="rounded-3xl border border-slate-100 bg-slate-50/60 px-6 py-5 text-right shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Hari ini</p>
                  <p className="mt-2 text-sm font-black text-slate-950">{todayText()}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {loading ? "Memuat data..." : "Data tersinkron"}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* ── Error banner ── */}
          {errorMessage && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800">
              {errorMessage}
            </div>
          )}

          {/* ── Stat cards ── */}
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Final Cuti"
              value={cutiPending.length}
              desc="Menunggu approval final"
              onClick={() => router.push("/kepala-administrasi/approval-final")}
              variant="violet"
            />
            <StatCard
              title="Final Izin"
              value={izinPending.length}
              desc="Menunggu approval final"
              onClick={() => router.push("/kepala-administrasi/approval-final")}
              variant="emerald"
            />
            <StatCard
              title="Dokumen Masuk"
              value={rows.length}
              desc="Total pengajuan final"
              onClick={() => router.push("/kepala-administrasi/dokumen-masuk")}
              variant="indigo"
            />
            <StatCard
              title="Mendesak"
              value={urgentRows.length}
              desc="Prioritas tinggi"
              onClick={() => router.push("/kepala-administrasi/approval-final")}
              variant="amber"
            />
          </section>

          {/* ── Action cards ── */}
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <AdminActionCard
              title="Approval Final"
              desc="Setujui atau tolak pengajuan"
              href="/kepala-administrasi/approval-final"
              color="violet"
            />
            <AdminActionCard
              title="Dokumen Masuk"
              desc="Lihat lampiran pengajuan"
              href="/kepala-administrasi/dokumen-masuk"
              color="indigo"
            />
            <AdminActionCard
              title="Riwayat Keputusan"
              desc="Lihat keputusan sebelumnya"
              href="/kepala-administrasi/riwayat-approval"
              color="amber"
            />
            <AdminActionCard
              title="Laporan"
              desc="Rekap cuti dan izin"
              href="/kepala-administrasi/laporan-cuti-izin"
              color="emerald"
            />
          </section>

          {/* ── Main panel ── */}
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">

            {/* Table — pending final */}
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">Menunggu Keputusan Final</h2>
                  <p className="mt-2 text-sm text-slate-600">Data berasal dari approval KAUR dan KABAG.</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/kepala-administrasi/approval-final")}
                  className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-100/80 to-emerald-100/70 px-4 py-2 text-sm font-black text-slate-900 transition hover:opacity-90"
                >
                  Lihat Semua
                </button>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white">
                {loading ? (
                  <div className="space-y-2 p-4">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-12" style={{ animationDelay: `${i * 40}ms` }} />
                    ))}
                  </div>
                ) : recentRows.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="font-black text-slate-900">Tidak ada pengajuan final</p>
                    <p className="mt-1 text-sm text-slate-500">Belum ada cuti atau izin yang menunggu keputusan final.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left">
                        {["Pegawai", "Pengajuan", "Periode", "Catatan", "Lampiran", "Aksi"].map((h) => (
                          <th key={h} className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentRows.map((item) => (
                        <tr key={`${item.kategori}-${item.id}`} className="transition-colors hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <p className="font-black text-slate-950">{item.nama}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{item.nip} • {item.unit}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-black ${item.kategori === "Cuti" ? "border-violet-200 bg-violet-50 text-violet-700" : "border-sky-200 bg-sky-50 text-sky-700"}`}>
                                {item.kategori}
                              </span>
                              {item.isUrgent && (
                                <span className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-black text-amber-700">
                                  ⚡ Mendesak
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{item.jenis}</p>
                          </td>
                          <td className="px-5 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">{item.periode}</td>
                          <td className="px-5 py-4 text-xs text-slate-600">
                            <div className="space-y-1 max-w-[160px]">
                              {item.catatanKaur && (
                                <div className="rounded-lg border border-violet-100 bg-violet-50/60 px-2.5 py-1.5">
                                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-violet-500">Kep. Urusan</p>
                                  <p className="mt-0.5 text-[11px] font-medium text-slate-700">{item.catatanKaur}</p>
                                </div>
                              )}
                              {item.catatanKabag && (
                                <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-2.5 py-1.5">
                                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-600">Kep. Bagian</p>
                                  <p className="mt-0.5 text-[11px] font-medium text-slate-700">{item.catatanKabag}</p>
                                </div>
                              )}
                              {!item.catatanKaur && !item.catatanKabag && (
                                <span className="text-slate-300">—</span>
                              )}
                            </div>
                          </td>
                          {/* Lampiran — path_file + nama_file sesuai SdmDashboard */}
                          <td className="px-5 py-4">
                            {item.lampiran.length === 0 ? (
                              <span className="text-xs text-slate-300">0 file</span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {item.lampiran.map((file, fi) => {
                                  const fileUrl = getLampiranUrl(file);
                                  return (
                                    <a
                                      key={file.id ?? fi}
                                      href={fileUrl || "#"}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => {
                                        if (!fileUrl) {
                                          e.preventDefault();
                                          alert("URL dokumen tidak ditemukan. Pastikan backend mengirim path_file pada lampiran.");
                                        }
                                      }}
                                      className="inline-flex items-center gap-1 rounded-full border border-violet-100 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-600 transition hover:bg-violet-100"
                                    >
                                      📎 {file.nama_file || `File ${fi + 1}`}
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => router.push("/kepala-administrasi/approval-final")}
                              className="rounded-xl border border-violet-200 bg-violet-100/70 px-3 py-1.5 text-xs font-black text-slate-900 transition hover:bg-violet-200/70"
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Sidebar — urgent */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-950">Pengajuan Mendesak</h2>
                  <span className="rounded-full border border-emerald-200 bg-white/70 px-3 py-1 text-xs font-black text-slate-700">
                    {urgentRows.length}
                  </span>
                </div>

                <div className="mt-5">
                  {urgentRows.length === 0 ? (
                    <div className="rounded-[26px] border border-dashed border-emerald-200 bg-white/50 p-8 text-center">
                      <p className="font-black text-slate-950">Tidak ada pengajuan mendesak</p>
                      <p className="mt-2 text-sm text-slate-500">Semua pengajuan berjalan normal.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {urgentRows.slice(0, 4).map((item) => (
                        <div
                          key={`urgent-${item.kategori}-${item.id}`}
                          className="rounded-2xl border border-red-100 bg-white/80 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-black text-slate-950">{item.nama}</p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {item.kategori} • {item.jenis}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-400">{item.periode}</p>
                            </div>
                            <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-black text-amber-700">
                              ⚡ Mendesak
                            </span>
                          </div>
                        </div>
                      ))}
                      {urgentRows.length > 4 && (
                        <button
                          type="button"
                          onClick={() => router.push("/kepala-administrasi/approval-final")}
                          className="w-full rounded-2xl border border-emerald-200 bg-white/70 py-2.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-50"
                        >
                          +{urgentRows.length - 4} lainnya →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick summary */}
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">Ringkasan</h2>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Total Menunggu",  value: rows.length,         color: "bg-violet-500" },
                    { label: "Cuti",            value: cutiPending.length,  color: "bg-indigo-400" },
                    { label: "Izin",            value: izinPending.length,  color: "bg-emerald-500" },
                    { label: "Mendesak",         value: urgentRows.length,   color: "bg-amber-400"  },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
                        <p className="text-sm font-semibold text-slate-600">{label}</p>
                      </div>
                      <p className="text-sm font-black text-slate-950">{value.toString().padStart(2, "0")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </section>
        </section>
      </main>
    </>
  );
}
