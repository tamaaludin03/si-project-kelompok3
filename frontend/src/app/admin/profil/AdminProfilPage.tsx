"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

type User = { id?: number; nama?: string; username?: string; nip?: string; jabatan?: string; role?: string; internal_role?: string | null; };

export default function AdminProfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<User>({});
  const [showPwForm, setShowPwForm] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      const parsed = raw ? JSON.parse(raw) : {};
      setUser({
        ...parsed,
        nip: parsed?.nip || localStorage.getItem("nip") || "-",
        role: parsed?.role || localStorage.getItem("role") || "-",
        internal_role: parsed?.internal_role || localStorage.getItem("internal_role") || "-",
      });
    } catch {
      setUser({});
    }
  }, []);

  async function handleChangePw() {
    if (!oldPw || !newPw || !confirmPw) { setPwError("Semua kolom wajib diisi."); return; }
    if (newPw !== confirmPw) { setPwError("Konfirmasi password tidak cocok."); return; }
    setPwLoading(true); setPwMsg(""); setPwError("");
    try {
      const token = localStorage.getItem("token");
      const username = user.username || localStorage.getItem("username");
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username, oldPassword: oldPw, newPassword: newPw, confirmPassword: confirmPw }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Gagal mengubah password.");
      setPwMsg("Password berhasil diubah.");
      setOldPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => { setShowPwForm(false); setPwMsg(""); }, 1500);
    } catch (e: any) { setPwError(e.message || "Terjadi kesalahan."); }
    finally { setPwLoading(false); }
  }

  function logout() {
    localStorage.clear();
    router.push("/login");
  }

  const infoFields = [
    { label: "Nama",          value: user.nama },
    { label: "Username",      value: user.username },
    { label: "NIP",           value: user.nip },
    { label: "Jabatan",       value: user.jabatan },
    { label: "Role",          value: user.role },
    { label: "Internal Role", value: user.internal_role },
  ];

  return (
    <main className="min-h-screen space-y-5 bg-transparent p-3 sm:p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Informasi Akun */}
      <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Admin</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Profil Admin</h1>
        <p className="mt-1 text-sm text-slate-400">Informasi akun admin yang sedang digunakan.</p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {infoFields.map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
              <p className="mt-1.5 text-sm font-bold text-slate-900">{value || "-"}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 active:scale-95"
          >
            Logout
          </button>
        </div>
      </section>

      {/* Ganti Password */}
      <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Keamanan</p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-900">Ganti Password</h2>
          </div>
          {!showPwForm && (
            <button
              type="button"
              onClick={() => setShowPwForm(true)}
              className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-600 transition hover:bg-violet-100 active:scale-95"
            >
              Ubah Password
            </button>
          )}
        </div>

        {showPwForm && (
          <div className="mt-5 max-w-md space-y-4">
            {[
              { label: "Password Lama",           val: oldPw,     fn: setOldPw     },
              { label: "Password Baru",            val: newPw,     fn: setNewPw     },
              { label: "Konfirmasi Password Baru", val: confirmPw, fn: setConfirmPw },
            ].map(({ label, val, fn }) => (
              <div key={label}>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</label>
                <input
                  type="password"
                  value={val}
                  onChange={(e) => fn(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-400/10"
                />
              </div>
            ))}

            {pwError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600">{pwError}</div>
            )}
            {pwMsg && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700">{pwMsg}</div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => { setShowPwForm(false); setOldPw(""); setNewPw(""); setConfirmPw(""); setPwMsg(""); setPwError(""); }}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleChangePw}
                disabled={pwLoading}
                className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50 active:scale-95"
              >
                {pwLoading ? "Menyimpan…" : "Simpan Password"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
