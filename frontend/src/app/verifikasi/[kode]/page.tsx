type VerificationData = {
  valid: boolean;
  jenis_dokumen: "CUTI" | "IZIN";
  kode: string;
  status: string;
  nama?: string;
  nip?: string;
  jabatan?: string;
  jenis?: string;
  tanggal?: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
};
import { API_BASE_URL } from "@/lib/api";

function formatTanggal(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatWaktu(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function getVerification(kode: string): Promise<VerificationData | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/verifikasi/${kode}`, {
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok) return null;

    return json.data;
  } catch {
    return null;
  }
}

export default async function VerifikasiPage({
  params,
}: {
  params: Promise<{ kode: string }>;
}) {
  const { kode } = await params;
  const data = await getVerification(kode);

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f5fb] px-6">
        <div className="w-full max-w-xl rounded-[32px] border border-rose-100 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-3xl">
            ✕
          </div>

          <h1 className="mt-5 text-2xl font-black text-slate-900">
            Dokumen Tidak Ditemukan
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Kode verifikasi <span className="font-bold">{kode}</span> tidak
            ditemukan atau dokumen belum valid.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f5fb] px-3 py-6 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-100 bg-white p-4 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-5 border-b border-slate-100 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-700">
              SIMCI RSGM
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-900">
              Verifikasi Dokumen
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Sistem Informasi Manajemen Cuti dan Izin
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
              Status
            </p>
            <p className="mt-1 text-xl font-black text-emerald-700">
              VALID
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50/80 p-5">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
            Kode Dokumen
          </p>

          <p className="mt-2 text-2xl font-black text-slate-900">
            {data.kode}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {data.jenis_dokumen === "CUTI"
              ? "Formulir Permohonan Cuti"
              : "Formulir Permohonan Izin"}
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Info label="Nama Pegawai" value={data.nama || "-"} />
          <Info label="NIP" value={data.nip || "-"} />
          <Info label="Jabatan" value={data.jabatan || "-"} />
          <Info label="Jenis" value={data.jenis || "-"} />

          {data.jenis_dokumen === "CUTI" ? (
            <>
              <Info
                label="Tanggal Mulai"
                value={formatTanggal(data.tanggal_mulai)}
              />
              <Info
                label="Tanggal Selesai"
                value={formatTanggal(data.tanggal_selesai)}
              />
            </>
          ) : (
            <>
              <Info label="Tanggal Izin" value={formatTanggal(data.tanggal)} />
              <Info
                label="Jam"
                value={`${data.jam_mulai || "-"} s/d ${
                  data.jam_selesai || "-"
                }`}
              />
            </>
          )}

          <Info label="Status Dokumen" value={data.status} />
          <Info label="Disetujui Oleh" value={data.approved_by || "-"} />
        </div>

        <div className="mt-6 rounded-3xl border border-violet-100 bg-violet-50/70 p-5">
          <p className="text-sm font-bold text-violet-800">
            Dokumen ini valid dan terdaftar pada sistem SIMCI RSGM.
          </p>

          <p className="mt-2 text-sm text-violet-700">
            Disetujui pada: {formatWaktu(data.approved_at)}
          </p>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}