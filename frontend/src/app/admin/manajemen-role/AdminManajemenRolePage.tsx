"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

type Pegawai = { id: number; username: string; nip?: string | null; nama?: string | null; jabatan?: string | null; role: string; internal_role?: string | null; portal_pegawai_access: boolean; must_change_password: boolean; is_nakes: boolean; };

type Summary = { totalPegawai: number; totalNakes: number; totalPortalAktif: number; totalMustChangePassword: number; };

const roleOptions = ["pegawai", "admin", "sdm", "direksi", "direktur"];
const internalRoleOptions = ["-", "kaur", "kabag", "sdm", "direksi", "direktur"];

export default function AdminManajemenRolePage() {
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("semua");

  async function loadData() {
    try {
      setLoading(true); setError("");
      const res = await fetch(`${API_BASE_URL}/pegawai/admin/list`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal memuat role");
      setPegawai(data?.data?.items || []); setSummary(data?.data?.summary || null);
    } catch (err: any) { setError(err?.message || "Terjadi kesalahan"); } finally { setLoading(false); }
  }

  async function updateRole(item: Pegawai, field: "role" | "internal_role", value: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/pegawai/admin/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value === "-" ? null : value }) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Gagal update role");
      await loadData();
    } catch (err: any) { alert(err.message); }
  }

  useEffect(() => { loadData(); }, []);

  const stats = useMemo(() => ({
    admin: pegawai.filter(p => p.role === "admin" || p.internal_role === "admin").length,
    kaur: pegawai.filter(p => p.internal_role === "kaur").length,
    kabag: pegawai.filter(p => p.internal_role === "kabag").length,
    direktur: pegawai.filter(p => p.internal_role === "direktur" || p.internal_role === "kepala_administrasi").length,
    sdm: pegawai.filter(p => p.role === "sdm" || p.internal_role === "sdm").length,
    direksi: pegawai.filter(p => p.role === "direksi" || p.internal_role === "direksi").length,
  }), [pegawai]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return pegawai.filter(item => {
      const matchSearch = item.nama?.toLowerCase().includes(q) || item.nip?.toLowerCase().includes(q) || item.username?.toLowerCase().includes(q) || item.jabatan?.toLowerCase().includes(q);
      const matchFilter = filter === "semua" ? true : item.role === filter || item.internal_role === filter;
      return matchSearch && matchFilter;
    });
  }, [pegawai, search, filter]);

  if (loading) return <main className="min-h-screen bg-transparent p-3 sm:p-6"><div className="rounded-3xl bg-white p-6">Memuat manajemen role...</div></main>;

  return <main className="min-h-screen bg-transparent p-3 sm:p-6"><section className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-700">Admin</p><h1 className="mt-2 text-3xl font-black text-slate-950">Manajemen Role</h1><p className="mt-2 text-sm text-slate-500">Atur role utama dan internal role agar alur approval KAUR, KABAG, Direktur Administrasi, SDM, dan Direksi berjalan benar.</p></div><button onClick={loadData} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">Refresh</button></div>
    {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
    <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-6"><Card title="Admin" value={stats.admin}/><Card title="Kepala Unit" value={stats.kaur}/><Card title="Kepala Bagian" value={stats.kabag}/><Card title="Direktur Adm" value={stats.direktur}/><Card title="SDM" value={stats.sdm}/><Card title="Direksi" value={stats.direksi}/></div>
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5"><div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Cari nama / NIP / username / jabatan..." className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400"/><select value={filter} onChange={(e)=>setFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"><option value="semua">Semua Role</option>{[...roleOptions, "kaur", "kabag"].map(r=><option key={r} value={r}>{r}</option>)}</select></div></div>
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-4 py-3">Pegawai</th><th className="px-4 py-3">Role Utama</th><th className="px-4 py-3">Internal Role</th><th className="px-4 py-3">Catatan</th></tr></thead><tbody>{filtered.map(item=><tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-4"><p className="font-bold text-slate-950">{item.nama || "-"}</p><p className="text-xs text-slate-500">{item.nip || "-"} • {item.username}</p><p className="mt-1 text-xs text-slate-500">{item.jabatan || "-"}</p></td><td className="px-4 py-4"><select value={item.role} onChange={(e)=>updateRole(item,"role",e.target.value)} className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-700 outline-none">{roleOptions.map(r=><option key={r} value={r}>{r}</option>)}</select></td><td className="px-4 py-4"><select value={item.internal_role || "-"} onChange={(e)=>updateRole(item,"internal_role",e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none">{internalRoleOptions.map(r=><option key={r} value={r}>{r}</option>)}</select></td><td className="px-4 py-4 text-xs text-slate-500">Internal role dipakai untuk akses approval. Role utama dipakai untuk akses portal utama.</td></tr>)}</tbody></table>{filtered.length===0&&<div className="py-10 text-center text-sm text-slate-500">Data role tidak ditemukan.</div>}</div></div>
  </section></main>;
}

function Card({title,value}:{title:string;value:number}){return <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-violet-800"><p className="text-xs font-bold uppercase tracking-[0.12em]">{title}</p><p className="mt-2 text-2xl font-black">{value}</p></div>}
