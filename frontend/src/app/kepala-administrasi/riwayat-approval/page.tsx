"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

type Row = {
  id: number;
  kategori: "Cuti" | "Izin";
  nama: string;
  nip: string;
  unit: string;
  jabatan: string;
  jenis: string;
  periode: string;
  status: string;
  catatan: string;
  updatedAt: string;
};

function extractItems(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function statusClass(status: string) {
  const value = status.toLowerCase();

  if (value.includes("tolak") || value.includes("reject")) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (value.includes("approve") || value.includes("setuju")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function KepalaAdministrasiRiwayatApprovalPage() {
  const router = useRouter();

  const [cuti, setCuti] = useState<any[]>([]);
  const [izin, setIzin] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kategori, setKategori] = useState<"semua" | "Cuti" | "Izin">("semua");
  const [keyword, setKeyword] = useState("");

  async function safeFetch(urls: string[]) {
    const token = localStorage.getItem("token");

    const headers: HeadersInit = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers,
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (res.ok) {
          return extractItems(json);
        }
      } catch {
        continue;
      }
    }

    return [];
  }

  async function loadData() {
    setLoading(true);

    const [cutiData, izinData] = await Promise.all([
      safeFetch([
        `${API_BASE_URL}/cuti/kepala-administrasi/riwayat`,
        `${API_BASE_URL}/cuti/kepala-administrasi/history`,
        `${API_BASE_URL}/cuti/administrasi/riwayat`,
        `${API_BASE_URL}/cuti/administrasi/history`,
        `${API_BASE_URL}/cuti/kepala-administrasi/pending`,
      ]),
      safeFetch([
        `${API_BASE_URL}/izin/kepala-administrasi/riwayat`,
        `${API_BASE_URL}/izin/kepala-administrasi/history`,
        `${API_BASE_URL}/izin/administrasi/riwayat`,
        `${API_BASE_URL}/izin/administrasi/history`,
        `${API_BASE_URL}/izin/kepala-administrasi/pending`,
      ]),
    ]);

    setCuti(cutiData);
    setIzin(izinData);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const rows = useMemo<Row[]>(() => {
    const cutiRows: Row[] = cuti.map((item) => ({
      id: item.id,
      kategori: "Cuti",
      nama: item.pegawai?.nama || item.nama || "-",
      nip: item.pegawai?.nip || item.nip || "-",
      unit: item.pegawai?.unit || item.unit || "-",
      jabatan: item.pegawai?.jabatan || item.jabatan || "-",
      jenis: item.jenis_cuti || item.jenis || "-",
      periode: `${formatDate(item.tanggal_mulai)} - ${formatDate(
        item.tanggal_selesai
      )}`,
      status: item.status || "-",
      catatan:
        item.catatan_kepala_administrasi ||
        item.catatan_administrasi ||
        item.catatan_approval ||
        item.catatan ||
        "Belum ada catatan.",
      updatedAt: item.updated_at || item.updatedAt || item.created_at || "",
    }));

    const izinRows: Row[] = izin.map((item) => ({
      id: item.id,
      kategori: "Izin",
      nama: item.pegawai?.nama || item.nama || "-",
      nip: item.pegawai?.nip || item.nip || "-",
      unit: item.pegawai?.unit || item.unit || "-",
      jabatan: item.pegawai?.jabatan || item.jabatan || "-",
      jenis: item.jenis_izin || item.jenis || "-",
      periode: `${formatDate(item.tanggal || item.tanggal_mulai)}${
        item.jam_mulai ? `, ${item.jam_mulai}` : ""
      }`,
      status: item.status || "-",
      catatan:
        item.catatan_kepala_administrasi ||
        item.catatan_administrasi ||
        item.catatan_approval ||
        item.catatan ||
        "Belum ada catatan.",
      updatedAt: item.updated_at || item.updatedAt || item.created_at || "",
    }));

    return [...cutiRows, ...izinRows]
      .filter((item) => kategori === "semua" || item.kategori === kategori)
      .filter((item) => {
        const q = keyword.toLowerCase();

        return (
          item.nama.toLowerCase().includes(q) ||
          item.nip.toLowerCase().includes(q) ||
          item.unit.toLowerCase().includes(q) ||
          item.jabatan.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q) ||
          item.jenis.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();

        if (Number.isNaN(dateA) || Number.isNaN(dateB)) return 0;
        return dateB - dateA;
      });
  }, [cuti, izin, kategori, keyword]);

  const totalApproved = rows.filter((item) => {
    const status = item.status.toLowerCase();
    return status.includes("approve") || status.includes("setuju");
  }).length;

  const totalRejected = rows.filter((item) => {
    const status = item.status.toLowerCase();
    return status.includes("reject") || status.includes("tolak");
  }).length;

  const totalPending = rows.length - totalApproved - totalRejected;

  return (
    <main
      className="min-h-screen bg-transparent px-3 py-4 sm:px-6 sm:py-6 text-slate-900"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
          <div>
            <button
              onClick={() => router.back()}
              className="mb-4 text-sm font-semibold text-slate-500 hover:text-slate-900"
            >
              ← Kembali
            </button>

            <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-700">
              Kepala Administrasi
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
              Riwayat Keputusan Final
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
              Menampilkan riwayat keputusan approval final yang telah diproses
              oleh Kepala Administrasi.
            </p>
          </div>
        </header>

        <div className="grid gap-5 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Total Riwayat
            </p>
            <h2 className="mt-3 text-5xl font-black text-slate-950">
              {rows.length}
            </h2>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
              Disetujui
            </p>
            <h2 className="mt-3 text-5xl font-black text-emerald-800">
              {totalApproved}
            </h2>
          </div>

          <div className="rounded-3xl border border-red-100 bg-red-50/60 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-700">
              Ditolak
            </p>
            <h2 className="mt-3 text-5xl font-black text-red-800">
              {totalRejected}
            </h2>
          </div>

          <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
              Menunggu
            </p>
            <h2 className="mt-3 text-5xl font-black text-amber-800">
              {totalPending}
            </h2>
          </div>
        </div>

        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Daftar Riwayat
              </h2>
              <p className="text-sm font-medium text-slate-500">
                Filter riwayat berdasarkan jenis pengajuan dan kata kunci.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <div className="flex gap-2">
                {["semua", "Cuti", "Izin"].map((item) => (
                  <button
                    key={item}
                    onClick={() =>
                      setKategori(item as "semua" | "Cuti" | "Izin")
                    }
                    className={`rounded-full px-4 py-2 text-sm font-black transition ${
                      kategori === item
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {item === "semua" ? "Semua" : item}
                  </button>
                ))}
              </div>

              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Cari nama, NIP, unit..."
                className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold outline-none transition focus:border-amber-300"
              />
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-6 text-sm font-bold text-slate-500">
              Memuat riwayat approval...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-6 text-sm font-bold text-slate-500">
              Belum ada riwayat approval final.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((item) => (
                <div
                  key={`${item.kategori}-${item.id}`}
                  className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                          {item.kategori}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-black text-slate-950">
                        {item.nama}
                      </h3>

                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {item.nip} • {item.jabatan} • {item.unit}
                      </p>
                    </div>

                    <div className="text-left lg:text-right">
                      <p className="text-sm font-black text-slate-800">
                        {item.jenis}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {item.periode}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-amber-50/70 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                      Catatan Keputusan Anda
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                      {item.catatan}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}