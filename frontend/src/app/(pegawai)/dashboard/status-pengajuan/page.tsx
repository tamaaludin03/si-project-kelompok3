"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";

const FINAL_STATUSES = ["disetujui_final", "selesai", "ditolak_kaur", "ditolak_kabag", "ditolak_direktur", "disetujui_direktur", "direset_admin"];

function fmt(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtJenis(v?: string) {
  if (!v) return "-";
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type Step = { label: string; done: boolean; current: boolean; rejected: boolean };

function getSteps(status: string, userRole: string, isCuti: boolean, jenisIzin?: string, isDokter?: boolean): Step[] {
  const s = status.toLowerCase();
  const rejected = s.includes("tolak");

  if (!isCuti) {
    const jenis = (jenisIzin || "").toLowerCase();
    const isDone = s === "disetujui_final" || s === "selesai";

    // terlambat / tidak_apel → 2 langkah (semua role)
    if (jenis === "terlambat" || jenis === "tidak_apel") {
      return [
        { label: "Diajukan", done: true,    current: false,                rejected: false },
        { label: "Selesai",  done: isDone,  current: !isDone && !rejected, rejected: rejected },
      ];
    }

    // pulang_awal / keluar_jam_kerja: kaur/kabag/sdm/dokter → auto selesai (2 langkah)
    if (jenis !== "tidak_masuk" && (userRole === "kaur" || userRole === "kabag" || userRole === "sdm" || isDokter)) {
      return [
        { label: "Diajukan", done: true,    current: false,                rejected: false },
        { label: "Selesai",  done: isDone,  current: !isDone && !rejected, rejected: rejected },
      ];
    }

    // tidak_masuk: KABAG → Diajukan → Direktur → Selesai
    if (jenis === "tidak_masuk" && userRole === "kabag") {
      const dirDone = isDone;
      return [
        { label: "Diajukan",  done: true,     current: false,                      rejected: false },
        { label: "Direktur",  done: dirDone,  current: s === "pending_direktur",   rejected: s === "ditolak_direktur" },
        { label: "Selesai",   done: isDone,   current: false,                      rejected: false },
      ];
    }

    // tidak_masuk: KAUR/SDM skip KAUR → 3 langkah: Diajukan → KABAG → Selesai
    if (jenis === "tidak_masuk" && (userRole === "kaur" || userRole === "sdm")) {
      const kabagDone = isDone;
      return [
        { label: "Diajukan",       done: true,       current: false,                  rejected: false },
        { label: "Menunggu KABAG", done: kabagDone,  current: s === "disetujui_kaur", rejected: s === "ditolak_kabag" },
        { label: "Selesai",        done: isDone,     current: false,                  rejected: false },
      ];
    }

    // tidak_masuk: dokter skip KAUR → 3 langkah
    if (jenis === "tidak_masuk" && isDokter) {
      const kabagDone = isDone;
      return [
        { label: "Diajukan",       done: true,       current: false,                  rejected: false },
        { label: "Menunggu KABAG", done: kabagDone,  current: s === "disetujui_kaur", rejected: s === "ditolak_kabag" },
        { label: "Selesai",        done: isDone,     current: false,                  rejected: false },
      ];
    }

    // tidak_masuk → 4 langkah: Diajukan → KAUR → KABAG → Selesai (pegawai biasa + admin/it)
    if (jenis === "tidak_masuk") {
      const kaurDone  = !["pending"].includes(s);
      const kabagDone = isDone;
      return [
        { label: "Diajukan", done: true,       current: false,                  rejected: false },
        { label: "KAUR",     done: kaurDone,   current: s === "pending",        rejected: s === "ditolak_kaur" },
        { label: "KABAG",    done: kabagDone,  current: s === "disetujui_kaur", rejected: s === "ditolak_kabag" },
        { label: "Selesai",  done: isDone,     current: false,                  rejected: false },
      ];
    }

    // pulang_awal / keluar_jam_kerja → 3 langkah (pegawai biasa + admin/it)
    return [
      { label: "Diajukan",  done: true,    current: false,                    rejected: false },
      { label: "Diproses",  done: isDone,  current: !isDone && !rejected,     rejected: rejected && !isDone },
      { label: "Selesai",   done: isDone,  current: false,                    rejected: false },
    ];
  }

  // ── CUTI ──────────────────────────────────────────────────────

  if (userRole === "kabag") {
    const dirDone = s === "disetujui_direktur" || s === "ditolak_direktur";
    return [
      { label: "Diajukan",     done: true,     current: false,  rejected: false },
      { label: "Direktur",     done: dirDone,  current: s === "pending_direktur", rejected: s === "ditolak_direktur" },
      { label: "Surat Terbit", done: s === "disetujui_direktur", current: false, rejected: false },
    ];
  }

  // KAUR cuti: skip KAUR diri sendiri → 3 langkah: Diajukan → KABAG → Surat Terbit
  if (userRole === "kaur") {
    const kabagDone = s === "disetujui_final" || s === "ditolak_kabag";
    return [
      { label: "Diajukan",     done: true,      current: false,  rejected: false },
      { label: "KABAG",        done: kabagDone, current: s === "disetujui_kaur", rejected: s === "ditolak_kabag" },
      { label: "Surat Terbit", done: s === "disetujui_final", current: false, rejected: false },
    ];
  }

  // SDM cuti: skip KAUR → 3 langkah: Diajukan → KABAG → Surat Terbit
  if (userRole === "sdm") {
    const kabagDone = ["disetujui_final", "selesai", "ditolak_kabag"].includes(s);
    const suratDone = s === "disetujui_final" || s === "selesai";
    return [
      { label: "Diajukan",     done: true,      current: false,                  rejected: false },
      { label: "KABAG",        done: kabagDone, current: s === "disetujui_kaur", rejected: s === "ditolak_kabag" },
      { label: "Surat Terbit", done: suratDone, current: false,                  rejected: false },
    ];
  }

  // Dokter: skip KAUR → 3 langkah
  if (isDokter) {
    const kabagDone = ["disetujui_final", "selesai", "ditolak_kabag"].includes(s);
    const suratDone = s === "disetujui_final" || s === "selesai";
    return [
      { label: "Diajukan",       done: true,      current: false,                  rejected: false },
      { label: "Menunggu KABAG", done: kabagDone, current: s === "disetujui_kaur", rejected: s === "ditolak_kabag" },
      { label: "Surat Terbit",   done: suratDone, current: false,                  rejected: false },
    ];
  }

  // Pegawai biasa + admin/it — 4 steps: Diajukan → KAUR → KABAG → Surat Terbit
  const kaurDone  = !["pending"].includes(s);
  const kabagDone = ["disetujui_final", "selesai", "ditolak_kabag", "disetujui_direktur"].includes(s);
  const suratDone = s === "disetujui_final" || s === "selesai";
  return [
    { label: "Diajukan",     done: true,      current: false,              rejected: false },
    { label: "KAUR",         done: kaurDone,  current: s === "pending",    rejected: s === "ditolak_kaur" },
    { label: "KABAG",        done: kabagDone, current: s === "disetujui_kaur", rejected: s === "ditolak_kabag" },
    { label: "Surat Terbit", done: suratDone, current: false,              rejected: false },
  ];
}

function Stepper({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center min-w-0">
          <div className="flex flex-col items-center gap-1">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
              step.rejected  ? "bg-rose-100 text-rose-600 ring-2 ring-rose-200" :
              step.done      ? "bg-emerald-500 text-white" :
              step.current   ? "bg-violet-600 text-white ring-2 ring-violet-200 animate-pulse" :
                               "bg-slate-100 text-slate-400"
            }`}>
              {step.rejected ? "✕" : step.done ? "✓" : i + 1}
            </div>
            <span className={`text-center text-[9px] font-semibold leading-tight whitespace-nowrap ${
              step.rejected ? "text-rose-600" :
              step.done     ? "text-emerald-700" :
              step.current  ? "text-violet-700" :
                              "text-slate-400"
            }`}>{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-10 mx-1 shrink-0 rounded-full ${step.done && !step.rejected ? "bg-emerald-400" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function StatusPengajuanPage() {
  const router = useRouter();
  const [cutiList, setCutiList]   = useState<any[]>([]);
  const [izinList, setIzinList]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [userRole, setUserRole]   = useState("");
  const [isDokter, setIsDokter]   = useState(false);

  useEffect(() => {
    const role = (localStorage.getItem("internal_role") || localStorage.getItem("role") || "pegawai").toLowerCase();
    setUserRole(role);
    const jabatan = (localStorage.getItem("jabatan") || "").toLowerCase();
    setIsDokter(jabatan.includes("dokter"));

    const identifier = localStorage.getItem("nip") || localStorage.getItem("username") || "";
    if (!identifier) { setLoading(false); return; }

    const token = localStorage.getItem("token");
    const h: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      fetch(`${API_BASE_URL}/cuti/mine/${identifier}`, { headers: h, cache: "no-store" }).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE_URL}/izin/mine/${identifier}`, { headers: h, cache: "no-store" }).then(r => r.json()).catch(() => null),
    ]).then(([cj, ij]) => {
      function extract(p: any): any[] {
        if (Array.isArray(p?.data?.items)) return p.data.items;
        if (Array.isArray(p?.data)) return p.data;
        if (Array.isArray(p)) return p;
        return [];
      }
      const cutiAll = extract(cj).filter((i: any) => !FINAL_STATUSES.includes(String(i.status || "").toLowerCase()));
      const izinAll = extract(ij).filter((i: any) => !FINAL_STATUSES.includes(String(i.status || "").toLowerCase()));
      setCutiList(cutiAll);
      setIzinList(izinAll);
    }).finally(() => setLoading(false));
  }, []);

  const allItems = useMemo(() => {
    const cuti = cutiList.map((i: any) => ({ ...i, _type: "cuti" as const }));
    const izin = izinList.map((i: any) => ({ ...i, _type: "izin" as const }));
    return [...cuti, ...izin].sort((a, b) => {
      const ta = new Date(a.created_at || "").getTime();
      const tb = new Date(b.created_at || "").getTime();
      return tb - ta;
    });
  }, [cutiList, izinList]);

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="min-h-screen bg-transparent">
        <div className="mx-auto max-w-4xl space-y-5 px-3 py-4 sm:px-6 sm:py-8">

          {/* Header */}
          <section className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-7 shadow-sm">
            <button onClick={() => router.back()}
              className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-400 transition hover:text-slate-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
              Kembali
            </button>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Pegawai</p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">Status Pengajuan</h1>
            <p className="mt-1.5 text-sm text-slate-400">Pengajuan cuti dan izin Anda yang sedang dalam proses persetujuan.</p>
          </section>

          {/* Content */}
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 bg-slate-50/60">
                    <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-6 w-14 rounded-full" />
                  </div>
                  <div className="px-6 py-5">
                    <Skeleton className="h-3 w-32 mb-3 rounded-full" />
                    <div className="flex items-center gap-2">
                      {[0, 1, 2, 3].map((j) => (
                        <div key={j} className="flex items-center gap-1">
                          <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                          {j < 3 && <Skeleton className="h-0.5 w-10 rounded-full" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : allItems.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                <svg className="h-6 w-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-500">Tidak ada pengajuan yang sedang diproses</p>
              <p className="mt-1 text-xs text-slate-400">Pengajuan Anda yang selesai dapat dilihat di halaman Riwayat.</p>
            </div>
          ) : (
            <>
              <p className="px-1 text-xs font-semibold text-slate-400">{allItems.length} pengajuan sedang diproses</p>
              <div className="space-y-3">
                {allItems.map((item) => {
                  const isCuti   = item._type === "cuti";
                  const steps    = getSteps(item.status || "", userRole, isCuti, item.jenis_izin, isDokter);
                  const jenis    = isCuti ? item.jenis_cuti : item.jenis_izin;
                  const periode  = isCuti
                    ? `${fmt(item.tanggal_mulai)} – ${fmt(item.tanggal_selesai)}`
                    : `${fmt(item.tanggal)}${item.jam_mulai ? `, ${item.jam_mulai}` : ""}`;

                  return (
                    <div key={`${item._type}-${item.id}`}
                      className={`rounded-3xl border bg-white shadow-sm ${item.is_urgent ? "border-amber-200" : "border-slate-100"}`}>
                      {/* Header */}
                      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-t-3xl px-6 py-4 ${item.is_urgent ? "bg-amber-50/60" : "bg-slate-50/60"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${isCuti ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {isCuti ? "C" : "I"}
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-slate-900">{isCuti ? "Cuti " + fmtJenis(jenis) : fmtJenis(jenis)}</p>
                            <p className="text-xs text-slate-400">{periode}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.is_urgent && <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">⚡ Mendesak</span>}
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${isCuti ? "border-violet-200 bg-violet-50 text-violet-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                            {isCuti ? "Cuti" : "Izin"}
                          </span>
                        </div>
                      </div>
                      {/* Stepper */}
                      <div className="px-6 py-5">
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Progress Persetujuan</p>
                        <Stepper steps={steps} />
                      </div>
                      {/* Footer */}
                      {item.alasan && (
                        <div className="border-t border-slate-100 px-6 py-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Alasan</p>
                          <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{item.alasan}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
