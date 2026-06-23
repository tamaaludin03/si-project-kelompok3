"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { AuthToast } from "@/components/ui/AuthToast";

function getDashboardUrl(user: { role?: string; internal_role?: string | null }): string {
  const role = String(user.internal_role || user.role || "pegawai").toLowerCase().trim();
  switch (role) {
    case "kaur":                   return "/kaur/dashboard";
    case "kabag":                  return "/kabag/dashboard";
    case "direktur":
    case "direktur_administrasi":
    case "direktur-administrasi":  return "/direktur/dashboard";
    case "kepala_administrasi":
    case "kepala-administrasi":    return "/kepala-administrasi/dashboard";
    case "sdm":                    return "/sdm/dashboard";
    case "direksi":                return "/direksi/dashboard";
    case "admin":
    case "it":                     return "/admin/dashboard";
    default:                       return "/dashboard";
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ title: string; subtitle?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionCleared, setSessionCleared] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("simciUser");
      localStorage.removeItem("username");
      localStorage.removeItem("nip");
      localStorage.removeItem("nama");
      localStorage.removeItem("role");
      localStorage.removeItem("jabatan");
      localStorage.removeItem("internal_role");
    } catch (e) {
      console.error("Gagal membersihkan session lokal", e);
    } finally {
      setSessionCleared(true);
      setTimeout(() => setMounted(true), 60);
    }
  }, []);

  // Tampilkan toast logout di halaman login (setelah redirect dari proses logout)
  useEffect(() => {
    try {
      if (sessionStorage.getItem("logout_toast") === "1") {
        sessionStorage.removeItem("logout_toast");
        setToast({ title: "Berhasil logout", subtitle: "Sampai jumpa lagi" });
      }
    } catch {}
  }, []);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setToast(null);

    if (!username.trim() || !password.trim()) {
      setError("Username dan password wajib diisi.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Username atau password tidak sesuai.");
      }

      if (!data?.access_token || !data?.user) {
        throw new Error("Response login tidak lengkap dari server.");
      }

      const user = data.user;

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("simciUser", JSON.stringify(user));
      localStorage.setItem("username", String(user.username || ""));
      localStorage.setItem("nip", String(user.nip || ""));
      localStorage.setItem("nama", String(user.nama || ""));
      localStorage.setItem("role", String(user.role || "pegawai"));
      localStorage.setItem("jabatan", String(user.jabatan || ""));
      localStorage.setItem("unit", String(user.unit || ""));

      if (user.internal_role) {
        localStorage.setItem("internal_role", String(user.internal_role));
      } else {
        localStorage.removeItem("internal_role");
      }

      if (user.jenis_kelamin) {
        localStorage.setItem("jenis_kelamin", String(user.jenis_kelamin));
      } else {
        localStorage.removeItem("jenis_kelamin");
      }

      setToast({ title: "Login berhasil", subtitle: `Selamat datang, ${user.nama || user.username}` });

      setTimeout(() => {
        router.replace(getDashboardUrl(user));
      }, 700);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan saat login.");
      setToast(null);
    } finally {
      setLoading(false);
    }
  };

  if (!sessionCleared) return null;

  return (
    <>
      <style>{styles}</style>

      <main className="login-root">

        {/* ── Background foto gedung RSGM ── */}
        <div className="bg-photo" aria-hidden="true">
          <Image
            src="/rsgm-bg.jpg"
            alt=""
            fill
            priority
            quality={90}
            style={{ objectFit: "cover", objectPosition: "center 30%" }}
          />
        </div>

        {/* ── Overlay: putih tipis agar foto tetap terlihat ── */}
        <div className="bg-overlay" aria-hidden="true" />

        {/* ── Toast sukses (login & logout) ── */}
        <AuthToast
          open={!!toast}
          title={toast?.title ?? ""}
          subtitle={toast?.subtitle}
          onClose={() => setToast(null)}
        />

        {/* ── Card form — tengah layar ── */}
        <div className={`login-center${mounted ? " mounted" : ""}`}>
          <section className="login-card" aria-label="Form login SIMCI">

            {/* Logo + judul */}
            <div className="card-head">
              <div className="logo-ring">
                <Image
                  src="/logo.png"
                  alt="Logo RSGM"
                  width={52}
                  height={52}
                  style={{ objectFit: "contain" }}
                  priority
                />
              </div>
              <h1 className="card-title">Masuk</h1>
              <p className="card-subtitle">
                Gunakan username dan password untuk masuk ke dashboard.
              </p>
            </div>

            {/* Divider */}
            <div className="card-divider" aria-hidden="true" />

            {/* Form */}
            <form onSubmit={handleLogin} noValidate>

              {error && (
                <div className="form-error" role="alert">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <circle cx="7" cy="7" r="6.25" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M7 4v3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="7" cy="9.8" r=".7" fill="currentColor"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Username */}
              <div className="field">
                <label className="field-label" htmlFor="username">USERNAME</label>
                <div className="input-wrap">
                  <span className="input-icon" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <circle cx="7.5" cy="5" r="2.75" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M2 13c0-2.485 2.462-4.5 5.5-4.5S13 10.515 13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(""); }}
                    placeholder="Masukkan username"
                    className="field-input"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="field">
                <label className="field-label" htmlFor="password">PASSWORD</label>
                <div className="input-wrap">
                  <span className="input-icon" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <rect x="2.5" y="6.5" width="10" height="7" rx="1.75" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M4.5 6.5V4.75a3 3 0 016 0V6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      <circle cx="7.5" cy="10" r=".875" fill="currentColor"/>
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="Masukkan password"
                    className="field-input"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="toggle-pw"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? (
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path d="M1 7.5S3.5 3 7.5 3s6.5 4.5 6.5 4.5S11.5 12 7.5 12 1 7.5 1 7.5z" stroke="currentColor" strokeWidth="1.4"/>
                        <circle cx="7.5" cy="7.5" r="1.75" stroke="currentColor" strokeWidth="1.4"/>
                        <path d="M2 2l11 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path d="M1 7.5S3.5 3 7.5 3s6.5 4.5 6.5 4.5S11.5 12 7.5 12 1 7.5 1 7.5z" stroke="currentColor" strokeWidth="1.4"/>
                        <circle cx="7.5" cy="7.5" r="1.75" stroke="currentColor" strokeWidth="1.4"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Lupa password */}
              <div className="forgot-row">
                <button
                  type="button"
                  onClick={() => router.push("/forgot-password")}
                  className="forgot-btn"
                >
                  Lupa password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="submit-btn"
              >
                {loading ? (
                  <span className="btn-inner">
                    <span className="spinner" aria-hidden="true" />
                    Memproses...
                  </span>
                ) : (
                  "Masuk"
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="card-footer">
              &copy; {new Date().getFullYear()} RSGM &mdash; Sistem Informasi Manajemen Cuti &amp; Izin
            </p>
          </section>
        </div>
      </main>
    </>
  );
}

/* ─────────────────────────────────────────
   STYLES
───────────────────────────────────────── */
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

:root {
  --v900: #2d1260;
  --v800: #3b1a84;
  --v700: #5b21b6;
  --v600: #7c3aed;
  --v500: #8b5cf6;
  --v400: #a78bfa;
  --v300: #c4b5fd;
  --v200: #ddd6fe;
  --v100: #ede9fe;
  --v50:  #f5f3ff;

  --e700: #047857;
  --e600: #059669;
  --e200: #a7f3d0;
  --e100: #d1fae5;

  --r700: #be123c;
  --r100: #ffe4e6;
  --r50:  #fff1f2;

  --n950: #020617;
  --n900: #0f172a;
  --n700: #334155;
  --n600: #475569;
  --n500: #64748b;
  --n400: #94a3b8;
  --n200: #e2e8f0;
  --n100: #f1f5f9;
  --n50:  #f8fafc;

  --fd: 'Plus Jakarta Sans', sans-serif;
  --fb: 'DM Sans', sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Root ── */
.login-root {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--fb);
  overflow: hidden;
}

/* ── Background ── */
.bg-photo {
  position: fixed;
  inset: 0;
  z-index: 0;
}

/* Overlay: sedikit lebih terang dari aslinya agar card tetap terbaca
   tapi foto gedung masih jelas terlihat */
.bg-overlay {
  position: fixed;
  inset: 0;
  z-index: 1;
  background: rgba(240, 236, 255, 0.48);
}

/* ── Toast ── */
.toast-success {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 18px;
  border-radius: 16px;
  border: 1px solid var(--e200);
  background: white;
  box-shadow: 0 8px 28px rgba(16,185,129,.14), 0 2px 8px rgba(15,23,42,.07);
  font-family: var(--fd);
  font-size: 13px;
  font-weight: 600;
  color: var(--e700);
  animation: toast-in .35s cubic-bezier(.34,1.56,.64,1);
}
@keyframes toast-in {
  from { transform: translateY(-10px) scale(.95); opacity: 0; }
  to   { transform: translateY(0) scale(1); opacity: 1; }
}

/* ── Center wrapper ── */
.login-center {
  position: relative;
  z-index: 10;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  opacity: 0;
  transform: translateY(14px) scale(.985);
  transition: opacity .5s cubic-bezier(.4,0,.2,1), transform .5s cubic-bezier(.4,0,.2,1);
}
.login-center.mounted {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* ── Card ── */
.login-card {
  width: 100%;
  max-width: 448px;    /* max-w-md — tidak berubah */
  background: rgba(255, 255, 255, 0.84);
  backdrop-filter: blur(28px) saturate(1.5);
  -webkit-backdrop-filter: blur(28px) saturate(1.5);
  border: 1px solid rgba(255,255,255,0.72);
  border-radius: 32px;
  padding: 36px 32px 28px;
  box-shadow:
    0 0 0 1px rgba(196,181,253,0.22),
    0 4px 6px  rgba(15,23,42,.04),
    0 14px 36px rgba(91,33,182,.12),
    0 40px 72px rgba(15,23,42,.09);
}

/* ── Card head ── */
.card-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 24px;
}
.logo-ring {
  width: 78px; height: 78px;
  border-radius: 22px;
  background: white;
  border: 1.5px solid var(--v100);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  box-shadow:
    0 0 0 6px rgba(167,139,250,.10),
    0 4px 14px rgba(91,33,182,.11);
  transition: box-shadow .25s, transform .25s;
}
.logo-ring:hover {
  box-shadow: 0 0 0 8px rgba(167,139,250,.16), 0 6px 18px rgba(91,33,182,.16);
  transform: translateY(-1px);
}
.card-eyebrow {
  font-family: var(--fd);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: var(--v600);
  margin-bottom: 8px;
}
.card-title {
  font-family: var(--fd);
  font-size: 24px;
  font-weight: 800;
  color: var(--n950);
  letter-spacing: -.022em;
  line-height: 1.15;
}
.card-subtitle {
  margin-top: 8px;
  font-size: 13.5px;
  color: var(--n500);
  line-height: 1.6;
  max-width: 300px;
}

/* ── Divider ── */
.card-divider {
  height: 1px;
  margin-bottom: 24px;
  border-radius: 99px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(167,139,250,.5),
    rgba(167,243,208,.5),
    transparent
  );
}

/* ── Error ── */
.form-error {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 11px 14px;
  border-radius: 14px;
  border: 1px solid var(--r100);
  background: var(--r50);
  font-size: 13px;
  font-weight: 500;
  color: var(--r700);
  margin-bottom: 16px;
  animation: shake .28s ease;
}
@keyframes shake {
  0%,100% { transform: translateX(0); }
  25%,75%  { transform: translateX(-3px); }
  50%      { transform: translateX(3px); }
}

/* ── Fields ── */
.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 16px;
}
.field-label {
  font-family: var(--fd);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .10em;
  color: var(--n600);
}
.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.input-icon {
  position: absolute;
  left: 13px;
  color: var(--n400);
  pointer-events: none;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.field-input {
  width: 100%;
  padding: 11.5px 14px 11.5px 40px;
  border-radius: 14px;
  border: 1.5px solid var(--v200);
  background: rgba(255,255,255,.72);
  font-family: var(--fb);
  font-size: 13.5px;
  color: var(--n900);
  outline: none;
  transition: border-color .18s, box-shadow .18s, background .18s;
}
.field-input::placeholder { color: var(--n400); }
.field-input:focus {
  border-color: var(--v500);
  background: rgba(255,255,255,.96);
  box-shadow:
    0 0 0 3.5px rgba(139,92,246,.14),
    0 2px 6px rgba(91,33,182,.07);
}

/* Toggle password */
.toggle-pw {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--n400);
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 8px;
  transition: color .15s, background .15s;
}
.toggle-pw:hover { color: var(--v600); background: var(--v50); }

/* Lupa password */
.forgot-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
  margin-top: -4px;
}
.forgot-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--fd);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--v700);
  padding: 2px 0;
  transition: color .15s;
}
.forgot-btn:hover { color: var(--v900); }

/* Submit */
.submit-btn {
  width: 100%;
  padding: 13px 20px;
  border-radius: 16px;
  border: none;
  background: linear-gradient(135deg, var(--v700) 0%, var(--v800) 100%);
  font-family: var(--fd);
  font-size: 14px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  letter-spacing: .01em;
  box-shadow:
    0 1px 0 rgba(255,255,255,.15) inset,
    0 4px 14px rgba(91,33,182,.32),
    0 1px 3px rgba(15,23,42,.12);
  transition: background .18s, box-shadow .18s, transform .12s;
}
.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--v600) 0%, var(--v700) 100%);
  box-shadow:
    0 1px 0 rgba(255,255,255,.15) inset,
    0 6px 20px rgba(91,33,182,.38),
    0 1px 3px rgba(15,23,42,.12);
  transform: translateY(-1px);
}
.submit-btn:active:not(:disabled) {
  transform: scale(.99);
  box-shadow:
    0 1px 0 rgba(255,255,255,.12) inset,
    0 2px 8px rgba(91,33,182,.20);
}
.submit-btn:disabled { opacity: .6; cursor: not-allowed; }

.btn-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* Spinner */
.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,.30);
  border-top-color: white;
  border-radius: 50%;
  animation: spin .65s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Footer */
.card-footer {
  margin-top: 22px;
  text-align: center;
  font-family: var(--fd);
  font-size: 11px;
  font-weight: 600;
  color: var(--n400);
  letter-spacing: .03em;
}

/* Responsive */
@media (max-width: 480px) {
  .login-card {
    padding: 28px 22px 24px;
    border-radius: 26px;
  }
}
`;
