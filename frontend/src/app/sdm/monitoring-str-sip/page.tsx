"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "@/lib/api";

type NakesItem = {
  id: number;
  nip?: string | null;
  nama?: string | null;
  jabatan?: string | null;
  jenis_pegawai?: string | null;
  email?: string | null;
  no_hp?: string | null;
  nomor_str?: string | null;
  str_seumur_hidup?: boolean;
  nomor_sip?: string | null;
  tanggal_terbit_sip?: string | null;
  expired_sip?: string | null;
  status_str: string;
  status_sip: string;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function strSipLabel(status?: string) {
  switch (status) {
    case "expired":         return "Expired";
    case "kurang_1_bulan":  return "< 1 Bulan";
    case "kurang_3_bulan":  return "< 3 Bulan";
    case "kurang_6_bulan":  return "< 6 Bulan";
    case "kurang_1_tahun":  return "< 1 Tahun";
    case "aman":            return "Aman";
    default:                return "Belum Diisi";
  }
}

function strSipClass(status?: string) {
  switch (status) {
    case "expired":         return "bg-rose-100 text-rose-700";
    case "kurang_1_bulan":  return "bg-orange-100 text-orange-700";
    case "kurang_3_bulan":
    case "kurang_6_bulan":
    case "kurang_1_tahun":  return "bg-amber-100 text-amber-700";
    case "aman":            return "bg-emerald-100 text-emerald-700";
    default:                return "bg-slate-100 text-slate-500";
  }
}

const STAT_CONFIG: Record<string, { bg: string; label: string; num: string }> = {
  violet:  { bg: "bg-white", label: "text-violet-600", num: "text-violet-600" },
  emerald: { bg: "bg-white", label: "text-violet-600", num: "text-violet-600" },
  amber:   { bg: "bg-amber-50", label: "text-amber-700", num: "text-amber-700" },
  rose:    { bg: "bg-white", label: "text-red-500",    num: "text-red-500"    },
  slate:   { bg: "bg-white", label: "text-violet-600", num: "text-violet-600" },
};

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  const c = STAT_CONFIG[color];
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-100 ${c.bg} p-5 shadow-sm`}>
      <p className={`relative z-10 text-xs font-semibold tracking-wide ${c.label}`}>{title}</p>
      <p className={`relative z-10 mt-1.5 text-4xl font-extrabold leading-none tracking-tight ${c.num}`}>
        {String(value).padStart(2, "0")}
      </p>
    </div>
  );
}

export default function MonitoringStrSipPage() {
  const [items, setItems] = useState<NakesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pegawai/sdm/nakes-monitoring`);
      const data = await res.json().catch(() => null);
      setItems(data?.data?.items || []);
    } catch {
      alert("Gagal memuat data monitoring STR/SIP");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() =>
    items.filter((item) => {
      const kw = search.toLowerCase();
      const matchKw = !kw || [item.nama, item.nip, item.jabatan].some((v) =>
        String(v || "").toLowerCase().includes(kw)
      );
      if (!matchKw) return false;
      if (filterStatus === "semua") return true;
      if (filterStatus === "belum_diisi")     return item.status_str === "belum_diisi" || item.status_sip === "belum_diisi";
      if (filterStatus === "expired")         return item.status_str === "expired" || item.status_sip === "expired";
      if (filterStatus === "hampir_expired")  return item.status_str.includes("kurang") || item.status_sip.includes("kurang");
      if (filterStatus === "aman")            return item.status_str === "aman" && item.status_sip === "aman";
      return true;
    }),
  [items, search, filterStatus]);

  function exportExcel() {
    const rows = filtered.map((item, i) => ({
      No: i + 1,
      Nama: item.nama || "-",
      NIP: item.nip || "-",
      Jabatan: item.jabatan || "-",
      "Jenis Pegawai": item.jenis_pegawai || "-",
      Email: item.email || "-",
      "No HP": item.no_hp || "-",
      "Nomor STR": item.nomor_str || "-",
      "STR Seumur Hidup": item.str_seumur_hidup ? "Ya" : "Tidak",
      "Status STR": strSipLabel(item.status_str),
      "Nomor SIP": item.nomor_sip || "-",
      "Expired SIP": formatDate(item.expired_sip),
      "Status SIP": strSipLabel(item.status_sip),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monitoring STR SIP");
    XLSX.writeFile(wb, `Monitoring-STR-SIP-${Date.now()}.xlsx`);
  }

  const total         = items.length;
  const belumIsi      = items.filter((i) => i.status_str === "belum_diisi" || i.status_sip === "belum_diisi").length;
  const hampirExpired = items.filter((i) => i.status_str.includes("kurang") || i.status_sip.includes("kurang")).length;
  const expired       = items.filter((i) => i.status_str === "expired" || i.status_sip === "expired").length;
  const aman          = items.filter((i) => i.status_str === "aman" && i.status_sip === "aman").length;

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
              <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">Monitoring STR/SIP</h1>
              <p className="mt-1 text-sm text-slate-400">
                Status Surat Tanda Registrasi (STR) dan Surat Izin Praktik (SIP) tenaga kesehatan RSGM.
              </p>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-600 transition hover:bg-violet-100 active:scale-95"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Refresh
            </button>
          </div>

          {/* Stat cards */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatCard title="Total Nakes"      value={total}         color="violet"  />
            <StatCard title="Belum Isi"        value={belumIsi}      color="slate"   />
            <StatCard title="Hampir Expired"   value={hampirExpired} color="amber"   />
            <StatCard title="Expired"          value={expired}       color="rose"    />
            <StatCard title="Aman"             value={aman}          color="emerald" />
          </div>
        </section>

        {/* Table */}
        <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍  Cari nama, NIP, jabatan..."
                className="min-w-[220px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-400 cursor-pointer"
              >
                <option value="semua">Semua Status</option>
                <option value="belum_diisi">Belum Isi</option>
                <option value="hampir_expired">Hampir Expired</option>
                <option value="expired">Expired</option>
                <option value="aman">Aman</option>
              </select>
            </div>
            <button
              onClick={exportExcel}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700 active:scale-95"
            >
              ⬇ Download Excel
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Pegawai", "STR", "SIP", "Kontak"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">Memuat data STR/SIP…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">Tidak ada data sesuai filter.</td></tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-violet-50/40">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800">{item.nama || "-"}</p>
                        <p className="mt-0.5 text-xs text-slate-400">NIP {item.nip || "-"}</p>
                        <p className="text-xs text-slate-400">{item.jabatan || "-"}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-700">{item.nomor_str || "Belum diisi"}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {item.str_seumur_hidup ? "Berlaku seumur hidup" : "Masa berlaku: -"}
                        </p>
                        <span className={`mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${strSipClass(item.status_str)}`}>
                          {strSipLabel(item.status_str)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-700">{item.nomor_sip || "Belum diisi"}</p>
                        <p className="mt-0.5 text-xs text-slate-400">Exp: {formatDate(item.expired_sip)}</p>
                        <span className={`mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${strSipClass(item.status_sip)}`}>
                          {strSipLabel(item.status_sip)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-slate-600">{item.email || "-"}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{item.no_hp || "-"}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
