"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type PegawaiInfo = {
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
  pegawai?: PegawaiInfo;
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
  pegawai?: PegawaiInfo;
};

type RowItem = {
  id: number;
  kategori: "Cuti" | "Izin";
  nama: string;
  nip: string;
  jabatan: string;
  unit: string;
  jenis: string;
  periode: string;
  alasan: string;
  status: string;
  createdAt: string;
  isUrgent: boolean;
  catatanKaur: string;
};

type Profile = {
  nama?: string;
  nip?: string;
  jabatan?: string;
  unit?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getProfile(): Profile {
  if (typeof window === "undefined") return {};
  const raw =
    localStorage.getItem("simciUser") ||
    localStorage.getItem("user") ||
    localStorage.getItem("currentUser");
  if (raw) {
    try {
      const user = JSON.parse(raw);
      return {
        nama: user?.nama || user?.name || user?.username || localStorage.getItem("nama") || "KABAG",
        nip: user?.nip || localStorage.getItem("nip") || "-",
        jabatan: user?.jabatan || localStorage.getItem("jabatan") || "KABAG",
        unit: user?.unit || localStorage.getItem("unit") || "-",
      };
    } catch {
      // fallback below
    }
  }
  return {
    nama: localStorage.getItem("nama") || "KABAG",
    nip: localStorage.getItem("nip") || "-",
    jabatan: localStorage.getItem("jabatan") || "KABAG",
    unit: localStorage.getItem("unit") || "-",
  };
}

function extractItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const p = payload as Record<string, unknown>;
  if (Array.isArray(p?.data)) return p.data as unknown[];
  const d = p?.data as Record<string, unknown> | undefined;
  if (Array.isArray(d?.items)) return d!.items as unknown[];
  if (Array.isArray(p?.items)) return p.items as unknown[];
  return [];
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function todayText(): string {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getStatusLabel(status?: string): string {
  const v = (status || "").toLowerCase();
  if (v.includes("tolak") || v.includes("reject")) return "Ditolak";
  if (v.includes("approve") || v.includes("setuju")) return "Disetujui";
  return "Pending KABAG";
}

function statusBadgeClass(status?: string): string {
  const v = (status || "").toLowerCase();
  if (v.includes("tolak") || v.includes("reject")) return "bg-rose-100 text-rose-700";
  if (v.includes("approve") || v.includes("setuju")) return "bg-emerald-100 text-emerald-700";
  return "bg-amber-100 text-amber-700";
}

// ─── StatCard — identical sizing to SdmDashboard & KaurDashboard ──────────────
type StatColor = "violet" | "emerald" | "amber" | "rose" | "slate";

const STAT_CONFIG: Record<StatColor, { bg: string; label: string; num: string; blob: string; icon: string }> = {
  violet:  { bg: "bg-white",      label: "text-violet-600",  num: "text-violet-700",  blob: "bg-violet-100",  icon: "text-violet-400"  },
  emerald: { bg: "bg-emerald-50", label: "text-emerald-700", num: "text-emerald-700", blob: "bg-emerald-200", icon: "text-emerald-400" },
  amber:   { bg: "bg-amber-50",   label: "text-amber-700",   num: "text-amber-700",   blob: "bg-amber-200",   icon: "text-amber-400"   },
  rose:    { bg: "bg-rose-50",    label: "text-rose-700",    num: "text-rose-700",    blob: "bg-rose-200",    icon: "text-rose-400"    },
  slate:   { bg: "bg-slate-50",   label: "text-slate-600",   num: "text-slate-700",   blob: "bg-slate-200",   icon: "text-slate-400"   },
};

function StatCard({
  title,
  value,
  color,
  icon,
  onClick,
}: {
  title: string;
  value: number;
  color: StatColor;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  const c = STAT_CONFIG[color];
  const display = String(value).padStart(2, "0");
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full overflow-hidden rounded-2xl border border-slate-100 ${c.bg} p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]`}
    >
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full ${c.blob} opacity-40`} />
      <div className={`relative z-10 mb-3 text-2xl ${c.icon}`}>{icon}</div>
      <p className={`relative z-10 text-xs font-semibold tracking-wide ${c.label}`}>{title}</p>
      <p className={`relative z-10 mt-1.5 text-4xl font-extrabold leading-none tracking-tight ${c.num}`}>{display}</p>
    </button>
  );
}

// ─── ActionCard — typed const map, no inline object-index ────────────────────
type ActionColor = "violet" | "emerald" | "amber" | "indigo";

type ActionStyle = { border: string; bg: string; blob: string; arrow: string };

const ACTION_STYLES: Record<ActionColor, ActionStyle> = {
  violet:  { border: "border-violet-100",  bg: "from-violet-50 to-white",  blob: "bg-violet-200/50",  arrow: "text-violet-500"  },
  emerald: { border: "border-emerald-100", bg: "from-emerald-50 to-white", blob: "bg-emerald-200/50", arrow: "text-emerald-500" },
  amber:   { border: "border-amber-100",   bg: "from-amber-50 to-white",   blob: "bg-amber-200/50",   arrow: "text-amber-500"   },
  indigo:  { border: "border-indigo-100",  bg: "from-indigo-50 to-white",  blob: "bg-indigo-200/50",  arrow: "text-indigo-500"  },
};

function ActionCard({
  title,
  desc,
  href,
  color = "violet",
}: {
  title: string;
  desc: string;
  href: string;
  color?: ActionColor;
}) {
  const router = useRouter();
  const s: ActionStyle = ACTION_STYLES[color];

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className={`group relative w-full overflow-hidden rounded-2xl border ${s.border} bg-gradient-to-br ${s.bg} p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full ${s.blob} blur-2xl transition duration-300 group-hover:scale-125`}
      />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-800">{title}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{desc}</p>
        </div>
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/80 text-sm shadow-sm transition-transform duration-200 group-hover:translate-x-1 ${s.arrow}`}
        >
          →
        </span>
      </div>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function KabagDashboard() {
  const router = useRouter();

  const [profile, setProfile]         = useState<Profile>({});
  const [cutiPending, setCutiPending] = useState<CutiItem[]>([]);
  const [izinPending, setIzinPending] = useState<IzinItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [message, setMessage]         = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");
      setProfile(getProfile());

      const token = localStorage.getItem("token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const nip      = localStorage.getItem("nip") || "";
      const nipQuery = nip ? `?nip=${encodeURIComponent(nip)}` : "";

      const [cutiRes, izinRes] = await Promise.all([
        fetch(`${API_BASE_URL}/cuti/kabag/pending${nipQuery}`, { headers, cache: "no-store" }),
        fetch(`${API_BASE_URL}/izin/kabag/pending${nipQuery}`, { headers, cache: "no-store" }),
      ]);

      const cutiJson = await cutiRes.json().catch(() => null);
      const izinJson = await izinRes.json().catch(() => null);

      if (cutiRes.ok) setCutiPending((extractItems(cutiJson) as CutiItem[]).filter((i) => i.pegawai?.nip !== nip));
      if (izinRes.ok) setIzinPending((extractItems(izinJson) as IzinItem[]).filter((i) => i.pegawai?.nip !== nip));

      if (!cutiRes.ok || !izinRes.ok)
        setMessage("Sebagian data tidak dapat dimuat. Silakan coba muat ulang atau hubungi administrator.");
    } catch (error) {
      console.error(error);
      setMessage("Gagal memuat data. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const timer = window.setInterval(loadData, 30_000);
    return () => window.clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo<RowItem[]>(() => {
    const cutiRows: RowItem[] = cutiPending.map((item) => ({
      id:          item.id,
      kategori:    "Cuti",
      nama:        item.pegawai?.nama    || "-",
      nip:         item.pegawai?.nip     || "-",
      jabatan:     item.pegawai?.jabatan || "-",
      unit:        item.pegawai?.unit    || "-",
      jenis:       item.jenis_cuti,
      periode:     `${formatDate(item.tanggal_mulai)} – ${formatDate(item.tanggal_selesai)}`,
      alasan:      item.alasan           || "-",
      status:      item.status           || "pending_kabag",
      createdAt:   item.created_at,
      isUrgent:    Boolean(item.is_urgent),
      catatanKaur: item.catatan_kaur     || "-",
    }));

    const izinRows: RowItem[] = izinPending.map((item) => ({
      id:          item.id,
      kategori:    "Izin",
      nama:        item.pegawai?.nama    || "-",
      nip:         item.pegawai?.nip     || "-",
      jabatan:     item.pegawai?.jabatan || "-",
      unit:        item.pegawai?.unit    || "-",
      jenis:       item.jenis_izin,
      periode:     `${formatDate(item.tanggal)}${
        item.jam_mulai || item.jam_selesai
          ? `, ${item.jam_mulai || "-"} – ${item.jam_selesai || "-"}`
          : ""
      }`,
      alasan:      item.alasan           || "-",
      status:      item.status           || "pending_kabag",
      createdAt:   item.created_at,
      isUrgent:    Boolean(item.is_urgent),
      catatanKaur: item.catatan_kaur     || "-",
    }));

    return [...cutiRows, ...izinRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [cutiPending, izinPending]);

  const totalPending = rows.length;
  const urgentRows   = rows.filter((r) => r.isUrgent);
  const recentRows   = rows.slice(0, 5);
  const notifRows    = rows.slice(0, 3);

  return (
    <>
      {/* ── Font & animations ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .kabag-wrap, .kabag-wrap * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .kabag-wrap { -webkit-font-smoothing: antialiased; }

        @keyframes kbFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .kb-a0 { animation: kbFadeUp 0.38s cubic-bezier(0.22,1,0.36,1) both; }
        .kb-a1 { animation: kbFadeUp 0.38s 0.07s cubic-bezier(0.22,1,0.36,1) both; }
        .kb-a2 { animation: kbFadeUp 0.38s 0.14s cubic-bezier(0.22,1,0.36,1) both; }
        .kb-a3 { animation: kbFadeUp 0.38s 0.21s cubic-bezier(0.22,1,0.36,1) both; }

        .kb-row:hover { background: rgba(245,243,255,0.55); }
      `}</style>

      <main className="kabag-wrap min-h-screen bg-transparent p-3 sm:p-6 text-slate-900">
        <div className="mx-auto max-w-7xl space-y-5">

          {/* ════ HEADER CARD ════ */}
          <section className="kb-a0 rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">
                  Dashboard KABAG
                </p>
                <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
                  Persetujuan Kabag
                </h1>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  Setujui atau tolak pengajuan cuti dan izin pegawai yang masuk ke antrian Anda.
                </p>

                {/* Profile badges */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-violet-100 bg-violet-50 px-3.5 py-1 text-xs font-semibold text-violet-700">
                    {profile.nama || "KABAG"}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1 text-xs font-semibold text-slate-600">
                    NIP: {profile.nip || "-"}
                  </span>
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-700">
                    {profile.jabatan || "KABAG"}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1 text-xs font-semibold text-slate-600">
                    Unit: {profile.unit || "-"}
                  </span>
                </div>
              </div>

              {/* Right: bell + refresh + today */}
              <div className="flex shrink-0 flex-col items-end gap-3">
                <div className="flex items-center gap-2">
                  {/* Bell notifikasi */}
                  <a href="/kabag/notifikasi" className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-violet-300 hover:text-violet-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    {totalPending > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white">
                        {totalPending > 9 ? "9+" : totalPending}
                      </span>
                    )}
                  </a>
                  <button
                    type="button"
                    onClick={loadData}
                    className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-600 transition hover:bg-violet-100 hover:border-violet-300 active:scale-95"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    Muat Ulang
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Hari ini
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{todayText()}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-400">
                    {loading ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                        Memuat data...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Data Terbaru
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard
                title="Pending Cuti"
                value={cutiPending.length}
                color="violet"
                onClick={() => router.push("/kabag/approval-cuti")}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
              <StatCard
                title="Pending Izin"
                value={izinPending.length}
                color="emerald"
                onClick={() => router.push("/kabag/approval-izin")}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
              <StatCard
                title="Mendesak"
                value={urgentRows.length}
                color="rose"
                onClick={() => router.push("/kabag/pengajuan-urgent")}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                }
              />
            </div>
          </section>

          {/* ── Warning banner ── */}
          {message && (
            <div className="kb-a1 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm font-semibold text-amber-800 shadow-sm">
              {message}
            </div>
          )}

          {/* ════ ACTION CARDS ════ */}
          <section className="kb-a1 rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
            <p className="text-sm font-bold text-slate-800">Akses Cepat</p>
            <p className="mt-0.5 text-xs text-slate-400">Navigasi cepat ke fungsi utama Anda.</p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ActionCard title="Persetujuan Cuti"  desc="Tinjau dan setujui pengajuan cuti"           href="/kabag/approval-cuti"     color="violet"  />
              <ActionCard title="Persetujuan Izin"  desc="Tinjau dan setujui pengajuan izin"           href="/kabag/approval-izin"     color="emerald" />
              <ActionCard title="Pengajuan Mendesak" desc="Lihat pengajuan yang memerlukan perhatian"  href="/kabag/pengajuan-urgent"  color="amber"   />
              <ActionCard title="Riwayat Keputusan" desc="Riwayat persetujuan yang pernah diproses"   href="/kabag/riwayat-approval"  color="violet"  />
            </div>
          </section>

          {/* ════ MAIN GRID ════ */}
          <div className="kb-a2 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">

            {/* ── Review table — includes Catatan KAUR column ── */}
            <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Pengajuan Menunggu Review</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/kabag/approval-cuti")}
                  className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-600 transition hover:bg-violet-100 hover:border-violet-300 active:scale-95"
                >
                  Lihat Semua
                </button>
              </div>

              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Pegawai", "Pengajuan", "Periode", "Catatan Kepala Unit", "Status", "Tindakan"].map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" />
                            Memuat pengajuan...
                          </span>
                        </td>
                      </tr>
                    ) : recentRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                          Tidak ada pengajuan pending.
                        </td>
                      </tr>
                    ) : (
                      recentRows.map((item) => (
                        <tr
                          key={`${item.kategori}-${item.id}`}
                          className="kb-row transition-colors"
                        >
                          {/* Pegawai */}
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-slate-800">{item.nama}</p>
                            <p className="mt-0.5 text-xs text-slate-400">{item.nip}</p>
                            <p className="text-xs text-slate-400">{item.jabatan}</p>
                          </td>

                          {/* Pengajuan */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                item.kategori === "Cuti"
                                  ? "bg-violet-100 text-violet-700"
                                  : "bg-sky-100 text-sky-700"
                              }`}
                            >
                              {item.kategori}
                            </span>
                            <p className="mt-1 text-xs capitalize text-slate-400">{item.jenis}</p>
                          </td>

                          {/* Periode */}
                          <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">
                            {item.periode}
                          </td>

                          {/* Catatan KAUR — KABAG-specific column */}
                          <td className="max-w-[160px] px-4 py-3.5">
                            {item.catatanKaur === "-" ? (
                              <span className="text-slate-300">—</span>
                            ) : (
                              <div className="rounded-lg border border-violet-100 bg-violet-50/60 px-2.5 py-1.5">
                                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-violet-500">{item.status === "selesai" ? "Sistem" : "KAUR"}</p>
                                <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-slate-700">
                                  {item.catatanKaur}
                                </p>
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusBadgeClass(item.status)}`}
                            >
                              {getStatusLabel(item.status)}
                            </span>
                            {item.isUrgent && (
                              <span className="ml-1.5 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                Mendesak
                              </span>
                            )}
                          </td>

                          {/* Aksi */}
                          <td className="px-4 py-3.5">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  item.kategori === "Cuti"
                                    ? "/kabag/approval-cuti"
                                    : "/kabag/approval-izin"
                                )
                              }
                              className="rounded-lg bg-violet-700 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-violet-800 active:scale-95"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Right sidebar ── */}
            <div className="space-y-5">

              {/* Urgent panel */}
              <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Pengajuan Mendesak</p>
                    <p className="mt-0.5 text-xs text-slate-400">Prioritas review segera.</p>
                  </div>
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                    {urgentRows.length}
                  </span>
                </div>

                <div className="mt-4">
                  {urgentRows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                      <p className="text-sm font-semibold text-slate-500">
                        Tidak ada pengajuan urgent
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {urgentRows.slice(0, 4).map((item) => (
                        <button
                          key={`urgent-${item.kategori}-${item.id}`}
                          type="button"
                          onClick={() =>
                            router.push(
                              item.kategori === "Cuti"
                                ? "/kabag/approval-cuti"
                                : "/kabag/approval-izin"
                            )
                          }
                          className="w-full rounded-xl border border-rose-100 bg-rose-50/60 p-4 text-left transition-colors hover:bg-rose-50 hover:shadow-sm active:scale-[0.98]"
                        >
                          <p className="font-semibold text-slate-800">{item.nama}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.kategori} • {item.jenis}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Notifikasi panel */}
              <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Notifikasi </p>
                    <p className="mt-0.5 text-xs text-slate-400">Review masuk dari KAUR.</p>
                  </div>
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                    {totalPending}
                  </span>
                </div>

                <div className="mt-4 space-y-2.5">
                  {notifRows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                      <p className="text-sm font-semibold text-slate-500">
                        Tidak ada notifikasi baru
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        
                      </p>
                    </div>
                  ) : (
                    notifRows.map((item) => (
                      <button
                        key={`notif-${item.kategori}-${item.id}`}
                        type="button"
                        onClick={() =>
                          router.push(
                            item.kategori === "Cuti"
                              ? "/kabag/approval-cuti"
                              : "/kabag/approval-izin"
                          )
                        }
                        className="w-full rounded-xl border border-violet-100 bg-violet-50/60 p-4 text-left transition-colors hover:bg-violet-50 hover:shadow-sm active:scale-[0.98]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              Review {item.kategori.toLowerCase()} masuk
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">{item.nama}</p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {item.jenis} • {item.periode}
                            </p>
                          </div>
                          {item.isUrgent && (
                            <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                              Mendesak
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <p className="mt-4 text-xs text-slate-400">
                   
                </p>
              </section>

            </div>
          </div>

        </div>
      </main>
    </>
  );
}
