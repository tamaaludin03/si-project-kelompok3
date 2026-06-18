"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const identifierType = useMemo(() => {
    const value = identifier.trim();
    if (!value) return "kosong";
    if (/^\d+$/.test(value)) return "nip-atau-hp";
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "email";
    return "umum";
  }, [identifier]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier) {
      setError("NIP, email, atau nomor HP wajib diisi.");
      return;
    }

    setMessage(
      "Permintaan reset password diterima. Fitur backend reset password belum dihubungkan, silakan hubungi admin/IT untuk proses lanjutan."
    );
    setIdentifier("");
  };

  const identifierLabel =
    identifierType === "kosong"
      ? "belum diisi"
      : identifierType === "email"
      ? "email"
      : identifierType === "nip-atau-hp"
      ? "angka (NIP / HP)"
      : "format umum";

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-8 bg-transparent"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── Shell ── */}
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm grid lg:grid-cols-[1.05fr_0.95fr]">

        {/* ── Brand panel ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-900 via-violet-800 to-emerald-700 p-10 flex flex-col justify-between gap-8">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-violet-400/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-8 h-56 w-56 rounded-full bg-emerald-400/25 blur-3xl" />

          <div className="relative z-10 space-y-6">
            {/* Badge */}
            <span className="inline-block rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black tracking-[0.18em] text-white/90 uppercase">
              SIMCI
            </span>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">
                Sistem Informasi Cuti &amp; Izin
              </p>
              <h1 className="mt-3 text-4xl font-black leading-[1.1] tracking-tight text-white">
                Reset akses<br />akun pegawai
              </h1>
              <p className="mt-4 max-w-sm text-sm font-medium leading-7 text-white/80">
                Masukkan identitas yang terdaftar untuk memulai proses pemulihan password akun Anda.
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {[
                {
                  n: "1",
                  title: "Masukkan identitas akun",
                  desc: "Gunakan NIP, email, atau nomor HP yang terdaftar di sistem.",
                },
                {
                  n: "2",
                  title: "Verifikasi lanjutan",
                  desc: "Permintaan Anda akan dicatat sebelum proses reset disambungkan ke backend.",
                },
                {
                  n: "3",
                  title: "Hubungi admin / IT",
                  desc: "Untuk sementara, pemulihan akses dilakukan melalui bantuan admin atau tim IT.",
                },
              ].map(({ n, title, desc }) => (
                <div
                  key={n}
                  className="flex gap-4 items-start rounded-[22px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-black text-white">
                    {n}
                  </span>
                  <div>
                    <p className="text-sm font-black text-white">{title}</p>
                    <p className="mt-1 text-xs font-medium leading-6 text-white/70">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Form panel ── */}
        <div className="flex flex-col justify-center gap-6 p-10">
          {/* Header */}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">
              Lupa Password
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
              Pulihkan akun
            </h2>
            <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
              Isi satu identitas aktif yang terhubung ke akun pegawai Anda.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="identifier"
                className="block text-sm font-black text-slate-700"
              >
                NIP / Email / Nomor HP
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="19876543 / nama@email.com / 08xxxxxxxxxx"
                autoComplete="username"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 placeholder:text-slate-400"
              />
              <p className="text-xs font-semibold text-slate-500">
                Deteksi input:{" "}
                <span className="font-black text-violet-700">{identifierLabel}</span>
              </p>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3.5 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3.5 text-sm font-semibold text-emerald-700 leading-6">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-violet-700 to-emerald-600 px-4 py-4 text-sm font-black text-white shadow-[0_14px_26px_rgba(91,33,182,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(91,33,182,0.24)] active:scale-[0.98]"
            >
              Kirim Permintaan Reset
            </button>
          </form>

          {/* Footer */}
          <div>
            <Link
              href="/login"
              className="text-sm font-black text-violet-700 transition hover:text-violet-900 hover:underline"
            >
              ← Kembali ke login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
