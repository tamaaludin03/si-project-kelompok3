"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { API_BASE_URL } from "@/lib/api";
const CHART_COLORS = ["#7c3aed", "#10b981", "#f59e0b", "#ef4444"];

type MonitoringItem = {
  id: number; kategori: "Cuti" | "Izin"; status: string;
  created_at: string; surat_cuti_diterbitkan?: boolean;
};

type NakesItem = {
  id: number; status_str: string; status_sip: string;
};

function formatDate(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
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

function ChartCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="mt-0.5 text-xs text-slate-400">{desc}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-violet-100 bg-white px-3 py-2 shadow-lg text-xs font-semibold text-slate-700">
      <span className="text-violet-600">{payload[0].name || payload[0].dataKey}</span>
      {" · "}
      <span className="text-slate-900">{payload[0].value}</span>
    </div>
  );
}

export default function StatistikPage() {
  const [items, setItems]   = useState<MonitoringItem[]>([]);
  const [nakes, setNakes]   = useState<NakesItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [cutiRes, izinRes, nakesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/cuti/sdm/monitoring`),
        fetch(`${API_BASE_URL}/izin/sdm/monitoring`),
        fetch(`${API_BASE_URL}/pegawai/sdm/nakes-monitoring`),
      ]);
      const cutiData  = await cutiRes.json().catch(() => null);
      const izinData  = await izinRes.json().catch(() => null);
      const nakesData = await nakesRes.json().catch(() => null);

      const cutiItems: MonitoringItem[] = cutiData?.data?.items?.map((i: any) => ({
        id: i.id, kategori: "Cuti" as const, status: i.status,
        created_at: i.created_at,
        surat_cuti_diterbitkan: Boolean(i.surat_cuti_diterbitkan),
      })) || [];

      const izinItems: MonitoringItem[] = izinData?.data?.items?.map((i: any) => ({
        id: i.id, kategori: "Izin" as const, status: i.status,
        created_at: i.created_at,
      })) || [];

      setItems([...cutiItems, ...izinItems]);
      setNakes(nakesData?.data?.items || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { loadAll(); }, []);

  const suratDiterbitkan = items.filter((i) => i.surat_cuti_diterbitkan).length;
  const menungguSurat    = items.filter((i) => i.kategori === "Cuti" && i.status === "disetujui_final" && !i.surat_cuti_diterbitkan).length;
  const pengajuanSelesai = items.filter((i) =>
    ["disetujui_final", "selesai", "ditolak_kaur", "ditolak_kabag", "ditolak_direktur"].includes(i.status)
  ).length;

  const nakesBelumIsi      = nakes.filter((i) => i.status_str === "belum_diisi" || i.status_sip === "belum_diisi").length;
  const nakesExpired       = nakes.filter((i) => i.status_str === "expired" || i.status_sip === "expired").length;
  const nakesHampirExpired = nakes.filter((i) => i.status_str.includes("kurang") || i.status_sip.includes("kurang")).length;
  const nakesAman          = nakes.filter((i) => i.status_str === "aman" && i.status_sip === "aman").length;

  const statusChartData = useMemo(() => [
    { name: "Proses",       value: items.filter((i) => ["pending", "disetujui_kaur", "pending_direktur"].includes(i.status)).length },
    { name: "Selesai/Final",value: items.filter((i) => i.status === "disetujui_final" || i.status === "selesai").length },
    { name: "Ditolak",      value: items.filter((i) => i.status.includes("ditolak")).length },
    { name: "Surat Terbit", value: suratDiterbitkan },
  ], [items, suratDiterbitkan]);

  const jenisChartData = useMemo(() => [
    { name: "Cuti", total: items.filter((i) => i.kategori === "Cuti").length },
    { name: "Izin", total: items.filter((i) => i.kategori === "Izin").length },
  ], [items]);

  const nakesChartData = useMemo(() => [
    { name: "Belum Isi",     total: nakesBelumIsi      },
    { name: "Hampir Exp",    total: nakesHampirExpired  },
    { name: "Expired",       total: nakesExpired        },
    { name: "Aman",          total: nakesAman           },
  ], [nakesBelumIsi, nakesHampirExpired, nakesExpired, nakesAman]);

  const nakesChartColors = ["#94a3b8", "#f59e0b", "#ef4444", "#10b981"];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .sdm-wrap, .sdm-wrap * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
      `}</style>

      <main className="sdm-wrap min-h-screen bg-transparent p-3 sm:p-6 space-y-4">
        {/* Header */}
        <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">SDM</p>
              <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">Statistik</h1>
              <p className="mt-1 text-sm text-slate-400">
                Ringkasan statistik pengajuan cuti/izin dan status STR/SIP tenaga kesehatan.
              </p>
            </div>
            <button
              onClick={loadAll}
              className="flex items-center gap-2 rounded-xl border border-violet-600 bg-transparent px-4 py-2 text-sm font-semibold text-violet-600 transition hover:bg-violet-50 active:scale-95"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Muat Ulang
            </button>
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <>
            {/* ─ Stat cards: Pengajuan ─ */}
            <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-500">Pengajuan Cuti & Izin</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard title="Total Pengajuan" value={items.length}         color="violet"
                  icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>} />
                <StatCard title="Selesai"         value={pengajuanSelesai}     color="emerald"
                  icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
                <StatCard title="Tunggu Surat"    value={menungguSurat}        color="amber"
                  icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
                <StatCard title="Surat Terbit"    value={suratDiterbitkan}     color="rose"
                  icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>} />
              </div>
            </section>

            {/* ─ Stat cards: STR/SIP ─ */}
            <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-500">STR/SIP Nakes</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard title="Total Nakes"    value={nakes.length}          color="violet"
                  icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>} />
                <StatCard title="Belum STR/SIP"  value={nakesBelumIsi}         color="slate"
                  icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>} />
                <StatCard title="Hampir Expired" value={nakesHampirExpired}    color="amber"
                  icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
                <StatCard title="Expired"        value={nakesExpired}          color="rose"
                  icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
              </div>
            </section>

            {/* ─ Charts ─ */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ChartCard title="Status Pengajuan" desc="Distribusi status cuti dan izin.">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusChartData} dataKey="value" nameKey="name"
                      outerRadius={75} innerRadius={35} paddingAngle={2}
                      label={(props: any) =>
                        props.value > 0 ? `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%` : ""
                      }
                      labelLine={{ stroke: "#c4b5fd", strokeWidth: 1 }}>
                      {statusChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Cuti vs Izin" desc="Perbandingan jumlah pengajuan.">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={jenisChartData} barSize={50}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f0f8" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" radius={[8, 8, 3, 3]}>
                      <Cell fill="#7c3aed" />
                      <Cell fill="#10b981" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Status STR/SIP Nakes" desc="Kondisi dokumen tenaga kesehatan.">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={nakesChartData} barSize={38}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f0f8" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" radius={[8, 8, 3, 3]}>
                      {nakesChartData.map((_, i) => <Cell key={i} fill={nakesChartColors[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </>
        )}
      </main>
    </>
  );
}
