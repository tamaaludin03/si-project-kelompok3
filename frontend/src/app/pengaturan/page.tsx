"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

type FormState = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;
import { API_BASE_URL } from "@/lib/api";

export default function PengaturanPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pegawai, setPegawai] = useState<{
    nip: string;
    nama: string;
    role: string;
    jabatan: string;
  } | null>(null);

  const [form, setForm] = useState<FormState>({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [serverMessage, setServerMessage] = useState("");
  const [serverError, setServerError] = useState("");

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setMounted(true);

    const nip = localStorage.getItem("nip");
    const nama = localStorage.getItem("nama") || "";
    const role = localStorage.getItem("role") || "";
    const jabatan = localStorage.getItem("jabatan") || "";

    if (!nip || role.toLowerCase() !== "pegawai") {
      router.replace("/login");
      return;
    }

    setPegawai({
      nip,
      nama,
      role,
      jabatan,
    });
  }, [router]);

  const passwordStrength = useMemo(() => {
    const value = form.newPassword;

    if (!value) return { label: "Belum diisi", color: "#94a3b8", score: 0 };
    if (value.length < 8)
      return { label: "Terlalu lemah", color: "#ef4444", score: 1 };

    let score = 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[a-z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;

    if (score <= 2) return { label: "Lemah", color: "#f97316", score: 2 };
    if (score <= 4) return { label: "Sedang", color: "#eab308", score: 3 };
    return { label: "Kuat", color: "#22c55e", score: 4 };
  }, [form.newPassword]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setServerMessage("");
    setServerError("");
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!form.oldPassword.trim()) {
      newErrors.oldPassword = "Password lama wajib diisi.";
    }

    if (!form.newPassword.trim()) {
      newErrors.newPassword = "Password baru wajib diisi.";
    } else if (form.newPassword.length < 8) {
      newErrors.newPassword = "Password baru minimal 8 karakter.";
    }

    if (!form.confirmPassword.trim()) {
      newErrors.confirmPassword = "Konfirmasi password wajib diisi.";
    } else if (form.confirmPassword !== form.newPassword) {
      newErrors.confirmPassword = "Konfirmasi password harus sama.";
    }

    if (
      form.oldPassword &&
      form.newPassword &&
      form.oldPassword === form.newPassword
    ) {
      newErrors.newPassword =
        "Password baru tidak boleh sama dengan password lama.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setServerMessage("");
    setServerError("");

    if (!validateForm()) return;
    if (!pegawai?.nip) return;

    try {
      setSubmitting(true);

      const response = await fetch(
        `${API_BASE_URL}/pegawai/change-password/${pegawai.nip}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            oldPassword: form.oldPassword,
            newPassword: form.newPassword,
            confirmPassword: form.confirmPassword,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Gagal mengganti password. Periksa password lama dan coba lagi."
        );
      }

      setServerMessage(
        data?.message || "Password berhasil diperbarui."
      );
      setForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setErrors({});
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengganti password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || !pegawai) {
    return (
      <section className="page-shell">
        <div className="card-simci" style={{ padding: "1.5rem" }}>
          <p>Memuat halaman pengaturan...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <p className="section-eyebrow">Pengaturan Akun</p>
          <h1 className="page-title">Ganti Password</h1>
          <p className="page-subtitle">
            Kelola keamanan akun pegawai Anda dengan memperbarui password secara
            berkala.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1.9fr",
          gap: "1.25rem",
          alignItems: "start",
        }}
        className="pengaturan-grid"
      >
        <div className="card-simci">
          <div className="card-header">
            <div>
              <h2 className="card-title">Informasi Akun</h2>
              <p className="card-subtitle">
                Identitas akun yang sedang aktif.
              </p>
            </div>
          </div>

          <div className="profile-summary-list">
            <div className="profile-summary-item">
              <span>NIP</span>
              <strong>{pegawai.nip}</strong>
            </div>
            <div className="profile-summary-item">
              <span>Nama</span>
              <strong>{pegawai.nama || "-"}</strong>
            </div>
            <div className="profile-summary-item">
              <span>Role</span>
              <strong>{pegawai.role || "-"}</strong>
            </div>
            <div className="profile-summary-item">
              <span>Jabatan</span>
              <strong>{pegawai.jabatan || "-"}</strong>
            </div>
          </div>

          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              borderRadius: "16px",
              background:
                "linear-gradient(135deg, rgba(91, 33, 182, 0.08), rgba(16, 185, 129, 0.08))",
              border: "1px solid rgba(91, 33, 182, 0.12)",
            }}
          >
            <p style={{ margin: 0, fontWeight: 700 }}>Catatan Keamanan</p>
            <p style={{ margin: "0.35rem 0 0", color: "#64748b" }}>
              Gunakan password minimal 8 karakter dan hindari memakai password
              lama yang sama.
            </p>
          </div>
        </div>

        <div className="card-simci">
          <div className="card-header">
            <div>
              <h2 className="card-title">Form Perubahan Password</h2>
              <p className="card-subtitle">
                Isi seluruh field dengan benar sebelum menyimpan perubahan.
              </p>
            </div>
          </div>

          {serverMessage ? (
            <div
              style={{
                marginBottom: "1rem",
                padding: "0.9rem 1rem",
                borderRadius: "14px",
                background: "rgba(16, 185, 129, 0.12)",
                color: "#047857",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                fontWeight: 600,
              }}
            >
              {serverMessage}
            </div>
          ) : null}

          {serverError ? (
            <div
              style={{
                marginBottom: "1rem",
                padding: "0.9rem 1rem",
                borderRadius: "14px",
                background: "rgba(239, 68, 68, 0.10)",
                color: "#b91c1c",
                border: "1px solid rgba(239, 68, 68, 0.18)",
                fontWeight: 600,
              }}
            >
              {serverError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="simci-form">
            <div className="form-grid single">
              <div className="form-field">
                <label htmlFor="oldPassword">Password Lama</label>
                <div className="password-input-wrap">
                  <input
                    id="oldPassword"
                    type={showOldPassword ? "text" : "password"}
                    value={form.oldPassword}
                    onChange={(e) =>
                      handleChange("oldPassword", e.target.value)
                    }
                    placeholder="Masukkan password lama"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowOldPassword((prev) => !prev)}
                    aria-label={showOldPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.oldPassword ? (
                  <small className="field-error">{errors.oldPassword}</small>
                ) : null}
              </div>

              <div className="form-field">
                <label htmlFor="newPassword">Password Baru</label>
                <div className="password-input-wrap">
                  <input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={form.newPassword}
                    onChange={(e) =>
                      handleChange("newPassword", e.target.value)
                    }
                    placeholder="Masukkan password baru"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={showNewPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div
                  style={{
                    marginTop: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      minWidth: "180px",
                      height: "8px",
                      borderRadius: "999px",
                      background: "#e2e8f0",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${passwordStrength.score * 25}%`,
                        height: "100%",
                        background: passwordStrength.color,
                        transition: "all 0.25s ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      color: passwordStrength.color,
                    }}
                  >
                    {passwordStrength.label}
                  </span>
                </div>

                {errors.newPassword ? (
                  <small className="field-error">{errors.newPassword}</small>
                ) : (
                  <small className="field-hint">
                    Minimal 8 karakter. Kombinasi huruf besar, huruf kecil,
                    angka, dan simbol lebih disarankan.
                  </small>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="confirmPassword">Konfirmasi Password Baru</label>
                <div className="password-input-wrap">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) =>
                      handleChange("confirmPassword", e.target.value)
                    }
                    placeholder="Ulangi password baru"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword ? (
                  <small className="field-error">
                    {errors.confirmPassword}
                  </small>
                ) : null}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
                flexWrap: "wrap",
                marginTop: "1.5rem",
              }}
            >
              <button
                type="button"
                className="button button-secondary"
                onClick={() => router.push("/dashboard")}
                disabled={submitting}
              >
                Kembali
              </button>

              <button
                type="submit"
                className="button button-primary"
                disabled={submitting}
              >
                {submitting ? "Menyimpan..." : "Simpan Password Baru"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .page-shell {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .section-eyebrow {
          margin: 0 0 0.35rem;
          font-size: 0.82rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7c3aed;
        }

        .page-title {
          margin: 0;
          font-size: clamp(1.5rem, 2vw, 2rem);
          font-weight: 800;
          color: #0f172a;
        }

        .page-subtitle {
          margin: 0.45rem 0 0;
          color: #64748b;
          max-width: 60ch;
          line-height: 1.6;
        }

        .card-simci {
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 24px;
          padding: 1.25rem;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
        }

        .card-header {
          margin-bottom: 1rem;
        }

        .card-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
        }

        .card-subtitle {
          margin: 0.35rem 0 0;
          color: #64748b;
          font-size: 0.95rem;
        }

        .profile-summary-list {
          display: grid;
          gap: 0.75rem;
        }

        .profile-summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 0.85rem 1rem;
          border-radius: 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .profile-summary-item span {
          color: #64748b;
          font-size: 0.92rem;
        }

        .profile-summary-item strong {
          color: #0f172a;
          text-align: right;
          font-size: 0.95rem;
        }

        .simci-form {
          display: flex;
          flex-direction: column;
        }

        .form-grid.single {
          display: grid;
          gap: 1rem;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .form-field label {
          font-size: 0.94rem;
          font-weight: 700;
          color: #334155;
        }

        .form-field input {
          width: 100%;
          border-radius: 16px;
          border: 1px solid #dbe4f0;
          background: #fff;
          padding: 0.95rem 1rem;
          font-size: 0.95rem;
          color: #0f172a;
          outline: none;
          transition: all 0.2s ease;
        }

        .form-field input:focus {
          border-color: rgba(124, 58, 237, 0.55);
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.10);
        }

        .password-input-wrap {
          position: relative;
        }

        .password-input-wrap input {
          padding-right: 3rem;
        }

        .password-toggle {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          color: #7c3aed;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
        }

        .field-error {
          color: #dc2626;
          font-size: 0.86rem;
          font-weight: 600;
        }

        .field-hint {
          color: #64748b;
          font-size: 0.86rem;
        }

        .button {
          border: none;
          border-radius: 14px;
          padding: 0.9rem 1.15rem;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .button-primary {
          color: #fff;
          background: linear-gradient(135deg, #7c3aed, #10b981);
          box-shadow: 0 12px 24px rgba(124, 58, 237, 0.18);
        }

        .button-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 16px 28px rgba(124, 58, 237, 0.22);
        }

        .button-secondary {
          color: #334155;
          background: #eef2ff;
        }

        .button-secondary:hover:not(:disabled) {
          background: #e2e8f0;
        }

        @media (max-width: 960px) {
          .pengaturan-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          .card-simci {
            padding: 1rem;
            border-radius: 20px;
          }

          .profile-summary-item {
            flex-direction: column;
            align-items: flex-start;
          }

          .profile-summary-item strong {
            text-align: left;
          }

          .password-input-wrap input {
            padding-right: 3rem;
          }

          .password-toggle {
            right: 0.7rem;
          }
        }
      `}</style>
    </section>
  );
}