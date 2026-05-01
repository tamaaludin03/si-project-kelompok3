"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = "http://localhost:3001";

type JenisIzin =
  | "TERLAMBAT"
  | "PULANG_CEPAT"
  | "IZIN_SEHARI"
  | "IZIN_SETENGAH_HARI";

export default function AjukanIzinPage() {
  const router = useRouter();
  const [jenis, setJenis] = useState<JenisIzin>("IZIN_SEHARI");
  const [tanggal, setTanggal] = useState("");
  const [jamMulai, setJamMulai] = useState("");
  const [jamSelesai, setJamSelesai] = useState("");
  const [alasan, setAlasan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const nip = localStorage.getItem("nip");
    if (!nip) {
      setError("NIP tidak ditemukan, silakan login ulang.");
      return;
    }

    if (!tanggal || !alasan.trim()) {
      setError("Tanggal dan alasan wajib diisi.");
      return;
    }

    try {
      setLoading(true);

      const body = {
        nip,
        jenisIzin: jenis, // sesuaikan dengan DTO backend
        tanggal,          // tanggal izin
        jamMulai: jamMulai || null,
        jamSelesai: jamSelesai || null,
        alasan,
      };

      const res = await fetch(`${API_BASE_URL}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.message || "Gagal mengajukan izin.";
        throw new Error(msg);
      }

      setSuccess("Pengajuan izin berhasil dikirim.");
      setAlasan("");
      setTanggal("");
      setJamMulai("");
      setJamSelesai("");

      setTimeout(() => {
        router.push("/riwayat");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mengajukan izin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fff5f1]">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">
            Ajukan Izin
          </h1>
          <p className="text-sm text-gray-500">
            Isi formulir berikut untuk mengajukan izin tidak masuk / terlambat.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            {success}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white shadow-sm border border-[#e5e7eb] px-5 py-5 space-y-4"
        >
          {/* Jenis Izin */}
          <div className="space-y-1 text-sm">
            <label className="block font-medium text-[#111827]">
              Jenis Izin
            </label>
            <select
              value={jenis}
              onChange={(e) => setJenis(e.target.value as JenisIzin)}
              className="mt-1 block w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fb923c]"
            >
              <option value="IZIN_SEHARI">Izin Sehari Penuh</option>
              <option value="IZIN_SETENGAH_HARI">Izin Setengah Hari</option>
              <option value="TERLAMBAT">Izin Terlambat Masuk</option>
              <option value="PULANG_CEPAT">Izin Pulang Cepat</option>
            </select>
          </div>

          {/* Tanggal dan Jam */}
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="space-y-1 md:col-span-1">
              <label className="block font-medium text-[#111827]">
                Tanggal
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fb923c]"
              />
            </div>
            <div className="space-y-1">
              <label className="block font-medium text-[#111827]">
                Jam Mulai (opsional)
              </label>
              <input
                type="time"
                value={jamMulai}
                onChange={(e) => setJamMulai(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fb923c]"
              />
            </div>
            <div className="space-y-1">
              <label className="block font-medium text-[#111827]">
                Jam Selesai (opsional)
              </label>
              <input
                type="time"
                value={jamSelesai}
                onChange={(e) => setJamSelesai(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fb923c]"
              />
            </div>
          </div>

          {/* Alasan */}
          <div className="space-y-1 text-sm">
            <label className="block font-medium text-[#111827]">
              Alasan
            </label>
            <textarea
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fb923c] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center rounded-lg border border-[#e5e7eb] px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center rounded-lg bg-[#fb923c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f97316] disabled:opacity-60"
            >
              {loading ? "Mengirim..." : "Ajukan Izin"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}