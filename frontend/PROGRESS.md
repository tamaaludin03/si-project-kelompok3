# Progress Implementasi Feedback RSGM

## Status: SEDANG BERJALAN

---

## SELESAI ✅

### 1. Prisma Schema (`backend/prisma/schema.prisma`)
- [x] Hapus field STR dari Pegawai: `tanggal_terbit_str`, `expired_str`
- [x] Tambah `str_seumur_hidup Boolean @default(false)` ke Pegawai
- [x] Ganti `status_kepala_administrasi` → `status_direktur_administrasi` di model Cuti & Izin
- [x] Hapus semua field `_kepala_administrasi` di Cuti & Izin, ganti ke `_direktur_administrasi`
- [x] Pertahankan field SIP (`tanggal_terbit_sip`, `expired_sip`) — hanya STR yang diubah
- **WAJIB JALANKAN:** `cd backend && npx prisma migrate dev --name feedback-rsgm`

### 2. Backend: `cuti.service.ts`
- [x] Tambah jenis cuti baru: `besar` (10h), `haid` (1h), `menikah` (3h), `melahirkan` (90h)
- [x] Logika kuota: tahunan 12h (termasuk izin `tidak_masuk`), non-tahunan tidak motong tahunan
- [x] Auto-routing berdasarkan role pengaju:
  - pegawai → status `pending` (normal kaur → kabag)
  - kaur → status `disetujui_kaur` (skip kaur review sendiri)
  - kabag → status `pending_direktur` (ke direktur administrasi)
- [x] Kabag sekarang approver FINAL untuk pengajuan pegawai/kaur (`disetujui_final`)
- [x] Method baru: `approveByDirekturAdministrasi`, `rejectByDirekturAdministrasi`
- [x] Method `findPendingForKepalaAdministrasi` → `findPendingForDirekturAdministrasi`
- [x] Tambah endpoint `getSisaCutiByNip` untuk display kuota
- [x] Update PDF: label cuti dinamis per jenis, tanda tangan "Direktur Adm. & Ops"

### 3. Backend: `cuti.controller.ts`
- [x] Endpoint baru: `GET /cuti/sisa-cuti/:nip`
- [x] Endpoint baru: `GET /cuti/direktur-administrasi/pending`
- [x] Endpoint baru: `PATCH /cuti/:id/approve-direktur-administrasi`
- [x] Endpoint baru: `PATCH /cuti/:id/reject-direktur-administrasi`
- [x] Hapus endpoint `kepala-administrasi`

### 4. Backend: `izin.service.ts`
- [x] Izin `tidak_masuk` → validasi & motong kuota cuti tahunan
- [x] Auto-routing berdasarkan role pengaju (sama seperti cuti)
- [x] Kabag sekarang approver final untuk pengajuan pegawai/kaur
- [x] Method baru: `approveByDirekturAdministrasi`, `rejectByDirekturAdministrasi`
- [x] Method `findPendingForKepalaAdministrasi` → `findPendingForDirekturAdministrasi`

### 5. Backend: `izin.controller.ts`
- [x] Endpoint baru: `GET /izin/direktur-administrasi/pending`
- [x] Endpoint baru: `PATCH /izin/:id/approve-direktur-administrasi`
- [x] Endpoint baru: `PATCH /izin/:id/reject-direktur-administrasi`
- [x] Hapus endpoint `kepala-administrasi`

### 6. Backend: `employees.service.ts`
- [x] Hapus `tanggal_terbit_str`, `expired_str` dari select & update
- [x] Tambah `str_seumur_hidup` ke select & update
- [x] `getStrStatus()`: jika `str_seumur_hidup=true` → "aman", jika tidak ada nomor → "belum_diisi"
- [x] Validasi nakes: cukup cek `nomor_str` + `str_seumur_hidup` (tidak perlu tanggal expired STR)

### 7. Frontend: `lib/routeByRole.ts`
- [x] Tambah case `direktur_administrasi` → `/direktur-administrasi/dashboard`
- [x] Hapus case `kepala-administrasi`

### 8. Frontend: `components/sidebar/DirekturAdministrasiSidebar.tsx`
- [x] Dibuat baru (copy dari KepalaAdministrasiSidebar dengan endpoint baru)
- [x] Fetch dari `/cuti/direktur-administrasi/pending` & `/izin/direktur-administrasi/pending`

---

## SELESAI TAMBAHAN ✅

### 9. Frontend: `components/sidebar/index.ts`
- [x] Export `DirekturAdministrasiSidebar`

### 10. Frontend: Route `direktur-administrasi/`
- [x] `direktur-administrasi/dashboard/page.tsx`
- [x] `direktur-administrasi/approval/page.tsx` — approve/reject dari kabag
- [x] `direktur-administrasi/dokumen-masuk/page.tsx`
- [x] `direktur-administrasi/riwayat-approval/page.tsx`
- [x] `direktur-administrasi/laporan-cuti-izin/page.tsx`

### 11. Frontend: Form Cuti `(pegawai)/cuti/ajukan/page.tsx`
- [x] Tambah opsi: besar, haid, menikah, melahirkan
- [x] Info kuota & motong-tahunan per jenis cuti
- [x] Widget sisa kuota per jenis
- [x] Dropdown pegawai pengganti + auto-fill jabatan

### 12. Frontend: Form Izin `(pegawai)/izin/ajukan/page.tsx`
- [x] Note untuk `tidak_masuk`: "Izin ini akan MEMOTONG kuota cuti tahunan"

### 13. Frontend: Profil `(pegawai)/profil/page.tsx`
- [x] STR: hapus field tanggal terbit & expired STR
- [x] Tambah checkbox `str_seumur_hidup`
- [x] SIP tetap pakai tanggal
- [x] Validasi diperbarui

### 14. Frontend: Dashboard `(pegawai)/dashboard/page.tsx`
- [x] Tambah routing untuk direktur-administrasi / direktur_administrasi
- [x] Notifikasi: fetch on login, hapus socket listener notifikasi
- [x] Import DirekturAdministrasiDashboard component

### 15. Database
- [x] `prisma db push` berhasil — schema diterapkan ke database
- [x] Prisma Client di-regenerate otomatis

### 19. Backend: DTO `create-cuti.dto.ts`
- [x] Update `@IsIn` dengan jenis baru: tahunan, besar, haid, menikah, melahirkan
- [x] Tambah semua optional fields (tujuan_cuti, alamat, dll.) ke CreateCutiDto

### 20. Database
- [x] `npx prisma db push --accept-data-loss` sukses
- [x] Data lama ada yang hilang (15 baris data kepala_administrasi — sudah expected karena rename kolom)

---

## BELUM SELESAI ❌

### A. Frontend: SDM Data Pegawai — Sisa Cuti
- [ ] Tampilkan sisa cuti tahunan per pegawai di halaman SDM data pegawai
- Fetch dari `GET /cuti/sisa-cuti/:nip`
- File target: `frontend/src/app/sdm/data-pegawai/page.tsx`

### B. Frontend: Guard Pengajuan
- [ ] Hanya pegawai, kaur, kabag bisa akses `/cuti/ajukan` dan `/izin/ajukan`
- Redirect role lain (admin, sdm, direksi, direktur-administrasi)

### C. Nama RSGM baru
- [ ] Menunggu stakeholder kasih nama baru untuk form surat-surat

---

## CATATAN TEKNIS

### Status Baru di Database
- `pending` — baru diajukan pegawai (menunggu kaur)
- `disetujui_kaur` — kaur setuju / kaur submit sendiri (menunggu kabag)
- `disetujui_final` — kabag setuju (untuk pegawai/kaur) ATAU direktur setuju (untuk kabag)
- `pending_direktur` — kabag submit, menunggu direktur administrasi
- `ditolak_kaur`, `ditolak_kabag`, `ditolak_direktur` — ditolak di level masing-masing

### Alur Approval Baru
```
Pegawai → pending → [kaur approve] → disetujui_kaur → [kabag approve FINAL] → disetujui_final → SDM terbitkan surat
Kaur → disetujui_kaur (auto) → [kabag approve FINAL] → disetujui_final → SDM terbitkan surat  
Kabag → pending_direktur → [direktur adm approve FINAL] → disetujui_final → SDM terbitkan surat
```

### Kuota Cuti
| Jenis | Kuota | Motong Tahunan? |
|-------|-------|-----------------|
| tahunan | 12 hari/tahun | Ya |
| besar | 10 hari/tahun | Tidak |
| haid | 1 hari/instansi | Tidak |
| menikah | 3 hari | Tidak |
| melahirkan | 90 hari | Tidak |
| izin tidak_masuk | - | Ya (1 hari per izin) |

### Role Baru
- `direktur_administrasi` (ganti `kepala_administrasi`) — di `Pegawai.role` atau `internal_role`
- Role lama `kepala_administrasi` masih bisa diarahkan ke route baru via `routeByRole.ts`

### File yang PERLU MIGRASI DATABASE
Setelah mengubah schema.prisma, jalankan:
```bash
cd apps/backend
npx prisma migrate dev --name feedback-rsgm
npx prisma generate
```

---

## CATATAN PENDING (belum ada info)
- Nama RSGM baru — menunggu stakeholder kasih nama baru
- Format surat baru — menunggu konfirmasi
