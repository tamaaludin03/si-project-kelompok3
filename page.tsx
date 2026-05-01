"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = "http://localhost:3001";

export default function LoginPage() {
  const router = useRouter();
  const [nip, setNip] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!nip.trim() || !password.trim()) {
      setError("NIP dan password wajib diisi.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nip: nip.trim(),
          password,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          data?.message || "NIP atau password tidak sesuai. Silakan periksa kembali.";
        throw new Error(msg);
      }

      const data = await res.json();

      if (data.nip) localStorage.setItem("nip", data.nip);
      if (data.nama) localStorage.setItem("nama", data.nama);
      if (data.role) localStorage.setItem("role", data.role);

      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "NIP atau password tidak sesuai. Silakan periksa kembali.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-xl)] bg-white shadow-[var(--shadow-md)] border border-[var(--border)] px-6 py-6 space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--primary)] uppercase">
            SIMCI
          </p>
          <h1 className="text-lg font-semibold text-[var(--text)]">
            Masuk ke SIMCI
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Gunakan NIP dan password untuk masuk ke dashboard pegawai.
          </p>
        </div>

        {error && (
          <p className="text-xs text-[var(--danger)] bg-[var(--danger-soft)] border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="space-y-1">
            <label className="block font-medium text-[var(--text)]">
              NIP
            </label>
            <input
              type="text"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="Masukkan NIP Anda"
              className="input-simci"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-[var(--text)]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              className="input-simci"
            />
            <button
              type="button"
              onClick={() => router.push("/forgot-password")}
              className="mt-1 text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] hover:underline"
            >
              Lupa password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-2 w-full disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </main>
  );
}