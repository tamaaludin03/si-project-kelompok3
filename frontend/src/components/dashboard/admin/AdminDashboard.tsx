"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import Modal from "@/components/ui/Modal";

type Pegawai = {
  id: number;
  username: string;
  nip?: string | null;
  nama?: string | null;
  jabatan?: string | null;
  role: string;
  internal_role?: string | null;
  portal_pegawai_access: boolean;
  must_change_password: boolean;
  is_nakes: boolean;
};

type Summary = {
  totalPegawai: number;
  totalNakes: number;
  totalPortalAktif: number;
  totalMustChangePassword: number;
};

type AuditLog = {
  id: number;
  actor_nip?: string | null;
  actor_name?: string | null;
  actor_role?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  description?: string | null;
  created_at: string;
};

type CreateUserForm = {
  username: string;
  password: string;
  nip: string;
  nama: string;
  jabatan: string;
  unit: string;
  jenis_pegawai: string;
  email: string;
  no_hp: string;
  tanggal_lahir: string;
  role: string;
  internal_role: string;
  is_nakes: boolean;
  portal_pegawai_access: boolean;
};

const EMPTY_FORM: CreateUserForm = {
  username: "",
  password: "",
  nip: "",
  nama: "",
  jabatan: "",
  unit: "",
  jenis_pegawai: "",
  email: "",
  no_hp: "",
  tanggal_lahir: "",
  role: "pegawai",
  internal_role: "",
  is_nakes: false,
  portal_pegawai_access: true,
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const STAT_CONFIG: Record<string, { bg: string; label: string; num: string }> = {
  violet:  { bg: "bg-white",      label: "text-violet-600",  num: "text-violet-700"  },
  emerald: { bg: "bg-emerald-50", label: "text-emerald-700", num: "text-emerald-700" },
  sky:     { bg: "bg-sky-50",     label: "text-sky-700",     num: "text-sky-700"     },
  amber:   { bg: "bg-amber-50",   label: "text-amber-700",   num: "text-amber-700"   },
};

function StatCard({ title, value, color }: {
  title: string; value: number; color: keyof typeof STAT_CONFIG;
}) {
  const c = STAT_CONFIG[color];
  const display = String(value).padStart(2, "0");
  return (
    <div className={`rounded-2xl border border-slate-100 ${c.bg} p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}>
      <p className={`text-xs font-semibold tracking-wide ${c.label}`}>{title}</p>
      <p className={`mt-1.5 text-4xl font-extrabold leading-none tracking-tight ${c.num}`}>{display}</p>
    </div>
  );
}

// ─── Mini Stat ────────────────────────────────────────────────────────────────
function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:bg-violet-50/40">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-800">{value}</p>
    </div>
  );
}

// ─── Quick Action ─────────────────────────────────────────────────────────────
function QuickAction({ title, desc, href, icon }: { title: string; desc: string; href: string; icon: React.ReactNode }) {
  return (
    <a href={href} className="group flex items-start gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition group-hover:bg-violet-100">
        {icon}
      </div>
      <div>
        <p className="font-bold text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">{desc}</p>
      </div>
    </a>
  );
}

// ─── Audit Card ───────────────────────────────────────────────────────────────
function AuditCard({ log }: { log: AuditLog }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-violet-100 hover:bg-violet-50/30">
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${actionBadgeClass(log.action)}`}>
        {log.action}
      </span>
      <p className="mt-2 text-sm font-semibold text-slate-800">{log.description || "-"}</p>
      <p className="mt-1 text-xs text-slate-400">
        Entity: {log.entity} #{log.entity_id || "-"} · Actor: {log.actor_name || log.actor_role || "-"}
      </p>
      <p className="mt-1.5 text-[11px] font-semibold text-slate-400">{formatDateTime(log.created_at)}</p>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = "text", required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-slate-600">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100 placeholder:text-slate-300"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, children, required }: {
  label: string; value: string; onChange: (v: string) => void;
  children: React.ReactNode; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-slate-600">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
      >
        {children}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-slate-600 select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${checked ? "bg-violet-600" : "bg-slate-200"}`}
      >
        <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </div>
      {label}
    </label>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full flex items-center gap-2 pt-1">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-500">{children}</p>
      <div className="flex-1 border-t border-violet-100" />
    </div>
  );
}

// ─── Modal Create User ─────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<CreateUserForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  function set<K extends keyof CreateUserForm>(key: K, val: CreateUserForm[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit() {
    if (!form.username || !form.password || !form.nama) {
      setErr("Username, password, dan nama wajib diisi.");
      return;
    }
    try {
      setSubmitting(true);
      setErr("");
      const payload = {
        ...form,
        nip: form.nip || undefined,
        jabatan: form.jabatan || undefined,
        unit: form.unit || undefined,
        jenis_pegawai: form.jenis_pegawai || undefined,
        email: form.email || undefined,
        no_hp: form.no_hp || undefined,
        tanggal_lahir: form.tanggal_lahir || undefined,
        internal_role: form.internal_role || undefined,
      };
      const res = await fetch(`${API_BASE_URL}/pegawai/admin/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Gagal membuat user.");
      onSuccess();
      onClose();
    } catch (e: any) {
      setErr(e.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} className="max-w-2xl rounded-3xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-500">Admin Panel</p>
            <h2 className="mt-0.5 text-lg font-extrabold text-slate-900">Buat User Baru</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-100">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {err && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">

            <SectionLabel>Akun & Login</SectionLabel>
            <Field label="Nama Lengkap" value={form.nama} onChange={(v) => set("nama", v)} placeholder="Nama lengkap pegawai" required />
            <Field label="Username" value={form.username} onChange={(v) => set("username", v)} placeholder="Username untuk login" required />
            <Field label="Password" value={form.password} onChange={(v) => set("password", v)} placeholder="Password awal" type="password" required />
            <Field label="NIP" value={form.nip} onChange={(v) => set("nip", v)} placeholder="NIP (harus unik)" />

            <SectionLabel>Data Kepegawaian</SectionLabel>
            <Field label="Jabatan" value={form.jabatan} onChange={(v) => set("jabatan", v)} placeholder="Jabatan / posisi" />
            <Field label="Unit / Bagian" value={form.unit} onChange={(v) => set("unit", v)} placeholder="Unit atau bagian kerja" />
            <SelectField label="Jenis Pegawai" value={form.jenis_pegawai} onChange={(v) => set("jenis_pegawai", v)}>
              <option value="">— Pilih jenis pegawai —</option>
              <option value="PNS">Tetap</option>
              <option value="PPPK">Kontrak</option>
            </SelectField>
            <Field label="Tanggal Lahir" value={form.tanggal_lahir} onChange={(v) => set("tanggal_lahir", v)} type="date" />

            <SectionLabel>Kontak</SectionLabel>
            <Field label="Email" value={form.email} onChange={(v) => set("email", v)} placeholder="email@contoh.com" type="email" />
            <Field label="No. HP" value={form.no_hp} onChange={(v) => set("no_hp", v)} placeholder="08xxxxxxxxxx" />

            <SectionLabel>Role & Akses</SectionLabel>
            <SelectField label="Role Utama" value={form.role} onChange={(v) => set("role", v)} required>
              <option value="pegawai">Pegawai</option>
              <option value="admin">Admin</option>
              <option value="sdm">SDM</option>
              <option value="direksi">Direktur Utama</option>
            </SelectField>
            <SelectField label="Internal Role" value={form.internal_role} onChange={(v) => set("internal_role", v)}>
              <option value="">— Tidak ada —</option>
              <option value="kaur">KAUR</option>
              <option value="kabag">KABAG</option>
              <option value="kepala_administrasi">Kepala Administrasi</option>
              <option value="sdm">SDM</option>
              <option value="direksi">Direktur Utama</option>
              <option value="admin">Admin</option>
            </SelectField>

            <div className="col-span-full mt-1 flex flex-wrap gap-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5">
              <Toggle label="Tenaga Kesehatan (Nakes)" checked={form.is_nakes} onChange={(v) => set("is_nakes", v)} />
              <Toggle label="Akses Portal Pegawai" checked={form.portal_pegawai_access} onChange={(v) => set("portal_pegawai_access", v)} />
            </div>

          </div>

          <p className="mt-3 text-[11px] text-slate-400">
            User baru akan diwajibkan mengganti password saat pertama kali login.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-xl bg-violet-700 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 disabled:opacity-60 active:scale-95"
          >
            {submitting ? "Menyimpan…" : "Buat User"}
          </button>
        </div>
      </Modal>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getProfile() {
  if (typeof window === "undefined") return { nama: "Admin", nip: "-", jabatan: "Admin", unit: "-", role: "admin" };
  const raw = localStorage.getItem("user") || localStorage.getItem("simciUser");
  if (raw) {
    try {
      const u = JSON.parse(raw);
      return {
        nama:    u?.nama    || localStorage.getItem("nama")          || "Admin",
        nip:     u?.nip     || localStorage.getItem("nip")           || "-",
        jabatan: u?.jabatan || localStorage.getItem("jabatan")       || "Admin",
        unit:    u?.unit    || localStorage.getItem("unit")          || "-",
        role:    u?.internal_role || u?.role || localStorage.getItem("internal_role") || "admin",
      };
    } catch { /* */ }
  }
  return {
    nama:    localStorage.getItem("nama")          || "Admin",
    nip:     localStorage.getItem("nip")           || "-",
    jabatan: localStorage.getItem("jabatan")       || "Admin",
    unit:    localStorage.getItem("unit")          || "-",
    role:    localStorage.getItem("internal_role") || "admin",
  };
}

function actionBadgeClass(action: string) {
  const a = action.toLowerCase();
  if (a.includes("reset")) return "bg-amber-100 text-amber-700";
  if (a.includes("update")) return "bg-sky-100 text-sky-700";
  if (a.includes("approve") || a.includes("terbitkan")) return "bg-emerald-100 text-emerald-700";
  if (a.includes("reject") || a.includes("tolak")) return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();

  const [profile] = useState(getProfile());
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [myCutiItems, setMyCutiItems] = useState<any[]>([]);
  const [myIzinItems, setMyIzinItems] = useState<any[]>([]);

  const BELL_PENDING = new Set(["pending", "disetujui_kaur", "pending_direktur", "pending_direksi"]);
  function extractMine(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const nip = profile.nip;
      const token = typeof window !== "undefined" ? (localStorage.getItem("token") || "") : "";
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const [pegawaiRes, auditRes, cutiMineRes, izinMineRes] = await Promise.all([
        fetch(`${API_BASE_URL}/pegawai/admin/list`),
        fetch(`${API_BASE_URL}/audit-log`),
        nip && nip !== "-" ? fetch(`${API_BASE_URL}/cuti/mine/${nip}`, { headers: authHeaders, cache: "no-store" }) : Promise.resolve(null),
        nip && nip !== "-" ? fetch(`${API_BASE_URL}/izin/mine/${nip}`, { headers: authHeaders, cache: "no-store" }) : Promise.resolve(null),
      ]);
      const pegawaiData = await pegawaiRes.json();
      const auditData = await auditRes.json().catch(() => null);
      if (!pegawaiRes.ok) throw new Error(pegawaiData?.message || "Gagal memuat data admin");
      setPegawai(pegawaiData?.data?.items || []);
      setSummary(pegawaiData?.data?.summary || null);
      if (auditRes.ok) setAuditLogs(auditData?.data || []);
      if (cutiMineRes?.ok) setMyCutiItems(extractMine(await cutiMineRes.json().catch(() => null)));
      if (izinMineRes?.ok) setMyIzinItems(extractMine(await izinMineRes.json().catch(() => null)));
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat memuat dashboard admin");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.clear();
    router.push("/login");
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, []);

  const roleSummary = useMemo(() => ({
    pegawai: pegawai.filter((p) => p.role === "pegawai" && !p.internal_role).length,
    admin: pegawai.filter((p) => p.role === "admin" || p.internal_role === "admin").length,
    kaur: pegawai.filter((p) => p.internal_role === "kaur").length,
    kabag: pegawai.filter((p) => p.internal_role === "kabag").length,
    direkturUtama: pegawai.filter((p) => p.internal_role === "direksi").length,
    sdm: pegawai.filter((p) => p.internal_role === "sdm" || p.role === "sdm").length,
    direkturUnit: pegawai.filter((p) => p.role === "direktur").length,
  }), [pegawai]);

  const highPriorityLogs = useMemo(() => auditLogs.filter((log) => {
    const action = log.action.toLowerCase();
    return action.includes("approve") || action.includes("reject") || action.includes("terbitkan") || action.includes("reset") || action.includes("update");
  }), [auditLogs]);

  if (loading) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          .admin-wrap, .admin-wrap * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        `}</style>
        <main className="admin-wrap min-h-screen space-y-4 bg-transparent p-3 sm:p-6">
          <Skeleton className="h-32" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28" style={{ animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
          <Skeleton className="h-72" />
        </main>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .admin-wrap, .admin-wrap * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .admin-wrap { -webkit-font-smoothing: antialiased; }
      `}</style>

      {showCreateUser && (
        <CreateUserModal onClose={() => setShowCreateUser(false)} onSuccess={loadData} />
      )}

      <main className="admin-wrap min-h-screen bg-transparent p-3 sm:p-6">

        {/* ── HEADER CARD ── */}
        <section className="rounded-3xl bg-white p-4 sm:p-7 shadow-sm border border-slate-100">

          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-500">Dashboard Admin</p>
              <h1 className="mt-1.5 text-2xl font-extrabold text-slate-900 tracking-tight">Pusat Kontrol SIMCI</h1>
              <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
                Ringkasan data pegawai, akses sistem, status tenaga kesehatan, dan aktivitas terbaru.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { label: profile.nama,    cls: "border-violet-100 bg-violet-50 text-violet-700"   },
                  { label: `NIP: ${profile.nip}`, cls: "border-slate-200 bg-slate-50 text-slate-600" },
                  { label: profile.jabatan, cls: "border-emerald-100 bg-emerald-50 text-emerald-700" },
                  { label: `Unit: ${profile.unit}`, cls: "border-slate-200 bg-slate-50 text-slate-600" },
                  { label: profile.role,    cls: "border-sky-100 bg-sky-50 text-sky-700"             },
                ].map(({ label, cls }) => (
                  <span key={label} className={`rounded-full border px-3.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Bell notifikasi — selalu merah */}
              {(() => {
                const allMine = [...myCutiItems, ...myIzinItems];
                const pendingCount = allMine.filter(i => BELL_PENDING.has(String(i.status || "").toLowerCase())).length;
                const notifCount   = allMine.length;
                const bellBadge    = pendingCount > 0 ? pendingCount : notifCount > 0 ? notifCount : "!";
                return (
                  <a href="/admin/notifikasi" className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-rose-300 bg-white text-rose-500 transition hover:border-rose-400 hover:text-rose-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white">
                      {typeof bellBadge === "number" && bellBadge > 9 ? "9+" : bellBadge}
                    </span>
                  </a>
                );
              })()}
              <button
                onClick={() => setShowCreateUser(true)}
                className="flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 hover:shadow-md active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Tambah Pengguna
              </button>
              <button
                onClick={loadData}
                className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-600 transition hover:bg-violet-100 hover:border-violet-300 active:scale-95"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                Muat Ulang
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Keluar
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          )}

          {/* Stat row */}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard title="Total Pegawai" value={summary?.totalPegawai || 0} color="violet" />
            <StatCard title="Total Nakes" value={summary?.totalNakes || 0} color="emerald" />
            <StatCard title="Akses Portal Aktif" value={summary?.totalPortalAktif || 0} color="sky" />
            <StatCard title="Perlu Ganti Password" value={summary?.totalMustChangePassword || 0} color="amber" />
          </div>

          {/* Main content grid */}
          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">

            {/* Quick Access */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
              <p className="text-sm font-bold text-slate-800">Akses Cepat Admin</p>
              <p className="mt-0.5 text-xs text-slate-400">Navigasi cepat ke fungsi-fungsi utama administrator.</p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <QuickAction title="Manajemen User" desc="Kelola pegawai, portal, nakes, dan reset password." href="/admin/manajemen-user"
                  icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>} />
                <QuickAction title="Manajemen Role" desc="Atur peran dan hak akses persetujuan pegawai." href="/admin/manajemen-role"
                  icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>} />
                <QuickAction title="Data Unit" desc="Pantau distribusi pegawai berdasarkan unit/jabatan." href="/admin/data-unit"
                  icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>} />
                <QuickAction title="Data Pengajuan" desc="Pantau semua pengajuan cuti dan izin beserta statusnya." href="/admin/data-pengajuan"
                  icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>} />
                <QuickAction title="Notifikasi & Audit" desc="Pantau log aktivitas dan perubahan data." href="/admin/notifikasi"
                  icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>} />
                <QuickAction title="Profil Admin" desc="Lihat identitas admin yang sedang login." href="/admin/profil"
                  icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>} />
              </div>
            </div>

            {/* Role Summary */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5">
              <p className="text-sm font-bold text-slate-800">Ringkasan Peran</p>
              <p className="mt-0.5 text-xs text-slate-400">Jumlah akun berdasarkan peran dalam sistem.</p>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <MiniStat label="Pegawai" value={roleSummary.pegawai} />
                <MiniStat label="Admin" value={roleSummary.admin} />
                <MiniStat label="KAUR" value={roleSummary.kaur} />
                <MiniStat label="KABAG" value={roleSummary.kabag} />
                <MiniStat label="Direktur Utama" value={roleSummary.direkturUtama} />
                <MiniStat label="SDM" value={roleSummary.sdm} />
                <MiniStat label="Direktur Unit" value={roleSummary.direkturUnit} />
                <MiniStat label="Tanpa Akses Portal" value={pegawai.filter((p) => !p.portal_pegawai_access).length} />
              </div>
            </div>
          </div>
        </section>

        {/* ── AUDIT LOG SECTION ── */}
        <section className="mt-5 rounded-3xl bg-white p-4 sm:p-7 shadow-sm border border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Aktivitas Terbaru</h2>
              <p className="mt-0.5 text-sm text-slate-400">Catatan aktivitas penting: persetujuan, reset password, perubahan peran, dan penerbitan surat.</p>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Muat Ulang
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {highPriorityLogs.length === 0 ? (
              <p className="col-span-2 py-8 text-center text-sm text-slate-400">Belum ada aktivitas penting.</p>
            ) : (
              highPriorityLogs.slice(0, 8).map((log) => <AuditCard key={log.id} log={log} />)
            )}
          </div>
        </section>

      </main>
    </>
  );
}
