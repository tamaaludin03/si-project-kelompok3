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
  jenis: string;
  periode: string;
  status: string;
  lampiran: any[];
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
    month: "short",
    year: "numeric",
  });
}

function getLampiran(item: any) {
  return (
    item.lampiran ||
    item.lampirans ||
    item.cuti_lampiran ||
    item.izin_lampiran ||
    item.CutiLampiran ||
    item.IzinLampiran ||
    []
  );
}

function getFileUrl(file: any) {
  const url = file.file_url || file.url || file.path || file.filePath || "";
  if (!url) return "#";
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

export default function DokumenMasukPage() {
  const router = useRouter();

  const [cuti, setCuti] = useState<any[]>([]);
  const [izin, setIzin] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const [cutiRes, izinRes] = await Promise.all([
        fetch(`${API_BASE_URL}/cuti/kepala-administrasi/pending`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_BASE_URL}/izin/kepala-administrasi/pending`, {
          headers,
          cache: "no-store",
        }),
      ]);

      const cutiJson = await cutiRes.json().catch(() => null);
      const izinJson = await izinRes.json().catch(() => null);

      setCuti(cutiRes.ok ? extractItems(cutiJson) : []);
      setIzin(izinRes.ok ? extractItems(izinJson) : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const rows = useMemo<Row[]>(() => {
    const cutiRows: Row[] = cuti.map((item) => ({
      id: item.id,
      kategori: "Cuti",
      nama: item.pegawai?.nama || "-",
      nip: item.pegawai?.nip || "-",
      unit: item.pegawai?.unit || "-",
      jenis: item.jenis_cuti || "-",
      periode: `${formatDate(item.tanggal_mulai)} - ${formatDate(
        item.tanggal_selesai
      )}`,
      status: item.status || "-",
      lampiran: getLampiran(item),
    }));

    const izinRows: Row[] = izin.map((item) => ({
      id: item.id,
      kategori: "Izin",
      nama: item.pegawai?.nama || "-",
      nip: item.pegawai?.nip || "-",
      unit: item.pegawai?.unit || "-",
      jenis: item.jenis_izin || "-",
      periode: `${formatDate(item.tanggal || item.tanggal_mulai)}${
        item.jam_mulai ? `, ${item.jam_mulai}` : ""
      }`,
      status: item.status || "-",
      lampiran: getLampiran(item),
    }));

    return [...cutiRows, ...izinRows].filter((item) => {
      const q = keyword.toLowerCase();
      return (
        item.nama.toLowerCase().includes(q) ||
        item.nip.toLowerCase().includes(q) ||
        item.unit.toLowerCase().includes(q) ||
        item.jenis.toLowerCase().includes(q)
      );
    });
  }, [cuti, izin, keyword]);

  return (
    <main
      className="min-h-screen bg-transparent px-3 py-4 sm:px-6 sm:py-6 text-slate-900"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            ← Kembali
          </button>

          <p className="text-xs font-black uppercase tracking-[0.28em] text-indigo-700">
            Kepala Administrasi
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            Dokumen Masuk
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600">
            Melihat dokumen pendukung dari pengajuan cuti dan izin sebelum
            approval final.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Daftar Dokumen
              </h2>
              <p className="text-sm font-medium text-slate-500">
                Total {rows.length} pengajuan masuk.
              </p>
            </div>

            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari nama, NIP, unit..."
              className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-300"
            />
          </div>

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-6 text-sm font-bold text-slate-500">
              Memuat dokumen...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-6 text-sm font-bold text-slate-500">
              Belum ada dokumen masuk.
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
                      <div className="flex gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                          {item.kategori}
                        </span>
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                          {item.status}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-black text-slate-950">
                        {item.nama}
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {item.nip} • {item.unit}
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

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Lampiran
                    </p>

                    {item.lampiran.length === 0 ? (
                      <p className="text-sm font-semibold text-slate-500">
                        Tidak ada lampiran.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {item.lampiran.map((file, index) => (
                          <a
                            key={index}
                            href={getFileUrl(file)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700 transition hover:bg-indigo-100"
                          >
                            {file.file_name ||
                              file.filename ||
                              file.name ||
                              `Dokumen ${index + 1}`}
                          </a>
                        ))}
                      </div>
                    )}
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