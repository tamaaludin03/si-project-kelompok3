"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = "http://localhost:3001";

export default function PengaturanPage() {
  const router = useRouter();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess("");
    setError("");

    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError("Semua field password wajib diisi.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");
      const nip = localStorage.getItem("nip");

      if (!token || !nip) {
        router.replace("/login");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nip,
          oldPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Gagal mengganti password.");
      }

      setSuccess("Password berhasil diganti.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mengganti password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell p-6 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="section-title text-2xl md:text-3xl">Pengaturan</h1>
          <p className="text-soft">
            Ubah password akun Anda untuk menjaga keamanan akses.
          </p>
        </div>

        <section className="card-simci p-6">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-4">
            Ganti Password
          </h2>

          {success ? (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)]">
                Password Lama
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="input-simci"
                placeholder="Masukkan password lama"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)]">
                Password Baru
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-simci"
                placeholder="Masukkan password baru"
              />
              <p className="mt-1 text-xs text-soft">
                Password baru minimal 8 karakter.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)]">
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-simci"
                placeholder="Ulangi password baru"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-60"
            >
              {loading ? "Menyimpan..." : "Simpan Password"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}