"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { formatJenis } from "@/lib/labels";

type Pengajuan = {
  id: number;
  kategori: "Cuti" | "Izin";
  pegawai?: { nama?: string | null; nip?: string | null; jabatan?: string | null } | null;
  nama?: string | null;
  nip?: string | null;
  jabatan?: string | null;
  jenis?: string | null;
  jenis_cuti?: string | null;
  jenis_izin?: string | null;
  tanggal_mulai?: string | null;
  tanggal_selesai?: string | null;
  tanggal?: string | null;
  status?: string | null;
  alasan?: string | null;
  lampiran?: any[];
  surat_cuti_diterbitkan?: boolean;
  nomor_surat?: string | null;
  tanggal_surat?: string | null;
};

export default function AdminDataPengajuanPage() {
  const [items, setItems] = useState<Pengajuan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [kategori, setKategori] = useState("semua");
  const [status, setStatus] = useState("semua");

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE_URL}/cuti/admin/all-pengajuan`, { headers, cache: "no-store" });
      const json = await res.json().catch(() => null);
      const cutiRaw: any[] = Array.isArray(json?.data?.cuti) ? json.data.cuti : [];
      const izinRaw: any[] = Array.isArray(json?.data?.izin) ? json.data.izin : [];
      const cuti = cutiRaw.map((x: any) => ({ ...x, kategori: "Cuti" as const }));
      const izin = izinRaw.map((x: any) => ({ ...x, kategori: "Izin" as const }));
      setItems([...cuti, ...izin].sort((a, b) => new Date(b.created_at || b.tanggal_mulai || 0).getTime() - new Date(a.created_at || a.tanggal_mulai || 0).getTime()));
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const stats = useMemo(() => ({
    total: items.length,
    cuti: items.filter(i => i.kategori === "Cuti").length,
    izin: items.filter(i => i.kategori === "Izin").length,
    pending: items.filter(i => normalize(i.status).includes("pending")).length,
    final: items.filter(i => normalize(i.status).includes("final")).length,
    ditolak: items.filter(i => normalize(i.status).includes("tolak") || normalize(i.status).includes("reject")).length,
    surat: items.filter(i => i.surat_cuti_diterbitkan).length,
  }), [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => {
      const pegawai = item.pegawai;
      const nama = pegawai?.nama || item.nama || "";
      const nip = pegawai?.nip || item.nip || "";
      const jabatan = pegawai?.jabatan || item.jabatan || "";
      const jenis = item.jenis || item.jenis_cuti || item.jenis_izin || "";
      const matchSearch = nama.toLowerCase().includes(q) || nip.toLowerCase().includes(q) || jabatan.toLowerCase().includes(q) || jenis.toLowerCase().includes(q);
      const matchKategori = kategori === "semua" ? true : item.kategori.toLowerCase() === kategori;
      const matchStatus = status === "semua" ? true : normalize(item.status) === status;
      return matchSearch && matchKategori && matchStatus;
    });
  }, [items, search, kategori, status]);

  const statuses = useMemo(() => Array.from(new Set(items.map(i => normalize(i.status)).filter(Boolean))).sort(), [items]);

  if (loading) return <main className="min-h-screen bg-transparent p-3 sm:p-6"><div className="rounded-3xl bg-white p-6">Memuat data pengajuan...</div></main>;

  return <main className="min-h-screen bg-transparent p-3 sm:p-6"><section className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-700">Admin</p><h1 className="mt-2 text-3xl font-black text-slate-950">Data Pengajuan</h1><p className="mt-2 text-sm text-slate-500">Monitoring seluruh pengajuan cuti dan izin, status approval, lampiran, dan surat cuti.</p></div><button onClick={loadData} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">Muat Ulang</button></div>{error&&<div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}<div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-7"><Card title="Total" value={stats.total}/><Card title="Cuti" value={stats.cuti}/><Card title="Izin" value={stats.izin}/><Card title="Menunggu" value={stats.pending}/><Card title="Final" value={stats.final}/><Card title="Ditolak" value={stats.ditolak}/><Card title="Surat" value={stats.surat}/></div><div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5"><div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_220px]"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Cari nama / NIP / jabatan / jenis..." className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400"/><select value={kategori} onChange={(e)=>setKategori(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"><option value="semua">Semua Kategori</option><option value="cuti">Cuti</option><option value="izin">Izin</option></select><select value={status} onChange={(e)=>setStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"><option value="semua">Semua Status</option>{statuses.map(s=><option key={s} value={s}>{formatJenis(s)}</option>)}</select></div></div><div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-4 py-3">Pegawai</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Jenis</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Surat</th><th className="px-4 py-3">Lampiran</th></tr></thead><tbody>{filtered.map(item=>{const pegawai=item.pegawai; const jenis=item.jenis||item.jenis_cuti||item.jenis_izin||"-"; const tanggal=formatRange(item); return <tr key={`${item.kategori}-${item.id}`} className="border-t border-slate-100"><td className="px-4 py-4"><p className="font-bold text-slate-950">{pegawai?.nama||item.nama||"-"}</p><p className="text-xs text-slate-500">{pegawai?.nip||item.nip||"-"}</p><p className="mt-1 text-xs text-slate-500">{pegawai?.jabatan||item.jabatan||"-"}</p></td><td className="px-4 py-4"><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">{item.kategori}</span></td><td className="px-4 py-4 font-semibold text-slate-800">{formatJenis(jenis)}</td><td className="px-4 py-4 text-slate-600">{tanggal}</td><td className="px-4 py-4"><span className={statusBadge(item.status)}>{formatJenis(item.status)}</span></td><td className="px-4 py-4 text-xs text-slate-600">{item.kategori === "Cuti" ? (item.surat_cuti_diterbitkan ? <div><span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-700">Terbit</span><p className="mt-1">{item.nomor_surat || "-"}</p></div> : <span className="rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-700">Belum</span>) : "-"}</td><td className="px-4 py-4">{Array.isArray(item.lampiran) ? item.lampiran.length : 0} file</td></tr>})}</tbody></table>{filtered.length===0&&<div className="py-10 text-center text-sm text-slate-500">Data pengajuan tidak ditemukan. Jika kosong, pastikan endpoint admin cuti/izin tersedia.</div>}</div></div></section></main>;
}
function normalize(v?: string | null){return (v||"").toLowerCase().trim()}
function formatDate(v?: string | null){if(!v)return"-";const d=new Date(v);if(Number.isNaN(d.getTime()))return v;return d.toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"})}
function formatRange(item:Pengajuan){const start=item.tanggal_mulai||item.tanggal;const end=item.tanggal_selesai;return end?`${formatDate(start)} - ${formatDate(end)}`:formatDate(start)}
function statusBadge(v?:string|null){const s=normalize(v);let color="bg-slate-100 text-slate-700";if(s.includes("pending"))color="bg-amber-100 text-amber-700";if(s.includes("setuju")||s.includes("approve")||s.includes("final"))color="bg-emerald-100 text-emerald-700";if(s.includes("tolak")||s.includes("reject"))color="bg-rose-100 text-rose-700";return`rounded-full px-3 py-1 text-xs font-bold ${color}`}
function Card({title,value}:{title:string;value:number}){return <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-violet-800"><p className="text-xs font-bold uppercase tracking-[0.12em]">{title}</p><p className="mt-2 text-2xl font-black">{value}</p></div>}
