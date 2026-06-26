"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "@/lib/api";

type RekapUnit = {
  unit: string; totalCuti: number; totalIzin: number; totalPengajuan: number;
  pending: number; proses: number; approvedFinal: number; ditolak: number;
};
type Pengajuan = {
  id: number; kategori: string; jenis: string; nama: string;
  nip?: string | null; unit?: string | null; jabatan?: string | null;
  status: string; tanggal: string; created_at: string;
};
type Summary = {
  totalPegawai: number; totalNakes: number; totalCuti: number; totalIzin: number;
  totalPengajuan: number; pending: number; proses: number; approvedFinal: number;
  ditolak: number; suratDiterbitkan?: number;
  strExpired: number; sipExpired: number; belumIsiStrSip: number; hampirExpiredStrSip: number;
  rekapPerUnit: RekapUnit[];
  recentPengajuan: Pengajuan[];
  rekapApproval?: {
    pending: number; approvedKaur: number; approvedKabag: number;
    approvedFinal: number; ditolak: number; suratDiterbitkan: number;
  };
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu", disetujui_kaur: "Disetujui KAUR", disetujui_final: "Disetujui Final",
  ditolak_kaur: "Ditolak KAUR", ditolak_kabag: "Ditolak KABAG", ditolak_direktur: "Ditolak Direktur",
  pending_direktur: "Menunggu Direktur", selesai: "Selesai",
};
function sLabel(s: string) { return STATUS_LABEL[s] || s; }

function formatDate(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function formatDateTime(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function escapeHtml(v: unknown) {
  return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

export default function DireksiLaporanPage() {
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_BASE_URL}/dashboard/direksi/summary`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Gagal memuat laporan.");
      setSummary(data?.data || null);
      setLastUpdated(new Date().toISOString());
    } catch (e: any) { setError(e.message || "Gagal memuat laporan."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const approvalFunnel = useMemo(() => {
    const r = summary?.rekapApproval;
    return [
      { label: "Menunggu",        val: r?.pending       ?? summary?.pending       ?? 0, color: "bg-amber-400"   },
      { label: "Disetujui KAUR",  val: r?.approvedKaur  ?? 0,                           color: "bg-sky-400"     },
      { label: "Disetujui KABAG", val: r?.approvedKabag ?? 0,                           color: "bg-indigo-400"  },
      { label: "Disetujui Final", val: r?.approvedFinal ?? summary?.approvedFinal ?? 0, color: "bg-emerald-500" },
      { label: "Ditolak",         val: r?.ditolak       ?? summary?.ditolak       ?? 0, color: "bg-rose-400"    },
      { label: "Surat Terbit",    val: r?.suratDiterbitkan ?? summary?.suratDiterbitkan ?? 0, color: "bg-violet-500" },
    ];
  }, [summary]);

  const maxFunnel = useMemo(() => Math.max(...approvalFunnel.map(f => f.val), 1), [approvalFunnel]);

  function exportExcel() {
    if (!summary) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Metrik: "Total Pegawai",          Jumlah: summary.totalPegawai   },
      { Metrik: "Total Nakes",            Jumlah: summary.totalNakes     },
      { Metrik: "Total Cuti",             Jumlah: summary.totalCuti      },
      { Metrik: "Total Izin",             Jumlah: summary.totalIzin      },
      { Metrik: "Total Pengajuan",        Jumlah: summary.totalPengajuan },
      { Metrik: "Pending",                Jumlah: summary.pending        },
      { Metrik: "Sedang Diproses",        Jumlah: summary.proses         },
      { Metrik: "Disetujui Final",        Jumlah: summary.approvedFinal  },
      { Metrik: "Ditolak",                Jumlah: summary.ditolak        },
      { Metrik: "Surat Cuti Diterbitkan", Jumlah: summary.suratDiterbitkan ?? 0 },
      { Metrik: "STR Expired",            Jumlah: summary.strExpired     },
      { Metrik: "SIP Expired",            Jumlah: summary.sipExpired     },
    ]), "Ringkasan");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      (summary.rekapPerUnit || []).map(u => ({
        Unit: u.unit, Cuti: u.totalCuti, Izin: u.totalIzin, Total: u.totalPengajuan,
        Menunggu: u.pending, Diproses: u.proses, Final: u.approvedFinal, Ditolak: u.ditolak,
      }))
    ), "Rekap Per Unit");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      (summary.recentPengajuan || []).map(p => ({
        Kategori: p.kategori, Jenis: p.jenis, Nama: p.nama,
        NIP: p.nip || "-", Unit: p.unit || "-",
        Status: sLabel(p.status), Tanggal: formatDate(p.tanggal),
      }))
    ), "Daftar Pengajuan");
    XLSX.writeFile(wb, `Laporan_Direksi_SIMCI_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function exportPdf() {
    if (!summary) return;
    const unitRows = (summary.rekapPerUnit || []).map(u =>
      `<tr><td>${escapeHtml(u.unit)}</td><td>${u.totalCuti}</td><td>${u.totalIzin}</td><td>${u.totalPengajuan}</td><td>${u.pending}</td><td>${u.proses}</td><td>${u.approvedFinal}</td><td>${u.ditolak}</td></tr>`
    ).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <style>*{font-family:'Plus Jakarta Sans',sans-serif}body{margin:24px;color:#1e293b}h1{font-size:20px;font-weight:700;color:#4c1d95}p{color:#475569}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px}.card{border:1px solid #ddd6fe;border-radius:12px;padding:12px;background:#f5f3ff}.label{font-size:12px;color:#475569}.value{font-size:22px;font-weight:700;margin-top:4px}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}th{background:#ede9fe}.footer{margin-top:30px;font-size:11px;color:#64748b}@media print{button{display:none}}</style>
      </head><body>
      <h1>Laporan Direksi SIMCI RSGM</h1>
      <p>Dicetak pada ${formatDateTime(new Date().toISOString())}</p>
      <div class="grid">
        <div class="card"><div class="label">Total Pengajuan</div><div class="value">${summary.totalPengajuan}</div></div>
        <div class="card"><div class="label">Disetujui Final</div><div class="value">${summary.approvedFinal}</div></div>
        <div class="card"><div class="label">Menunggu</div><div class="value">${summary.pending}</div></div>
        <div class="card"><div class="label">Ditolak</div><div class="value">${summary.ditolak}</div></div>
      </div>
      <h2 style="margin-top:24px">Rekap Pengajuan Per Unit</h2>
      <table><thead><tr><th>Unit</th><th>Cuti</th><th>Izin</th><th>Total</th><th>Menunggu</th><th>Diproses</th><th>Final</th><th>Ditolak</th></tr></thead>
      <tbody>${unitRows || "<tr><td colspan='8'>Tidak ada data</td></tr>"}</tbody></table>
      <div class="footer">SIMCI RSGM &mdash; Laporan Direksi &mdash; ${new Date().getFullYear()}</div>
      <script>window.print();</script></body></html>`;
    const w = window.open("","_blank","width=1000,height=800");
    if (!w) return;
    w.document.open(); w.document.write(html); w.document.close();
  }

  return (
    <main className="min-h-screen space-y-5 bg-transparent p-3 sm:p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Direktur Utama</p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">Laporan</h1>
            <p className="mt-1 text-sm text-slate-400">Ringkasan statistik dan rekap pengajuan untuk keperluan pelaporan.</p>
            {lastUpdated && <p className="mt-1.5 text-[11px] text-slate-400">Data per: {formatDateTime(lastUpdated)}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={load}
              className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-600 transition hover:bg-violet-100 active:scale-95">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Muat Ulang
            </button>
            <button onClick={exportPdf}
              className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 active:scale-95">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              PDF
            </button>
            <button onClick={exportExcel}
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100 active:scale-95">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Excel
            </button>
          </div>
        </div>
        {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}
      </section>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
        </div>
      ) : (
        <>
          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Total Pegawai",    val: summary?.totalPegawai   ?? 0, b: "border-violet-100",  bg: "bg-violet-50/60",  n: "text-violet-700"  },
              { label: "Total Cuti",       val: summary?.totalCuti      ?? 0, b: "border-sky-100",     bg: "bg-sky-50/60",     n: "text-sky-700"     },
              { label: "Total Izin",       val: summary?.totalIzin      ?? 0, b: "border-amber-100",   bg: "bg-amber-50/60",   n: "text-amber-700"   },
              { label: "Total Pengajuan",  val: summary?.totalPengajuan ?? 0, b: "border-slate-200",   bg: "bg-slate-50/60",   n: "text-slate-800"   },
            ].map(({ label, val, b, bg, n }) => (
              <div key={label} className={`rounded-3xl border ${b} ${bg} p-5 shadow-sm`}>
                <p className={`text-[2rem] font-black leading-none tracking-tight ${n}`}>{String(val).padStart(2,"0")}</p>
                <p className={`mt-2 text-[11.5px] font-semibold ${n} opacity-80`}>{label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Disetujui Final", val: summary?.approvedFinal   ?? 0, b: "border-emerald-100", bg: "bg-emerald-50/60", n: "text-emerald-700" },
              { label: "Menunggu",        val: summary?.pending         ?? 0, b: "border-amber-100",   bg: "bg-amber-50/60",   n: "text-amber-700"   },
              { label: "Sedang Diproses", val: summary?.proses          ?? 0, b: "border-sky-100",     bg: "bg-sky-50/60",     n: "text-sky-700"     },
              { label: "Ditolak",         val: summary?.ditolak         ?? 0, b: "border-rose-100",    bg: "bg-rose-50/60",    n: "text-rose-700"    },
            ].map(({ label, val, b, bg, n }) => (
              <div key={label} className={`rounded-3xl border ${b} ${bg} p-5 shadow-sm`}>
                <p className={`text-[2rem] font-black leading-none tracking-tight ${n}`}>{String(val).padStart(2,"0")}</p>
                <p className={`mt-2 text-[11.5px] font-semibold ${n} opacity-80`}>{label}</p>
              </div>
            ))}
          </div>

          {/* Approval Funnel + STR/SIP */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Funnel */}
            <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Alur</p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-900">Funnel Persetujuan</h2>
              <p className="mt-0.5 text-sm text-slate-400 mb-5">Distribusi pengajuan di setiap tahap approval.</p>
              <div className="space-y-3">
                {approvalFunnel.map(f => (
                  <div key={f.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-600">{f.label}</span>
                      <span className="text-xs font-bold text-slate-800">{f.val}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${f.color} transition-all duration-700`}
                        style={{ width: `${(f.val / maxFunnel) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* STR/SIP Summary */}
            <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600">Kepatuhan</p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-900">Status STR / SIP Nakes</h2>
              <p className="mt-0.5 text-sm text-slate-400 mb-5">Ringkasan kepatuhan STR dan SIP tenaga kesehatan.</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Nakes",    val: summary?.totalNakes        ?? 0, b: "border-violet-100",  bg: "bg-violet-50/60",  n: "text-violet-700"  },
                  { label: "Belum Isi",      val: summary?.belumIsiStrSip    ?? 0, b: "border-slate-200",   bg: "bg-slate-50/60",   n: "text-slate-700"   },
                  { label: "Hampir Expired", val: summary?.hampirExpiredStrSip ?? 0, b: "border-amber-100", bg: "bg-amber-50/60",   n: "text-amber-700"   },
                  { label: "Sudah Expired",  val: (summary?.strExpired ?? 0) + (summary?.sipExpired ?? 0), b: "border-rose-100", bg: "bg-rose-50/60", n: "text-rose-700" },
                ].map(({ label, val, b, bg, n }) => (
                  <div key={label} className={`rounded-2xl border ${b} ${bg} px-4 py-3`}>
                    <p className={`text-2xl font-extrabold ${n}`}>{String(val).padStart(2,"0")}</p>
                    <p className={`mt-1 text-[11px] font-semibold ${n} opacity-70`}>{label}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Rekap Per Unit */}
          {(summary?.rekapPerUnit || []).length > 0 && (
            <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Detail</p>
                  <h2 className="mt-1 text-lg font-extrabold text-slate-900">Rekap Pengajuan Per Unit</h2>
                </div>
                <span className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-600">
                  {summary?.rekapPerUnit?.length} unit
                </span>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Unit","Cuti","Izin","Total","Menunggu","Diproses","Final","Ditolak"].map(h => (
                        <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 bg-white">
                    {summary?.rekapPerUnit?.map(u => (
                      <tr key={u.unit} className="transition-colors hover:bg-violet-50/30">
                        <td className="px-4 py-3 font-semibold text-slate-800">{u.unit}</td>
                        <td className="px-4 py-3 text-slate-600">{u.totalCuti}</td>
                        <td className="px-4 py-3 text-slate-600">{u.totalIzin}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{u.totalPengajuan}</td>
                        <td className="px-4 py-3 text-amber-700">{u.pending}</td>
                        <td className="px-4 py-3 text-sky-700">{u.proses}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">{u.approvedFinal}</td>
                        <td className="px-4 py-3 text-rose-600">{u.ditolak}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
