"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

type Profile = {
  nama?: string; nip?: string; jabatan?: string; unit?: string;
  role?: string; internal_role?: string; username?: string;
};

export default function DireksiProfilPage() {
  const router = useRouter();
  const [profile, setProfile]           = useState<Profile>({});
  const [oldPassword, setOldPassword]   = useState("");
  const [newPassword, setNewPassword]   = useState("");
  const [confirmPw, setConfirmPw]       = useState("");
  const [pwLoading, setPwLoading]       = useState(false);
  const [pwMsg, setPwMsg]               = useState("");
  const [pwError, setPwError]           = useState("");
  const [showPwForm, setShowPwForm]     = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user") || localStorage.getItem("simciUser");
      const parsed = raw ? JSON.parse(raw) : {};
      setProfile({
        nama:          parsed?.nama          || localStorage.getItem("nama")          || "-",
        nip:           parsed?.nip           || localStorage.getItem("nip")           || "-",
        jabatan:       parsed?.jabatan       || localStorage.getItem("jabatan")       || "-",
        unit:          parsed?.unit          || localStorage.getItem("unit")          || "-",
        role:          parsed?.role          || localStorage.getItem("role")          || "-",
        internal_role: parsed?.internal_role || localStorage.getItem("internal_role") || "-",
        username:      parsed?.username      || localStorage.getItem("username")      || "-",
      });
    } catch { setProfile({}); }
  }, []);

  async function handleChangePassword() {
    if (!newPassword || !oldPassword) { setPwError("Semua kolom wajib diisi."); return; }
    if (newPassword !== confirmPw) { setPwError("Konfirmasi password tidak cocok."); return; }
    setPwLoading(true); setPwMsg(""); setPwError("");
    try {
      const token = localStorage.getItem("token");
      const username = profile.username || localStorage.getItem("username");
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username, oldPassword, newPassword, confirmPassword: confirmPw }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Gagal mengubah password.");
      setPwMsg("Password berhasil diubah.");
      setOldPassword(""); setNewPassword(""); setConfirmPw("");
      setTimeout(() => { setShowPwForm(false); setPwMsg(""); }, 1500);
    } catch (e: any) { setPwError(e.message || "Terjadi kesalahan."); }
    finally { setPwLoading(false); }
  }

  function handleLogout() {
    ["token","user","simciUser","nip","nama","role","jabatan","unit","internal_role","username"]
      .forEach(k => localStorage.removeItem(k));
    router.push("/login");
  }

  const infoFields: { label: string; value?: string }[] = [
    { label: "Nama Lengkap",   value: profile.nama          },
    { label: "NIP",            value: profile.nip           },
    { label: "Jabatan",        value: profile.jabatan       },
    { label: "Unit",           value: profile.unit          },
    { label: "Username",       value: profile.username      },
    { label: "Role",           value: profile.internal_role || profile.role },
  ];

  return (
    <main className="min-h-screen space-y-5 bg-transparent p-3 sm:p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-xl font-extrabold text-violet-700">
              {(profile.nama || "D").split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase()}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Direktur Utama</p>
              <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900">
                {profile.nama || "Profil Direktur Utama"}
              </h1>
              <p className="mt-0.5 text-sm text-slate-400">{profile.jabatan || "-"} · {profile.unit || "-"}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 active:scale-95"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Keluar
          </button>
        </div>
      </section>

      {/* Info */}
      <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Informasi Akun</p>
        <h2 className="mt-1 text-lg font-extrabold text-slate-900">Data Profil</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {infoFields.map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
              <p className="mt-1.5 text-sm font-bold text-slate-900">{value || "-"}</p>
            </div>
          ))}
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
              { label: "Password Lama",            val: oldPassword, fn: setOldPassword },
              { label: "Password Baru",             val: newPassword, fn: setNewPassword },
              { label: "Konfirmasi Password Baru",  val: confirmPw,   fn: setConfirmPw  },
            ].map(({ label, val, fn }) => (
              <div key={label}>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</label>
                <input
                  type="password"
                  value={val}
                  onChange={e => fn(e.target.value)}
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
                onClick={() => { setShowPwForm(false); setOldPassword(""); setNewPassword(""); setConfirmPw(""); setPwMsg(""); setPwError(""); }}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 active:scale-95"
              >
                Batal
              </button>
              <button
                onClick={handleChangePassword}
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
