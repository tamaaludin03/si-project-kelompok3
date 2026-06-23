"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";

function extractItems(payload: any): any[] {
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export default function DirekturAdministrasiDashboard() {
  const router = useRouter();
  const [cutiPending, setCutiPending] = useState<any[]>([]);
  const [izinPending, setIzinPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ nama: "", nip: "-", jabatan: "-", unit: "-", role: "direktur" });

  useEffect(() => {
    const raw = localStorage.getItem("user") || localStorage.getItem("simciUser");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setProfile({
          nama:    u?.nama    || localStorage.getItem("nama")    || "Direktur",
          nip:     u?.nip     || localStorage.getItem("nip")     || "-",
          jabatan: u?.jabatan || localStorage.getItem("jabatan") || "-",
          unit:    u?.unit    || localStorage.getItem("unit")    || "-",
          role:    u?.internal_role || u?.role || localStorage.getItem("internal_role") || "direktur",
        });
      } catch { /* */ }
    } else {
      setProfile({
        nama:    localStorage.getItem("nama")          || "Direktur",
        nip:     localStorage.getItem("nip")           || "-",
        jabatan: localStorage.getItem("jabatan")       || "-",
        unit:    localStorage.getItem("unit")          || "-",
        role:    localStorage.getItem("internal_role") || "direktur",
      });
    }

    const tok = localStorage.getItem("token");
    const headers: HeadersInit = tok ? { Authorization: `Bearer ${tok}` } : {};

    Promise.all([
      fetch(`${API_BASE_URL}/cuti/direktur/pending`, { headers, cache: "no-store" }),
      fetch(`${API_BASE_URL}/izin/direktur/pending`, { headers, cache: "no-store" }),
    ]).then(async ([cutiRes, izinRes]) => {
      setCutiPending(cutiRes.ok ? extractItems(await cutiRes.json().catch(() => null)) : []);
      setIzinPending(izinRes.ok ? extractItems(await izinRes.json().catch(() => null)) : []);
      setLoading(false);
    });
  }, []);

  const total = cutiPending.length + izinPending.length;
  const initials = (profile.nama || "D").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .direktur-wrap, .direktur-wrap * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .direktur-wrap { -webkit-font-smoothing: antialiased; }
      `}</style>

      <div className="direktur-wrap min-h-screen bg-transparent p-3 sm:p-6 space-y-5">

        {/* Header */}
        <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-7 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            {/* Avatar + Info */}
            <div className="flex flex-1 items-start gap-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-600 text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(109,40,217,0.3)]">
                  {initials}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="mb-2 inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 border border-violet-100">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-600">Dashboard Direktur</span>
                </div>
                <h1 className="text-[1.4rem] font-bold leading-tight text-slate-900">
                  {profile.nama || "Direktur"}
                </h1>
                <p className="mt-0.5 text-[13px] text-slate-400">
                  {total > 0
                    ? `Ada ${total} pengajuan dari Kabag menunggu persetujuan Anda.`
                    : "Tidak ada pengajuan yang menunggu persetujuan saat ini."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { label: "NIP",     value: profile.nip     },
                    { label: "Jabatan", value: profile.jabatan  },
                    { label: "Unit",    value: profile.unit     },
                    { label: "Peran",   value: profile.role     },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</span>
                      <div className="h-2.5 w-px bg-slate-200" />
                      <span className="text-[11px] font-semibold text-slate-700">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Bell notifikasi */}
            <a href="/direktur/notifikasi" className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-violet-300 hover:text-violet-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {total > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white">
                  {total > 9 ? "9+" : total}
                </span>
              )}
            </a>
          </div>
        </section>

        {/* Stat cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {([
            { label: "Total Menunggu Persetujuan", value: total,               bg: "bg-white",       text: "text-violet-600",  num: "text-violet-700",  blob: "bg-violet-100"  },
            { label: "Cuti Menunggu",              value: cutiPending.length,  bg: "bg-emerald-50",  text: "text-emerald-700", num: "text-emerald-700", blob: "bg-emerald-200" },
            { label: "Izin Menunggu",              value: izinPending.length,  bg: "bg-sky-50",      text: "text-sky-700",     num: "text-sky-700",     blob: "bg-sky-200"     },
          ] as const).map(({ label, value, bg, text, num, blob }) => (
            <div key={label} className={`relative overflow-hidden rounded-2xl border border-slate-100 ${bg} p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}>
              <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full ${blob} opacity-40`} />
              <p className={`relative z-10 text-xs font-bold uppercase tracking-wide ${text}`}>{label}</p>
              <p className={`relative z-10 mt-2 text-4xl font-extrabold ${num}`}>
                {String(value).padStart(2, "0")}
              </p>
            </div>
          ))}
        </div>

        {/* Pengajuan Masuk */}
        <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Antrian</p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-900">Pengajuan Masuk</h2>
            </div>
            <button
              onClick={() => router.push("/direktur/approval")}
              className="rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-800 active:scale-95"
            >
              Lihat &amp; Proses
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16" style={{ animationDelay: `${i * 40}ms` }} />
              ))}
            </div>
          ) : total === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <p className="text-sm font-semibold text-slate-400">Tidak ada pengajuan yang menunggu.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[
                ...cutiPending.map((i) => ({ ...i, _k: "Cuti" })),
                ...izinPending.map((i) => ({ ...i, _k: "Izin" })),
              ].slice(0, 5).map((item) => (
                <div
                  key={`${item._k}-${item.id}`}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="flex gap-2 mb-1">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        item._k === "Cuti"
                          ? "bg-violet-100 text-violet-700"
                          : "bg-sky-100 text-sky-700"
                      }`}>{item._k}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{item.pegawai?.nama || "-"}</p>
                    <p className="text-xs text-slate-500 capitalize">
                      {(item.jenis_cuti || item.jenis_izin || "-").replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
