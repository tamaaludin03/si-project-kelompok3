"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

function getProfile() {
  if (typeof window === "undefined") return { nama: "SDM", nip: "-", jabatan: "SDM", unit: "-", role: "sdm" };
  const raw = localStorage.getItem("user") || localStorage.getItem("simciUser");
  if (raw) {
    try {
      const u = JSON.parse(raw);
      return {
        nama:    u?.nama    || localStorage.getItem("nama")          || "SDM",
        nip:     u?.nip     || localStorage.getItem("nip")           || "-",
        jabatan: u?.jabatan || localStorage.getItem("jabatan")       || "SDM",
        unit:    u?.unit    || localStorage.getItem("unit")          || "-",
        role:    u?.internal_role || u?.role || localStorage.getItem("internal_role") || "sdm",
      };
    } catch { /* */ }
  }
  return {
    nama:    localStorage.getItem("nama")          || "SDM",
    nip:     localStorage.getItem("nip")           || "-",
    jabatan: localStorage.getItem("jabatan")       || "SDM",
    unit:    localStorage.getItem("unit")          || "-",
    role:    localStorage.getItem("internal_role") || "sdm",
  };
}

const STAT_CONFIG: Record<string, { bg: string; label: string; num: string }> = {
  violet:  { bg: "bg-white", label: "text-violet-600", num: "text-violet-600" },
  emerald: { bg: "bg-white", label: "text-violet-600", num: "text-violet-600" },
  amber:   { bg: "bg-amber-50", label: "text-amber-700", num: "text-amber-700" },
  rose:    { bg: "bg-white", label: "text-red-500",    num: "text-red-500"    },
  slate:   { bg: "bg-white", label: "text-violet-600", num: "text-violet-600" },
};

function StatCard({ title, value, color, icon }: {
  title: string; value: number; color: string; icon: React.ReactNode;
}) {
  const c = STAT_CONFIG[color];
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-100 ${c.bg} p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}>
      <div className={`relative z-10 mb-3 text-2xl ${c.label}`}>{icon}</div>
      <p className={`relative z-10 text-xs font-semibold tracking-wide ${c.label}`}>{title}</p>
      <p className={`relative z-10 mt-1.5 text-4xl font-extrabold leading-none tracking-tight ${c.num}`}>
        {String(value).padStart(2, "0")}
      </p>
    </div>
  );
}

const QUICK_LINKS = [
  {
    href: "/sdm/pengajuan-masuk",
    label: "Pengajuan Masuk",
    desc: "Monitor semua cuti & izin, terbitkan surat.",
    color: "border-violet-100 hover:border-violet-300 hover:bg-violet-50",
    iconColor: "text-violet-500 bg-violet-100",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
    ),
  },
  {
    href: "/sdm/data-pegawai",
    label: "Data Pegawai",
    desc: "Sisa kuota cuti per jenis semua pegawai.",
    color: "border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50",
    iconColor: "text-emerald-600 bg-emerald-100",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
  },
  {
    href: "/sdm/monitoring-str-sip",
    label: "Monitoring STR/SIP",
    desc: "Status dokumen STR dan SIP tenaga kesehatan.",
    color: "border-sky-100 hover:border-sky-300 hover:bg-sky-50",
    iconColor: "text-sky-600 bg-sky-100",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
      </svg>
    ),
  },
  {
    href: "/sdm/laporan",
    label: "Laporan",
    desc: "Rekap pengajuan per periode, export Excel.",
    color: "border-amber-100 hover:border-amber-300 hover:bg-amber-50",
    iconColor: "text-amber-600 bg-amber-100",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
      </svg>
    ),
  },
  {
    href: "/sdm/statistik",
    label: "Statistik",
    desc: "Grafik distribusi status dan perbandingan.",
    color: "border-rose-100 hover:border-rose-300 hover:bg-rose-50",
    iconColor: "text-rose-500 bg-rose-100",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
];

export default function SdmDashboard() {
  const [profile, setProfile]         = useState(getProfile());
  const [pengajuan, setPengajuan]     = useState(0);
  const [menungguSurat, setMenunggu]  = useState(0);
  const [suratTerbit, setSurat]       = useState(0);
  const [totalNakes, setNakes]        = useState(0);
  const [belumIsi, setBelumIsi]       = useState(0);
  const [nakesExpired, setExpired]    = useState(0);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    setProfile(getProfile());
    async function loadStats() {
      try {
        const [cutiRes, izinRes, nakesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/cuti/sdm/monitoring`),
          fetch(`${API_BASE_URL}/izin/sdm/monitoring`),
          fetch(`${API_BASE_URL}/pegawai/sdm/nakes-monitoring`),
        ]);
        const cutiData  = await cutiRes.json().catch(() => null);
        const izinData  = await izinRes.json().catch(() => null);
        const nakesData = await nakesRes.json().catch(() => null);

        const cutiItems  = cutiData?.data?.items || [];
        const izinItems  = izinData?.data?.items || [];
        const nakesItems = nakesData?.data?.items || [];

        const allPengajuan = cutiItems.length + izinItems.length;
        const menunggu = cutiItems.filter((i: any) => i.status === "disetujui_final" && !i.surat_cuti_diterbitkan).length;
        const surat    = cutiItems.filter((i: any) => i.surat_cuti_diterbitkan).length;

        setPengajuan(allPengajuan);
        setMenunggu(menunggu);
        setSurat(surat);
        setNakes(nakesItems.length);
        setBelumIsi(nakesItems.filter((i: any) => i.status_str === "belum_diisi" || i.status_sip === "belum_diisi").length);
        setExpired(nakesItems.filter((i: any) => i.status_str === "expired" || i.status_sip === "expired").length);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    loadStats();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .sdm-wrap, .sdm-wrap * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
      `}</style>

      <main className="sdm-wrap min-h-screen bg-transparent p-6 space-y-4">
        {/* Header */}
        <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Dashboard</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">SDM — Sumber Daya Manusia</h1>
          <p className="mt-1 text-sm text-slate-400">
            Ringkasan keseluruhan pengajuan dan status SDM RSGM. Gunakan menu di samping untuk detail.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                { label: profile.nama,    cls: "border-violet-100 bg-violet-50 text-violet-700"   },
                { label: `NIP: ${profile.nip}`, cls: "border-slate-200 bg-slate-50 text-slate-600" },
                { label: profile.jabatan, cls: "border-emerald-100 bg-emerald-50 text-emerald-700" },
                { label: `Unit: ${profile.unit}`, cls: "border-slate-200 bg-slate-50 text-slate-600" },
                { label: profile.role,    cls: "border-sky-100 bg-sky-50 text-sky-700"             },
              ].map(({ label, cls }) => (
                <span key={label} className={`rounded-full border px-3.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>
              ))}
            </div>
            {/* Bell notifikasi */}
            <a href="/sdm/notifikasi" className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-violet-300 hover:text-violet-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {menungguSurat > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white">
                  {menungguSurat > 9 ? "9+" : menungguSurat}
                </span>
              )}
            </a>
          </div>
        </section>

        {/* Stat cards */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard title="Total Pengajuan" value={pengajuan}    color="violet"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>} />
            <StatCard title="Perlu Terbitkan Surat" value={menungguSurat} color="amber"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
            <StatCard title="Surat Terbit"    value={suratTerbit}  color="emerald"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>} />
            <StatCard title="Total Nakes"     value={totalNakes}   color="violet"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>} />
            <StatCard title="STR/SIP Belum Diisi" value={belumIsi}  color="slate"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>} />
            <StatCard title="STR/SIP Kadaluarsa" value={nakesExpired} color="rose"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
          </div>
        )}

        {/* Quick links */}
        <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Akses Cepat</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_LINKS.map(({ href, label, desc, color, iconColor, icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-start gap-4 rounded-2xl border bg-white p-4 transition-all ${color}`}
              >
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconColor}`}>
                  {icon}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{desc}</p>
                </div>
                <svg className="ml-auto mt-1 h-4 w-4 flex-shrink-0 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
