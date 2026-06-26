"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import Modal from "@/components/ui/Modal";

type Pegawai = {
  id: number;
  username: string;
  nip?: string | null;
  nama?: string | null;
  jabatan?: string | null;
  role: string;
  internal_role?: string | null;
  portal_pegawai_access: boolean;
  must_change_password: boolean;
  is_nakes: boolean;
};

type Summary = {
  totalPegawai: number;
  totalNakes: number;
  totalPortalAktif: number;
  totalMustChangePassword: number;
};

type ResetModal = { open: boolean; target: "satu" | "semua"; pegawai: Pegawai | null };

export default function AdminManajemenUserPage() {
  const [pegawai, setPegawai]         = useState<Pegawai[]>([]);
  const [summary, setSummary]         = useState<Summary | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [search, setSearch]           = useState("");
  const [portalFilter, setPortalFilter] = useState("semua");
  const [nakesFilter, setNakesFilter]   = useState("semua");
  const [resetModal, setResetModal]   = useState<ResetModal>({ open: false, target: "semua", pegawai: null });
  const [resetting, setResetting]     = useState(false);
  const [resetMsg, setResetMsg]       = useState("");
  const [resetMsgType, setResetMsgType] = useState<"success" | "error">("success");
  const tahun                         = new Date().getFullYear();

  const [usernameModal, setUsernameModal] = useState<{ open: boolean; pegawai: Pegawai | null }>({ open: false, pegawai: null });
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameMsg, setUsernameMsg]     = useState("");
  const [usernameMsgType, setUsernameMsgType] = useState<"success" | "error">("success");

  async function loadData() {
    try {
      setLoading(true); setError("");
      const res  = await fetch(`${API_BASE_URL}/pegawai/admin/list`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal memuat data user");
      setPegawai(data?.data?.items || []);
      setSummary(data?.data?.summary || null);
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan");
    } finally { setLoading(false); }
  }

  async function updatePegawai(id: number, body: Partial<Pegawai>) {
    const res  = await fetch(`${API_BASE_URL}/pegawai/admin/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || "Gagal memperbarui data pegawai");
    await loadData();
  }

  async function resetPassword(id: number) {
    if (!confirm("Reset password pegawai ini?")) return;
    try {
      const res  = await fetch(`${API_BASE_URL}/pegawai/admin/${id}/reset-password`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal reset password");
      alert(`Password sementara: ${data?.data?.temporary_password || "pegawai@123"}`);
      await loadData();
    } catch (err: any) { alert(err.message); }
  }

  async function saveUsername() {
    if (!usernameModal.pegawai) return;
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setUsernameMsg("Username tidak boleh kosong."); setUsernameMsgType("error"); return;
    }
    if (trimmed === usernameModal.pegawai.username) {
      setUsernameMsg("Username sama dengan sebelumnya."); setUsernameMsgType("error"); return;
    }
    try {
      setUsernameSaving(true); setUsernameMsg("");
      const res = await fetch(`${API_BASE_URL}/pegawai/admin/${usernameModal.pegawai.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Gagal mengubah username.");
      setUsernameMsg(`Username berhasil diubah menjadi "${trimmed}".`);
      setUsernameMsgType("success");
      await loadData();
      setTimeout(() => { setUsernameModal({ open: false, pegawai: null }); setUsernameMsg(""); }, 2000);
    } catch (err: any) {
      setUsernameMsg(err.message || "Gagal mengubah username."); setUsernameMsgType("error");
    } finally { setUsernameSaving(false); }
  }

  async function konfirmasiResetCuti() {
    try {
      setResetting(true); setResetMsg("");
      const nipAdmin = localStorage.getItem("nip") || "";
      if (!nipAdmin) { setResetMsg("NIP admin tidak ditemukan. Silakan login ulang."); setResetMsgType("error"); return; }
      const body: Record<string, any> = { nip_admin: nipAdmin, tahun };
      if (resetModal.target === "satu" && resetModal.pegawai?.nip) body.nip_pegawai = resetModal.pegawai.nip;
      const res  = await fetch(`${API_BASE_URL}/cuti/admin/reset-kuota-tahunan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setResetMsg(data?.message || "Gagal mereset kuota."); setResetMsgType("error"); return; }
      setResetMsg(data?.message || "Kuota berhasil direset.");
      setResetMsgType("success");
      setTimeout(() => { setResetModal({ open: false, target: "semua", pegawai: null }); setResetMsg(""); }, 2200);
    } catch { setResetMsg("Terjadi kesalahan saat reset."); setResetMsgType("error"); }
    finally { setResetting(false); }
  }

  useEffect(() => { loadData(); }, []);

  const filteredPegawai = useMemo(() => {
    const q = search.toLowerCase();
    return pegawai.filter((item) => {
      const matchSearch = item.nama?.toLowerCase().includes(q) || item.nip?.toLowerCase().includes(q) || item.username?.toLowerCase().includes(q) || item.jabatan?.toLowerCase().includes(q);
      const matchPortal = portalFilter === "semua" ? true : portalFilter === "aktif" ? item.portal_pegawai_access : !item.portal_pegawai_access;
      const matchNakes  = nakesFilter  === "semua" ? true : nakesFilter  === "nakes"  ? item.is_nakes : !item.is_nakes;
      return matchSearch && matchPortal && matchNakes;
    });
  }, [pegawai, search, portalFilter, nakesFilter]);

  if (loading) return <main className="min-h-screen bg-transparent p-3 sm:p-6"><div className="rounded-3xl bg-white p-6">Memuat manajemen user...</div></main>;

  return (
    <main className="min-h-screen bg-transparent p-3 sm:p-6">
      <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-700">Admin</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Manajemen User</h1>
            <p className="mt-2 text-sm text-slate-500">Kelola akses portal pegawai, status nakes, reset password, dan kuota cuti tahunan.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setResetModal({ open: true, target: "semua", pegawai: null })}
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-100 transition"
            >
              Reset Cuti Semua
            </button>
            <button onClick={loadData} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
              Muat Ulang
            </button>
          </div>
        </div>

        {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        {/* Stat Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card title="Total Pegawai"         value={summary?.totalPegawai || 0} />
          <Card title="Akses Portal Aktif"    value={summary?.totalPortalAktif || 0} />
          <Card title="Total Nakes"           value={summary?.totalNakes || 0} />
          <Card title="Perlu Ganti Password"  value={summary?.totalMustChangePassword || 0} />
        </div>

        {/* Filter */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_180px]">
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / NIP / username / jabatan..."
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400" />
            <select value={portalFilter} onChange={(e) => setPortalFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none">
              <option value="semua">Semua Portal</option>
              <option value="aktif">Portal Aktif</option>
              <option value="nonaktif">Portal Nonaktif</option>
            </select>
            <select value={nakesFilter} onChange={(e) => setNakesFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none">
              <option value="semua">Semua Status</option>
              <option value="nakes">Nakes</option>
              <option value="non-nakes">Non Nakes</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Pegawai</th>
                  <th className="px-4 py-3">Nakes</th>
                  <th className="px-4 py-3">Portal</th>
                  <th className="px-4 py-3">Password</th>
                  <th className="px-4 py-3">Cuti Tahunan</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredPegawai.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-950">{item.nama || "-"}</p>
                      <p className="text-xs text-slate-500">{item.nip || "-"} • {item.username}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.jabatan || "-"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => updatePegawai(item.id, { is_nakes: !item.is_nakes })} className={badge(item.is_nakes ? "green" : "gray")}>
                        {item.is_nakes ? "Nakes" : "Non Nakes"}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => updatePegawai(item.id, { portal_pegawai_access: !item.portal_pegawai_access })} className={badge(item.portal_pegawai_access ? "blue" : "red")}>
                        {item.portal_pegawai_access ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <span className={badge(item.must_change_password ? "yellow" : "green")}>
                        {item.must_change_password ? "Wajib Ganti" : "Normal"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setResetModal({ open: true, target: "satu", pegawai: item })}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition"
                      >
                        Reset Cuti {tahun}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setUsernameModal({ open: true, pegawai: item }); setUsernameInput(item.username); setUsernameMsg(""); }}
                          className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                        >
                          Edit Username
                        </button>
                        <button onClick={() => resetPassword(item.id)} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700">
                          Reset Password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPegawai.length === 0 && <div className="py-10 text-center text-sm text-slate-500">Data user tidak ditemukan.</div>}
          </div>
        </div>
      </section>

      {/* Modal Reset Cuti */}
      <Modal
        open={resetModal.open}
        onClose={() => { setResetModal({ open: false, target: "semua", pegawai: null }); setResetMsg(""); }}
        className="max-w-md"
      >
        <div className="p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
              <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-extrabold text-slate-900">Reset Kuota Cuti Tahunan</h3>
            <p className="mt-2 text-sm text-slate-500">
              {resetModal.target === "satu"
                ? <>Anda akan mereset kuota cuti tahunan <strong className="text-slate-800">{tahun}</strong> untuk pegawai:</>
                : <>Anda akan mereset kuota cuti tahunan <strong className="text-slate-800">{tahun}</strong> untuk <strong className="text-slate-800">semua pegawai</strong>.</>}
            </p>
            {resetModal.target === "satu" && resetModal.pegawai && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-sm font-extrabold text-violet-700">
                  {(resetModal.pegawai.nama || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{resetModal.pegawai.nama}</p>
                  <p className="text-xs text-slate-500">NIP {resetModal.pegawai.nip || "-"} · {resetModal.pegawai.jabatan || "-"}</p>
                </div>
              </div>
            )}
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-semibold">Apa yang terjadi setelah reset?</p>
              <p className="mt-1 text-amber-700">
                Semua data cuti tahunan {tahun} yang sudah disetujui akan ditandai sebagai "direset" sehingga
                kuota cuti kembali ke <strong>12 hari</strong>. Data cuti tidak dihapus, hanya tidak dihitung dalam kuota.
              </p>
            </div>
            {resetMsg && (
              <div className={`mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${resetMsgType === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
                {resetMsg}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setResetModal({ open: false, target: "semua", pegawai: null }); setResetMsg(""); }}
                disabled={resetting}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Batal
              </button>
              <button
                onClick={konfirmasiResetCuti}
                disabled={resetting}
                className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-60 transition"
              >
                {resetting ? "Mereset..." : "Ya, Reset Sekarang"}
              </button>
            </div>
        </div>
      </Modal>
      {/* Modal Edit Username */}
      <Modal
        open={usernameModal.open && !!usernameModal.pegawai}
        onClose={() => { setUsernameModal({ open: false, pegawai: null }); setUsernameMsg(""); }}
        className="max-w-sm"
      >
        {usernameModal.pegawai && (
          <div className="p-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Admin</p>
            <h3 className="mt-1 text-xl font-extrabold text-slate-900">Edit Username</h3>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Nama Pegawai</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">{usernameModal.pegawai.nama || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">NIP</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">{usernameModal.pegawai.nip || "-"}</p>
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Username Baru <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => { setUsernameInput(e.target.value); setUsernameMsg(""); }}
                onKeyDown={(e) => e.key === "Enter" && saveUsername()}
                placeholder="Masukkan username baru"
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <span className="font-bold">Perhatian:</span> Password pegawai <span className="font-bold">tidak ikut berubah</span> saat username diubah. Jika pegawai tidak bisa login, klik <span className="font-bold">Reset Password</span> untuk mengatur ulang password-nya.
            </div>

            {usernameMsg && (
              <div className={`mt-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
                usernameMsgType === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}>
                {usernameMsg}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setUsernameModal({ open: false, pegawai: null }); setUsernameMsg(""); }}
                disabled={usernameSaving}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition"
              >
                Batal
              </button>
              <button
                onClick={saveUsername}
                disabled={usernameSaving}
                className="rounded-xl bg-violet-700 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-60 transition active:scale-95"
              >
                {usernameSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5 text-violet-800">
      <p className="text-xs font-bold uppercase tracking-[0.12em]">{title}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function badge(color: "green" | "gray" | "blue" | "red" | "yellow") {
  const map = { green: "bg-emerald-100 text-emerald-700", gray: "bg-slate-100 text-slate-600", blue: "bg-sky-100 text-sky-700", red: "bg-rose-100 text-rose-700", yellow: "bg-amber-100 text-amber-700" };
  return `rounded-full px-3 py-1 text-xs font-bold ${map[color]}`;
}
