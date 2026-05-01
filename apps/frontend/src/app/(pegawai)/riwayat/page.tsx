"use client";

import { useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:3001";

type ItemRiwayat = {
  id: string;
  jenis: "Cuti" | "Izin";
  jenisDetail?: string;
  alasan: string;
  tanggalMulai: string;
  tanggalSelesai?: string;
  tanggalPengajuan?: string;
  status: string;
};

type FilterStatus = "SEMUA" | "MENUNGGU" | "DISETUJUI" | "DITOLAK";

export default function RiwayatPage() {
  const [data, setData] = useState<ItemRiwayat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("SEMUA");
  const [filterTahun, setFilterTahun] = useState<string>("SEMUA");
  const [tahunOptions, setTahunOptions] = useState<string[]>([]);

  useEffect(() => {
    async function fetchRiwayat() {
      try {
        setLoading(true);
        setError("");

        const nip = localStorage.getItem("nip");
        if (!nip) {
          setError("NIP tidak ditemukan, silakan login ulang.");
          setLoading(false);
          return;
        }

        const [cutiRes, izinRes] = await Promise.all([
          fetch(`${API_BASE_URL}/leave-requests/mine/${nip}`),
          fetch(`${API_BASE_URL}/permissions/mine/${nip}`),
        ]);

        if (!cutiRes.ok || !izinRes.ok) {
          throw new Error("Gagal memuat riwayat pengajuan.");
        }

        const rawCuti = await cutiRes.json();
        const rawIzin = await izinRes.json();

        const cutiArr = Array.isArray(rawCuti)
          ? rawCuti
          : Array.isArray(rawCuti?.data)
          ? rawCuti.data
          : [];
        const izinArr = Array.isArray(rawIzin)
          ? rawIzin
          : Array.isArray(rawIzin?.data)
          ? rawIzin.data
          : [];

        const mappedCuti: ItemRiwayat[] = cutiArr.map((item: any) => ({
          id: String(item.id ?? item._id ?? Math.random()),
          jenis: "Cuti",
          jenisDetail: item.jenisCuti ?? item.jenis_cuti ?? "",
          alasan: item.alasan ?? item.reason ?? "-",
          tanggalMulai:
            item.tanggalMulai ?? item.tanggal_mulai ?? item.startDate,
          tanggalSelesai:
            item.tanggalSelesai ?? item.tanggal_selesai ?? item.endDate,
          tanggalPengajuan:
            item.createdAt ?? item.dibuatPada ?? item.created_at,
          status: (item.status ?? "MENUNGGU") as string,
        }));

        const mappedIzin: ItemRiwayat[] = izinArr.map((item: any) => ({
          id: String(item.id ?? item._id ?? Math.random()),
          jenis: "Izin",
          jenisDetail: item.jenisIzin ?? item.jenis_izin ?? "",
          alasan: item.alasan ?? item.reason ?? "-",
          tanggalMulai:
            item.tanggal ?? item.tanggalMulai ?? item.tanggal_mulai,
          tanggalSelesai:
            item.tanggalSelesai ?? item.tanggal_selesai ?? undefined,
          tanggalPengajuan:
            item.createdAt ?? item.dibuatPada ?? item.created_at,
          status: (item.status ?? "MENUNGGU") as string,
        }));

        const gabungan = [...mappedCuti, ...mappedIzin].sort((a, b) => {
          const tA = new Date(a.tanggalPengajuan || a.tanggalMulai).getTime();
          const tB = new Date(b.tanggalPengajuan || b.tanggalMulai).getTime();
          return tB - tA;
        });

        setData(gabungan);

        // generate opsi tahun dari data
        const tahunSet = new Set<string>();
        gabungan.forEach((item) => {
          const t = new Date(
            item.tanggalPengajuan || item.tanggalMulai
          ).getFullYear();
          if (!Number.isNaN(t)) tahunSet.add(String(t));
        });
        const tahunList = Array.from(tahunSet).sort();
        setTahunOptions(tahunList);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Terjadi kesalahan saat memuat riwayat.");
      } finally {
        setLoading(false);
      }
    }

    fetchRiwayat();
  }, []);

  function formatTanggal(dateStr?: string) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function durasiLabel(item: ItemRiwayat) {
    const start = new Date(item.tanggalMulai);
    const end =
      item.tanggalSelesai && item.tanggalSelesai !== item.tanggalMulai
        ? new Date(item.tanggalSelesai)
        : start;
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return "-";
    }
    const hari =
      Math.max(
        1,
        Math.round((end.getTime() - start.getTime()) / 86400000) + 1
      ) || 1;
    return `${hari} Hari`;
  }

  function badgeStatus(status: string) {
    const s = status.toLowerCase();
    if (s.includes("setuju")) {
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
          {status}
        </span>
      );
    }
    if (s.includes("tolak")) {
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-100">
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
        {status}
      </span>
    );
  }

  const filtered = data.filter((item) => {
    const statusUpper = item.status.toUpperCase();

    if (filterStatus !== "SEMUA") {
      if (filterStatus === "MENUNGGU" && !statusUpper.includes("MENUNGGU")) {
        return false;
      }
      if (filterStatus === "DISETUJUI" && !statusUpper.includes("SETUJ")) {
        return false;
      }
      if (filterStatus === "DITOLAK" && !statusUpper.includes("TOLAK")) {
        return false;
      }
    }

    if (filterTahun !== "SEMUA") {
      const year = new Date(
        item.tanggalPengajuan || item.tanggalMulai
      ).getFullYear();
      if (String(year) !== filterTahun) return false;
    }

    return true;
  });

  return (
    <main className="min-h-screen bg-[#fff5f1]">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">
              Riwayat Pengajuan
            </h1>
            <p className="text-sm text-gray-500">
              Daftar semua pengajuan cuti dan izin yang pernah Anda ajukan.
            </p>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-3 text-xs">
            <div className="space-y-1">
              <label className="block text-[11px] text-gray-500">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as FilterStatus)
                }
                className="rounded-lg border border-[#e5e7eb] px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#fb923c]"
              >
                <option value="SEMUA">Semua</option>
                <option value="MENUNGGU">Menunggu</option>
                <option value="DISETUJUI">Disetujui</option>
                <option value="DITOLAK">Ditolak</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] text-gray-500">
                Tahun
              </label>
              <select
                value={filterTahun}
                onChange={(e) => setFilterTahun(e.target.value)}
                className="rounded-lg border border-[#e5e7eb] px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#fb923c]"
              >
                <option value="SEMUA">Semua</option>
                {tahunOptions.map((th) => (
                  <option key={th} value={th}>
                    {th}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <p className="text-sm text-gray-500">
            Memuat riwayat pengajuan...
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <section className="rounded-2xl bg-white shadow-sm border border-[#e5e7eb] px-5 py-5">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-500">
              Belum ada pengajuan yang sesuai dengan filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-[#e5e7eb] text-gray-500">
                    <th className="py-2 pr-3 text-left font-medium">
                      Jenis
                    </th>
                    <th className="py-2 px-3 text-left font-medium">
                      Tanggal Pengajuan
                    </th>
                    <th className="py-2 px-3 text-left font-medium">
                      Periode
                    </th>
                    <th className="py-2 px-3 text-left font-medium">
                      Durasi
                    </th>
                    <th className="py-2 px-3 text-left font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-[#f3f4f6] last:border-0 hover:bg-[#f9fafb] transition-colors"
                    >
                      <td className="py-2 pr-3 align-top max-w-[220px]">
                        <div className="font-medium text-[#111827]">
                          {item.jenis}
                          {item.jenisDetail
                            ? ` - ${item.jenisDetail}`
                            : ""}
                        </div>
                        <div className="text-[11px] text-gray-500 line-clamp-2">
                          {item.alasan}
                        </div>
                      </td>
                      <td className="py-2 px-3 align-top">
                        {formatTanggal(item.tanggalPengajuan)}
                      </td>
                      <td className="py-2 px-3 align-top">
                        {formatTanggal(item.tanggalMulai)}
                        {item.tanggalSelesai &&
                          item.tanggalSelesai !== item.tanggalMulai && (
                            <>
                              {" "}
                              - {formatTanggal(item.tanggalSelesai)}
                            </>
                          )}
                      </td>
                      <td className="py-2 px-3 align-top">
                        {durasiLabel(item)}
                      </td>
                      <td className="py-2 px-3 align-top">
                        {badgeStatus(item.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}