"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

type AuditLog = { id: number; actor_nip?: string | null; actor_name?: string | null; actor_role?: string | null; action: string; entity: string; entity_id?: string | null; description?: string | null; created_at: string; };

export default function AdminNotifikasiPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("semua");
  const [search, setSearch] = useState("");

  async function loadData() {
    try {
      setLoading(true); setError("");
      const res = await fetch(`${API_BASE_URL}/audit-log`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal memuat notifikasi/audit log");
      setLogs(data?.data || []);
    } catch (err: any) { setError(err?.message || "Terjadi kesalahan"); } finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  const stats = useMemo(() => ({
    total: logs.length,
    approval: logs.filter(l => l.action.toLowerCase().includes("approve") || l.action.toLowerCase().includes("reject")).length,
    surat: logs.filter(l => l.action.toLowerCase().includes("surat") || l.action.toLowerCase().includes("pdf")).length,
    user: logs.filter(l => l.action.toLowerCase().includes("update") || l.action.toLowerCase().includes("reset")).length,
  }), [logs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter(log => {
      const a = log.action.toLowerCase();
      const matchFilter = filter === "semua" ? true : filter === "approval" ? (a.includes("approve") || a.includes("reject")) : filter === "surat" ? (a.includes("surat") || a.includes("pdf")) : filter === "user" ? (a.includes("update") || a.includes("reset")) : true;
      const matchSearch = log.action.toLowerCase().includes(q) || log.description?.toLowerCase().includes(q) || log.actor_name?.toLowerCase().includes(q) || log.entity?.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [logs, filter, search]);

  if (loading) return <main className="min-h-screen bg-transparent p-3 sm:p-6"><div className="rounded-3xl bg-white p-4 sm:p-6">Memuat notifikasi...</div></main>;

  return <main className="min-h-screen bg-transparent p-3 sm:p-6"><section className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-700">Admin</p><h1 className="mt-2 text-3xl font-black text-slate-950">Notifikasi & Audit Log</h1><p className="mt-2 text-sm text-slate-500">Pantau aktivitas penting sistem: approval, perubahan role, reset password, penerbitan surat, dan download PDF.</p></div><button onClick={loadData} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">Muat Ulang</button></div>{error&&<div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}<div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4"><Card title="Total Log" value={stats.total}/><Card title="Approval" value={stats.approval}/><Card title="Surat/PDF" value={stats.surat}/><Card title="User/Role" value={stats.user}/></div><div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5"><div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Cari aksi / deskripsi / aktor..." className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400"/><select value={filter} onChange={(e)=>setFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"><option value="semua">Semua Aktivitas</option><option value="approval">Approval</option><option value="surat">Surat/PDF</option><option value="user">User/Role</option></select></div></div><div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">{filtered.map(log=><div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${badge(log.action)}`}>{log.action}</span><p className="mt-2 font-bold text-slate-950">{log.description || "-"}</p><p className="mt-1 text-xs text-slate-500">Entity: {log.entity} #{log.entity_id || "-"} • Actor: {log.actor_name || log.actor_role || "-"}</p><p className="mt-2 text-xs font-bold text-slate-500">{formatDate(log.created_at)}</p></div>)}{filtered.length===0&&<div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">Tidak ada log sesuai filter.</div>}</div></section></main>;
}
function Card({title,value}:{title:string;value:number}){return <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-violet-800"><p className="text-xs font-bold uppercase tracking-[0.12em]">{title}</p><p className="mt-2 text-2xl font-black">{value}</p></div>}
function badge(action:string){const a=action.toLowerCase(); if(a.includes("reset"))return"bg-amber-100 text-amber-700"; if(a.includes("update"))return"bg-sky-100 text-sky-700"; if(a.includes("approve")||a.includes("terbitkan"))return"bg-emerald-100 text-emerald-700"; if(a.includes("reject")||a.includes("tolak"))return"bg-rose-100 text-rose-700"; return"bg-slate-100 text-slate-700"}
function formatDate(value:string){const d=new Date(value); if(Number.isNaN(d.getTime()))return"-"; return d.toLocaleString("id-ID",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}
