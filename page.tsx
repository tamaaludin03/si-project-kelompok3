"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!identifier.trim()) {
      setError("NIP, email, atau nomor HP wajib diisi.");
      return;
    }

    setMessage(
      "Permintaan reset password diterima. Langkah backend verifikasi akan kita sambungkan setelah ini."
    );
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f6f1ff_0%,#ffffff_38%,#edf8f1_100%)] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-md border border-gray-200 p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#4a2888]">Lupa Password</h1>
          <p className="mt-2 text-sm text-slate-600">
            Masukkan NIP, email, atau nomor HP yang terdaftar untuk memulai proses reset password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="identifier"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              NIP / Email / Nomor HP
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Masukkan NIP, email, atau nomor HP"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-[#4a2888] focus:bg-white focus:ring-4 focus:ring-[rgba(74,40,136,0.12)]"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-[#4a2888] px-4 py-3 font-semibold text-white transition hover:bg-[#3f2174]"
          >
            Kirim Permintaan Reset
          </button>
        </form>

        <div className="mt-6 text-sm">
          <Link
            href="/login"
            className="font-medium text-[#4a2888] hover:text-[#3f2174]"
          >
            Kembali ke login
          </Link>
        </div>
      </div>
    </main>
  );
}