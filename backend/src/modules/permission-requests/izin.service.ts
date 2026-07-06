import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import * as path from "path";
import { PrismaService } from "../../prisma.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import { CreateIzinDto } from "./dto/create-izin.dto";

@Injectable()
export class IzinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async findPegawaiByIdentifier(identifier: string) {
    return this.prisma.pegawai.findFirst({
      where: { OR: [{ nip: identifier }, { username: identifier }] },
      select: { id: true, nip: true, nama: true, jabatan: true, role: true, internal_role: true, unit: true },
    });
  }

  private nullableTrim(value?: string | null): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private parseLocalDate(value: string): Date {
    const parts = value.split("-");
    if (parts.length !== 3) throw new BadRequestException("Format tanggal tidak valid");
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!year || !month || !day) throw new BadRequestException("Format tanggal tidak valid");
    return new Date(year, month - 1, day);
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private isValidTimeFormat(value?: string): boolean {
    if (!value) return true;
    return /^\d{2}:\d{2}$/.test(value);
  }

  private timeToMinutes(value: string): number {
    const [hour, minute] = value.split(":").map(Number);
    return hour * 60 + minute;
  }

  // Hitung sisa cuti tahunan (untuk validasi tidak_masuk izin)
  private async getSisaCutiTahunan(pegawaiId: number): Promise<number> {
    const year = new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    const approvedCuti = await this.prisma.cuti.findMany({
      where: {
        pegawaiId,
        jenis_cuti: "tahunan",
        status: "disetujui_final",
        tanggal_mulai: { gte: yearStart, lte: yearEnd },
      },
      select: { tanggal_mulai: true, tanggal_selesai: true },
    });

    const cutiDays = approvedCuti.reduce((total, item) => {
      const start = this.startOfDay(item.tanggal_mulai);
      const end = this.startOfDay(item.tanggal_selesai);
      const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return total + days;
    }, 0);

    const izinTidakMasuk = await this.prisma.izin.count({
      where: {
        pegawaiId,
        jenis_izin: "tidak_masuk",
        status: "disetujui_final",
        tanggal: { gte: yearStart, lte: yearEnd },
        // Izin sakit yang melampirkan surat dokter tidak memotong jatah cuti
        NOT: {
          alasan: { contains: "sakit", mode: "insensitive" },
          lampiran: { some: {} },
        },
      },
    });

    const used = cutiDays + izinTidakMasuk;
    return Math.max(12 - used, 0);
  }

  async create(dto: CreateIzinDto, file?: Express.Multer.File) {
    const pegawai = await this.findPegawaiByIdentifier(String(dto.nip));

    if (!pegawai) throw new NotFoundException("Data pegawai tidak ditemukan");

    const pegawaiRole = String(pegawai.role || "").toLowerCase().trim();
    const IZIN_ALLOWED_ROLES = ["pegawai", "kaur", "kabag", "sdm", "admin", "it"];
    if (!IZIN_ALLOWED_ROLES.includes(pegawaiRole)) {
      throw new ForbiddenException("Pengajuan izin hanya dapat dilakukan oleh pegawai");
    }

    const tanggalIzin = this.startOfDay(this.parseLocalDate(dto.tanggal));
    const hariIni = this.startOfDay(new Date());

    if (tanggalIzin < hariIni) {
      throw new BadRequestException("Tanggal izin tidak boleh di masa lalu");
    }

    if (!this.isValidTimeFormat(dto.jam_mulai)) throw new BadRequestException("Format jam_mulai tidak valid");
    if (!this.isValidTimeFormat(dto.jam_selesai)) throw new BadRequestException("Format jam_selesai tidak valid");

    if (dto.jam_mulai && dto.jam_selesai) {
      if (this.timeToMinutes(dto.jam_selesai) < this.timeToMinutes(dto.jam_mulai)) {
        throw new BadRequestException("Jam selesai tidak boleh sebelum jam mulai");
      }
    }

    const jenisIzin = dto.jenis_izin.trim();

    if (["terlambat", "pulang_awal", "keluar_jam_kerja"].includes(jenisIzin) && !dto.jam_mulai) {
      throw new BadRequestException("Jam mulai wajib diisi untuk jenis izin ini");
    }

    // Izin sakit = tidak_masuk + alasan mengandung "sakit". Lampiran OPSIONAL:
    //  - dengan surat → tidak memotong jatah cuti
    //  - tanpa surat  → memotong jatah cuti seperti biasa
    const isSakit = jenisIzin === "tidak_masuk" && (dto.alasan || "").toLowerCase().includes("sakit");
    const izinMemotongJatah = jenisIzin === "tidak_masuk" && !(isSakit && !!file);

    // Hanya validasi sisa kuota bila izin ini memang akan memotong jatah
    if (izinMemotongJatah) {
      const sisa = await this.getSisaCutiTahunan(pegawai.id);
      if (sisa <= 0) {
        throw new BadRequestException(
          "Sisa cuti tahunan Anda sudah habis. Izin tidak masuk memotong kuota cuti tahunan.",
        );
      }
    }

    const overlappingIzin = await this.prisma.izin.findFirst({
      where: {
        pegawaiId: pegawai.id,
        tanggal: tanggalIzin,
        status: { in: ["pending", "disetujui_kaur", "selesai", "disetujui_final"] },
        jenis_izin: dto.jenis_izin,
      },
      select: { id: true },
    });

    if (overlappingIzin) {
      throw new BadRequestException("Pengajuan izin dengan jenis yang sama pada tanggal tersebut sudah ada");
    }

    // Flow per jenis izin:
    // terlambat / tidak_apel   → langsung selesai (tidak perlu approval)
    // pulang_awal / keluar_jam_kerja → kaur approve FINAL
    // tidak_masuk              → kaur approve dulu, lalu kabag approve FINAL
    const JENIS_AUTO_SELESAI = ["terlambat", "tidak_apel"];
    const JENIS_KAUR_FINAL   = ["pulang_awal", "keluar_jam_kerja"];

    const rolePengaju = (pegawai.internal_role || pegawai.role || "").toLowerCase();
    const isDokter = (pegawai.jabatan || "").toLowerCase().includes("dokter");
    let initialStatus = "pending";
    let autoKaurData: Record<string, any> = {};

    if (JENIS_AUTO_SELESAI.includes(jenisIzin)) {
      initialStatus = "selesai";
      autoKaurData = {
        status_kaur: "auto",
        approved_by_kaur: "SYSTEM",
        approved_at_kaur: new Date(),
        catatan_kaur: "Otomatis selesai, tidak memerlukan persetujuan",
      };
    } else if (isDokter) {
      if (JENIS_KAUR_FINAL.includes(jenisIzin)) {
        // Dokter: pulang_awal/keluar_jam_kerja → skip KAUR, langsung selesai
        initialStatus = "disetujui_final";
        autoKaurData = {
          status_kaur: "disetujui",
          approved_by_kaur: "SYSTEM",
          approved_at_kaur: new Date(),
          catatan_kaur: "Auto-disetujui final (pengaju adalah Dokter)",
        };
      } else {
        // Dokter: tidak_masuk → skip KAUR, langsung ke KABAG
        initialStatus = "disetujui_kaur";
        autoKaurData = {
          status_kaur: "disetujui",
          approved_by_kaur: "SYSTEM",
          approved_at_kaur: new Date(),
          catatan_kaur: "Auto-disetujui (pengaju adalah Dokter, langsung ke KABAG)",
        };
      }
    } else if (rolePengaju === "kaur") {
      if (JENIS_KAUR_FINAL.includes(jenisIzin)) {
        initialStatus = "disetujui_final";
        autoKaurData = {
          status_kaur: "disetujui",
          approved_by_kaur: pegawai.nip,
          approved_at_kaur: new Date(),
          catatan_kaur: "Auto-disetujui final (pengaju adalah Kaur)",
        };
      } else {
        initialStatus = "disetujui_kaur";
        autoKaurData = {
          status_kaur: "disetujui",
          approved_by_kaur: pegawai.nip,
          approved_at_kaur: new Date(),
          catatan_kaur: "Auto-disetujui (pengaju adalah Kaur)",
        };
      }
    } else if (rolePengaju === "kabag") {
      if (JENIS_KAUR_FINAL.includes(jenisIzin)) {
        // KABAG: pulang_awal/keluar_jam_kerja → skip KAUR & KABAG, langsung selesai
        initialStatus = "disetujui_final";
        autoKaurData = {
          status_kaur: "disetujui",
          approved_by_kaur: pegawai.nip,
          approved_at_kaur: new Date(),
          catatan_kaur: "Auto-disetujui final (pengaju adalah KABAG)",
        };
      } else {
        // KABAG: tidak_masuk → skip KAUR & KABAG, langsung ke Direktur
        initialStatus = "pending_direktur";
        autoKaurData = {
          status_kaur: "disetujui",
          approved_by_kaur: pegawai.nip,
          approved_at_kaur: new Date(),
          catatan_kaur: "Auto-disetujui (pengaju adalah KABAG, langsung ke Direktur)",
        };
      }
    } else if (rolePengaju === "sdm") {
      if (JENIS_KAUR_FINAL.includes(jenisIzin)) {
        // SDM: pulang_awal/keluar_jam_kerja → skip KAUR, langsung selesai
        initialStatus = "disetujui_final";
        autoKaurData = {
          status_kaur: "disetujui",
          approved_by_kaur: pegawai.nip,
          approved_at_kaur: new Date(),
          catatan_kaur: "Auto-disetujui final (pengaju adalah SDM)",
        };
      } else {
        // SDM: tidak_masuk → skip KAUR, langsung ke KABAG
        initialStatus = "disetujui_kaur";
        autoKaurData = {
          status_kaur: "disetujui",
          approved_by_kaur: pegawai.nip,
          approved_at_kaur: new Date(),
          catatan_kaur: "Auto-disetujui (pengaju adalah SDM, langsung ke KABAG)",
        };
      }
    } else if (rolePengaju === "direktur") {
      if (JENIS_KAUR_FINAL.includes(jenisIzin)) {
        // pulang_awal / keluar_jam_kerja → direktur skip KAUR, langsung selesai
        initialStatus = "disetujui_final";
        autoKaurData = {
          status_kaur: "auto",
          approved_by_kaur: "SYSTEM",
          approved_at_kaur: new Date(),
          catatan_kaur: "Auto-disetujui final (pengaju adalah Direktur)",
        };
      } else {
        // tidak_masuk → skip KAUR & KABAG, langsung ke antrian Direksi
        initialStatus = "pending_direksi";
        autoKaurData = {
          status_kaur: "auto",
          approved_by_kaur: "SYSTEM",
          approved_at_kaur: new Date(),
          catatan_kaur: "Auto-disetujui (pengaju adalah Direktur, skip KAUR/KABAG)",
        };
      }
    }
    // admin/it: alur normal pending → KAUR → KABAG (initialStatus tetap "pending")

    const izin = await this.prisma.izin.create({
      data: {
        pegawaiId: pegawai.id,
        jenis_izin: jenisIzin,
        tanggal: tanggalIzin,
        jam_mulai: dto.jam_mulai?.trim() || null,
        jam_selesai: dto.jam_selesai?.trim() || null,
        alasan: dto.alasan.trim(),
        status: initialStatus,
        is_urgent: false,
        ...autoKaurData,
      },
      select: {
        id: true, jenis_izin: true, tanggal: true, jam_mulai: true,
        jam_selesai: true, alasan: true, status: true, is_urgent: true, created_at: true,
      },
    });

    let lampiran: any = null;
    if (file) {
      lampiran = await this.prisma.lampiranPengajuan.create({
        data: {
          izinId: izin.id,
          nama_file: file.originalname,
          path_file: file.path.replace(/\\/g, "/"),
          tipe_file: file.mimetype,
          ukuran_file: file.size,
        },
      });
    }

    return {
      message: "Pengajuan izin berhasil dibuat",
      data: { pegawai, pengajuan: { ...izin, lampiran } },
    };
  }

  async findMine(identifier: string) {
    const pegawai = await this.findPegawaiByIdentifier(identifier);

    if (!pegawai) throw new NotFoundException("Data pegawai tidak ditemukan");

    const izinList = await this.prisma.izin.findMany({
      where: { pegawaiId: pegawai.id },
      orderBy: { created_at: "asc" },
      select: {
        id: true, jenis_izin: true, tanggal: true, jam_mulai: true,
        jam_selesai: true, alasan: true, status: true,
        status_kaur: true, approved_by_kaur: true, approved_at_kaur: true,
        catatan_kaur: true, rejected_reason_kaur: true,
        status_kabag: true, approved_by_kabag: true, approved_at_kabag: true,
        catatan_kabag: true, rejected_reason_kabag: true,
        status_direktur: true, approved_by_direktur: true,
        approved_at_direktur: true, catatan_direktur: true,
        rejected_reason_direktur: true,
        created_at: true, lampiran: true,
      },
    });

    return {
      message: "Riwayat pengajuan izin berhasil diambil",
      data: { pegawai, total: izinList.length, items: izinList },
    };
  }

  async findPendingForKaur(nipKaur?: string) {
    let unitFilter: string | undefined;
    if (nipKaur) {
      const kaur = await this.prisma.pegawai.findFirst({
        where: { OR: [{ nip: nipKaur }, { username: nipKaur }] },
        select: { unit: true },
      });
      unitFilter = kaur?.unit?.trim() || undefined;
    }

    const where: any = { status: "pending" };
    if (unitFilter) where.pegawai = { unit: unitFilter };

    const izinList = await this.prisma.izin.findMany({
      where,
      orderBy: { created_at: "asc" },
      select: {
        id: true, jenis_izin: true, tanggal: true, jam_mulai: true,
        jam_selesai: true, alasan: true, status: true, is_urgent: true,
        created_at: true, lampiran: true,
        pegawai: { select: { nip: true, nama: true, jabatan: true, unit: true } },
      },
    });

    return {
      message: "Daftar pengajuan izin pending untuk Kaur berhasil diambil",
      data: { total: izinList.length, items: izinList },
    };
  }

  async findPendingForKabag(nipKabag?: string) {
    let unitFilter: string | undefined;
    let kabagId: number | undefined;
    if (nipKabag) {
      const kabag = await this.prisma.pegawai.findFirst({
        where: { OR: [{ nip: nipKabag }, { username: nipKabag }] },
        select: { unit: true, id: true },
      });
      unitFilter = kabag?.unit?.trim() || undefined;
      kabagId    = kabag?.id;
    }

    const where: any = { status: "disetujui_kaur", jenis_izin: "tidak_masuk" };
    const pegawaiFilter: any = {};
    if (unitFilter) pegawaiFilter.unit = unitFilter;
    // Exclude pengajuan KABAG sendiri lewat id (null-safe; nip bisa null utk pegawai kontrak)
    if (kabagId)    pegawaiFilter.id   = { not: kabagId };
    if (Object.keys(pegawaiFilter).length > 0) where.pegawai = pegawaiFilter;

    const izinList = await this.prisma.izin.findMany({
      where,
      orderBy: { created_at: "asc" },
      select: {
        id: true, jenis_izin: true, tanggal: true, jam_mulai: true,
        jam_selesai: true, alasan: true, status: true, is_urgent: true,
        status_kaur: true, approved_by_kaur: true, approved_at_kaur: true,
        catatan_kaur: true, created_at: true, lampiran: true,
        pegawai: { select: { nip: true, nama: true, jabatan: true, unit: true } },
      },
    });

    return {
      message: "Daftar pengajuan izin menunggu persetujuan Kabag berhasil diambil",
      data: { total: izinList.length, items: izinList },
    };
  }

  async findPendingForDirektur(nipDirektur?: string) {
    let unitFilter: string | undefined;
    if (nipDirektur) {
      const direktur = await this.prisma.pegawai.findFirst({
        where: { OR: [{ nip: nipDirektur }, { username: nipDirektur }] },
        select: { unit: true },
      });
      unitFilter = direktur?.unit?.trim() || undefined;
    }

    const where: any = { status: "pending_direktur" };
    if (unitFilter) where.pegawai = { unit: unitFilter };

    const izinList = await this.prisma.izin.findMany({
      where,
      orderBy: { created_at: "asc" },
      select: {
        id: true, jenis_izin: true, tanggal: true, jam_mulai: true,
        jam_selesai: true, alasan: true, status: true, is_urgent: true,
        status_direktur: true,
        created_at: true, lampiran: true,
        pegawai: { select: { nip: true, nama: true, jabatan: true, unit: true } },
      },
    });

    return {
      message: "Daftar izin menunggu persetujuan Direktur Administrasi berhasil diambil",
      data: { total: izinList.length, items: izinList },
    };
  }

  async findMonitoringForSdm() {
    const izinList = await this.prisma.izin.findMany({
      orderBy: { created_at: "desc" },
      select: {
        id: true, jenis_izin: true, tanggal: true, jam_mulai: true,
        jam_selesai: true, alasan: true, status: true,
        status_kaur: true, approved_by_kaur: true, approved_at_kaur: true,
        catatan_kaur: true, rejected_reason_kaur: true,
        status_kabag: true, approved_by_kabag: true, approved_at_kabag: true,
        catatan_kabag: true, rejected_reason_kabag: true,
        status_direktur: true, approved_by_direktur: true,
        approved_at_direktur: true, catatan_direktur: true,
        rejected_reason_direktur: true,
        status_direksi: true, approved_by_direksi: true,
        approved_at_direksi: true, catatan_direksi: true,
        rejected_reason_direksi: true,
        created_at: true, lampiran: true,
        pegawai: { select: { nip: true, nama: true, jabatan: true, unit: true } },
      },
    });

    return {
      message: "Monitoring izin SDM berhasil diambil",
      data: { total: izinList.length, items: izinList },
    };
  }

  // ── Riwayat keputusan (KAUR & KABAG) — per unit, status sudah terminal ──────
  // Termasuk izin auto-selesai (terlambat/tidak_apel: status="selesai",
  // status_kaur="auto"). Tanpa notifikasi (modul izin memang tidak berkirim notif).
  private readonly RIWAYAT_EXCLUDE = ["pending", "disetujui_kaur", "pending_direktur", "pending_direksi"];

  async findRiwayatForKaur(nipKaur?: string) {
    return this.findRiwayatByUnit(nipKaur);
  }

  async findRiwayatForKabag(nipKabag?: string) {
    return this.findRiwayatByUnit(nipKabag);
  }

  private async findRiwayatByUnit(nipViewer?: string) {
    let unitFilter: string | undefined;
    if (nipViewer) {
      const viewer = await this.prisma.pegawai.findFirst({
        where: { OR: [{ nip: nipViewer }, { username: nipViewer }] },
        select: { unit: true },
      });
      unitFilter = viewer?.unit?.trim() || undefined;
    }
    // Tanpa unit → kembalikan kosong (hindari bocor lintas unit)
    if (!unitFilter) {
      return { message: "Riwayat izin: unit tidak diketahui", data: { total: 0, items: [] } };
    }

    const izinList = await this.prisma.izin.findMany({
      where: {
        status: { notIn: this.RIWAYAT_EXCLUDE },
        pegawai: { unit: unitFilter },
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true, jenis_izin: true, tanggal: true, jam_mulai: true, jam_selesai: true,
        alasan: true, status: true,
        status_kaur: true, approved_by_kaur: true, approved_at_kaur: true, catatan_kaur: true,
        status_kabag: true, approved_by_kabag: true, approved_at_kabag: true, catatan_kabag: true,
        created_at: true, updated_at: true, lampiran: true,
        pegawai: { select: { nip: true, nama: true, jabatan: true, unit: true } },
      },
    });

    return {
      message: "Riwayat keputusan izin berhasil diambil",
      data: { total: izinList.length, items: izinList },
    };
  }

  async approveByKaur(id: number, nipKaur: string, catatan?: string) {
    const izin = await this.prisma.izin.findUnique({ where: { id } });
    if (!izin) throw new NotFoundException("Data izin tidak ditemukan");
    if (izin.status !== "pending") {
      throw new BadRequestException("Izin ini tidak dalam status pending dan tidak dapat diproses oleh Kaur");
    }

    // pulang_awal & keluar_jam_kerja → Kaur adalah approver FINAL
    // tidak_masuk → Kaur approve dulu, lalu ke Kabag
    const isKaurFinal = ["pulang_awal", "keluar_jam_kerja"].includes(izin.jenis_izin);
    const nextStatus = isKaurFinal ? "disetujui_final" : "disetujui_kaur";

    const updated = await this.prisma.izin.update({
      where: { id },
      data: {
        status: nextStatus,
        status_kaur: "disetujui",
        approved_by_kaur: nipKaur,
        approved_at_kaur: new Date(),
        catatan_kaur: this.nullableTrim(catatan),
        rejected_reason_kaur: null,
      },
      select: { id: true, jenis_izin: true, tanggal: true, jam_mulai: true, jam_selesai: true, status: true, created_at: true },
    });

    await this.auditLogService.createLog({
      actor_nip: nipKaur, actor_role: "kaur",
      action: "APPROVE_IZIN_KAUR", entity: "izin", entity_id: String(izin.id),
      description: `KAUR menyetujui pengajuan izin ID ${izin.id} (${isKaurFinal ? "final" : "diteruskan ke Kabag"})`,
      old_value: { status: izin.status }, new_value: { status: updated.status, catatan: this.nullableTrim(catatan) },
    });

    const message = isKaurFinal
      ? "Izin berhasil disetujui final oleh Kaur"
      : "Izin berhasil disetujui oleh Kaur, diteruskan ke Kabag";
    return { message, data: updated };
  }

  async rejectByKaur(id: number, nipKaur: string, alasan: string) {
    const izin = await this.prisma.izin.findUnique({ where: { id } });
    if (!izin) throw new NotFoundException("Data izin tidak ditemukan");
    if (izin.status !== "pending") {
      throw new BadRequestException("Izin ini tidak dalam status pending dan tidak dapat ditolak oleh Kaur");
    }
    if (!alasan?.trim()) throw new BadRequestException("Alasan penolakan wajib diisi");

    const updated = await this.prisma.izin.update({
      where: { id },
      data: {
        status: "ditolak_kaur",
        status_kaur: "ditolak",
        approved_by_kaur: nipKaur,
        approved_at_kaur: new Date(),
        catatan_kaur: null,
        rejected_reason_kaur: alasan.trim(),
      },
      select: { id: true, jenis_izin: true, tanggal: true, status: true, created_at: true },
    });

    await this.auditLogService.createLog({
      actor_nip: nipKaur, actor_role: "kaur",
      action: "REJECT_IZIN_KAUR", entity: "izin", entity_id: String(izin.id),
      description: `KAUR menolak pengajuan izin ID ${izin.id}`,
      old_value: { status: izin.status }, new_value: { status: updated.status, alasan },
    });

    return { message: "Izin berhasil ditolak oleh Kaur", data: updated };
  }

  async approveByKabag(id: number, nipKabag: string, catatan?: string) {
    const izin = await this.prisma.izin.findUnique({ where: { id } });
    if (!izin) throw new NotFoundException("Data izin tidak ditemukan");
    if (izin.status !== "disetujui_kaur") {
      throw new BadRequestException("Izin ini belum disetujui Kaur atau sudah diproses Kabag");
    }
    if (izin.jenis_izin !== "tidak_masuk") {
      throw new BadRequestException("Kabag hanya dapat menyetujui izin tidak masuk kerja");
    }

    // Kabag adalah approver final untuk izin tidak_masuk
    const updated = await this.prisma.izin.update({
      where: { id },
      data: {
        status: "disetujui_final",
        status_kabag: "disetujui",
        approved_by_kabag: nipKabag,
        approved_at_kabag: new Date(),
        catatan_kabag: this.nullableTrim(catatan),
        rejected_reason_kabag: null,
      },
      select: {
        id: true, jenis_izin: true, tanggal: true, jam_mulai: true, jam_selesai: true,
        status: true, status_kaur: true, status_kabag: true,
        approved_by_kabag: true, approved_at_kabag: true, catatan_kabag: true, created_at: true,
      },
    });

    await this.auditLogService.createLog({
      actor_nip: nipKabag, actor_role: "kabag",
      action: "APPROVE_IZIN_FINAL", entity: "izin", entity_id: String(izin.id),
      description: `KABAG menyetujui final pengajuan izin ID ${izin.id}`,
      old_value: { status: izin.status }, new_value: { status: updated.status, catatan: this.nullableTrim(catatan) },
    });

    return { message: "Izin berhasil disetujui final oleh Kabag", data: updated };
  }

  async rejectByKabag(id: number, nipKabag: string, alasan: string) {
    const izin = await this.prisma.izin.findUnique({ where: { id } });
    if (!izin) throw new NotFoundException("Data izin tidak ditemukan");
    if (izin.status !== "disetujui_kaur") {
      throw new BadRequestException("Izin ini belum disetujui Kaur atau sudah diproses Kabag");
    }
    if (izin.jenis_izin !== "tidak_masuk") {
      throw new BadRequestException("Kabag hanya dapat menolak izin tidak masuk kerja");
    }
    if (!alasan?.trim()) throw new BadRequestException("Alasan penolakan wajib diisi");

    const updated = await this.prisma.izin.update({
      where: { id },
      data: {
        status: "ditolak_kabag",
        status_kabag: "ditolak",
        approved_by_kabag: nipKabag,
        approved_at_kabag: new Date(),
        catatan_kabag: null,
        rejected_reason_kabag: alasan.trim(),
      },
      select: { id: true, jenis_izin: true, tanggal: true, status: true, created_at: true },
    });

    await this.auditLogService.createLog({
      actor_nip: nipKabag, actor_role: "kabag",
      action: "REJECT_IZIN_KABAG", entity: "izin", entity_id: String(izin.id),
      description: `KABAG menolak pengajuan izin ID ${izin.id}`,
      old_value: { status: izin.status }, new_value: { status: updated.status, alasan },
    });

    return { message: "Izin berhasil ditolak oleh Kabag", data: updated };
  }

  async approveByDirektur(id: number, nipDirektur: string, catatan?: string) {
    const izin = await this.prisma.izin.findUnique({ where: { id } });
    if (!izin) throw new NotFoundException("Data izin tidak ditemukan");
    if (izin.status !== "pending_direktur") {
      throw new BadRequestException("Izin ini tidak menunggu persetujuan Direktur Administrasi");
    }

    const updated = await this.prisma.izin.update({
      where: { id },
      data: {
        status: "disetujui_final",
        status_direktur: "disetujui",
        approved_by_direktur: nipDirektur,
        approved_at_direktur: new Date(),
        catatan_direktur: this.nullableTrim(catatan),
        rejected_reason_direktur: null,
      },
      select: {
        id: true, jenis_izin: true, tanggal: true, jam_mulai: true, jam_selesai: true,
        status: true, status_direktur: true,
        approved_by_direktur: true, catatan_direktur: true, created_at: true,
      },
    });

    await this.auditLogService.createLog({
      actor_nip: nipDirektur, actor_role: "direktur",
      action: "APPROVE_IZIN_DIREKTUR", entity: "izin", entity_id: String(izin.id),
      description: `Direktur Administrasi menyetujui pengajuan izin ID ${izin.id}`,
      old_value: { status: izin.status }, new_value: { status: updated.status, catatan: this.nullableTrim(catatan) },
    });

    return { message: "Izin berhasil disetujui oleh Direktur Administrasi", data: updated };
  }

  async rejectByDirektur(id: number, nipDirektur: string, alasan: string) {
    const izin = await this.prisma.izin.findUnique({ where: { id } });
    if (!izin) throw new NotFoundException("Data izin tidak ditemukan");
    if (izin.status !== "pending_direktur") {
      throw new BadRequestException("Izin ini tidak menunggu persetujuan Direktur Administrasi");
    }
    if (!alasan?.trim()) throw new BadRequestException("Alasan penolakan wajib diisi");

    const updated = await this.prisma.izin.update({
      where: { id },
      data: {
        status: "ditolak_direktur",
        status_direktur: "ditolak",
        approved_by_direktur: nipDirektur,
        approved_at_direktur: new Date(),
        catatan_direktur: null,
        rejected_reason_direktur: alasan.trim(),
      },
      select: { id: true, jenis_izin: true, tanggal: true, status: true, created_at: true },
    });

    await this.auditLogService.createLog({
      actor_nip: nipDirektur, actor_role: "direktur",
      action: "REJECT_IZIN_DIREKTUR", entity: "izin", entity_id: String(izin.id),
      description: `Direktur Administrasi menolak pengajuan izin ID ${izin.id}`,
      old_value: { status: izin.status }, new_value: { status: updated.status, alasan },
    });

    return { message: "Izin berhasil ditolak oleh Direktur Administrasi", data: updated };
  }

  async findPendingForDireksi() {
    const izinList = await this.prisma.izin.findMany({
      where: { status: "pending_direksi" },
      orderBy: { created_at: "asc" },
      select: {
        id: true, jenis_izin: true, tanggal: true, jam_mulai: true,
        jam_selesai: true, alasan: true, status: true, is_urgent: true,
        created_at: true, lampiran: true,
        pegawai: { select: { nip: true, nama: true, jabatan: true, unit: true } },
      },
    });

    return {
      message: "Daftar izin menunggu persetujuan Direksi berhasil diambil",
      data: { total: izinList.length, items: izinList },
    };
  }

  async approveByDireksi(id: number, nipDireksi: string, catatan?: string) {
    const izin = await this.prisma.izin.findUnique({ where: { id } });
    if (!izin) throw new NotFoundException("Data izin tidak ditemukan");
    if (izin.status !== "pending_direksi") {
      throw new BadRequestException("Izin ini tidak menunggu persetujuan Direksi");
    }

    const updated = await this.prisma.izin.update({
      where: { id },
      data: {
        status: "disetujui_final",
        status_direksi: "disetujui",
        approved_by_direksi: nipDireksi,
        approved_at_direksi: new Date(),
        catatan_direksi: this.nullableTrim(catatan),
        rejected_reason_direksi: null,
      },
      select: { id: true, jenis_izin: true, tanggal: true, status: true, created_at: true },
    });

    await this.auditLogService.createLog({
      actor_nip: nipDireksi, actor_role: "direksi",
      action: "APPROVE_IZIN_DIREKSI", entity: "izin", entity_id: String(izin.id),
      description: `Direksi menyetujui pengajuan izin ID ${izin.id}`,
      old_value: { status: izin.status }, new_value: { status: updated.status, catatan: this.nullableTrim(catatan) },
    });

    return { message: "Izin berhasil disetujui oleh Direksi", data: updated };
  }

  async rejectByDireksi(id: number, nipDireksi: string, alasan: string) {
    const izin = await this.prisma.izin.findUnique({ where: { id } });
    if (!izin) throw new NotFoundException("Data izin tidak ditemukan");
    if (izin.status !== "pending_direksi") {
      throw new BadRequestException("Izin ini tidak menunggu persetujuan Direksi");
    }
    if (!alasan?.trim()) throw new BadRequestException("Alasan penolakan wajib diisi");

    const updated = await this.prisma.izin.update({
      where: { id },
      data: {
        status: "ditolak_direksi",
        status_direksi: "ditolak",
        approved_by_direksi: nipDireksi,
        approved_at_direksi: new Date(),
        catatan_direksi: null,
        rejected_reason_direksi: alasan.trim(),
      },
      select: { id: true, jenis_izin: true, tanggal: true, status: true, created_at: true },
    });

    await this.auditLogService.createLog({
      actor_nip: nipDireksi, actor_role: "direksi",
      action: "REJECT_IZIN_DIREKSI", entity: "izin", entity_id: String(izin.id),
      description: `Direksi menolak pengajuan izin ID ${izin.id}`,
      old_value: { status: izin.status }, new_value: { status: updated.status, alasan },
    });

    return { message: "Izin berhasil ditolak oleh Direksi", data: updated };
  }

  async generateIzinPdf(id: number): Promise<Buffer> {
    const izin = await this.prisma.izin.findUnique({
      where: { id },
      include: { pegawai: true, lampiran: true },
    });

    if (!izin) throw new NotFoundException("Data izin tidak ditemukan");
    if (!["disetujui_final", "selesai"].includes(izin.status)) {
      throw new BadRequestException("PDF hanya dapat diunduh setelah izin disetujui");
    }

    await this.auditLogService.createLog({
      actor_nip: izin.pegawai?.nip || null,
      actor_name: izin.pegawai?.nama || null,
      actor_role: "pegawai",
      action: "DOWNLOAD_PDF_IZIN", entity: "izin", entity_id: String(izin.id),
      description: `PDF surat izin ID ${izin.id} diunduh`,
      new_value: { status: izin.status, nama: izin.pegawai?.nama, nip: izin.pegawai?.nip },
    });

    const approvedBy = izin.approved_by_direktur || izin.approved_by_kabag || "-";
    const approvedAt = izin.approved_at_direktur || izin.approved_at_kabag;

    const qrText = `
SIMCI RSGM
FORMULIR PERMOHONAN IZIN
ID: IZIN-${izin.id}
Nama: ${izin.pegawai?.nama || "-"}
NIP: ${izin.pegawai?.nip || "-"}
Jenis Izin: ${izin.jenis_izin || "-"}
Status: ${izin.status}
Disetujui oleh: ${approvedBy}
Tanggal Approval: ${approvedAt ? new Date(approvedAt).toLocaleString("id-ID") : "-"}
`;

    const qrDataUrl = await QRCode.toDataURL(qrText);
    const logoYayasanPath = path.join(process.cwd(), "src/assets/logo-yayasan.png");
    const logoRsgmPath = path.join(process.cwd(), "src/assets/logo-rsgm.jpeg");

    return new Promise((resolve) => {
      const doc = new PDFDocument({ size: "A4", margin: 35 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const formatDate = (date?: Date | null) => date ? new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";
      const formatJenisIzin = (jenis?: string | null) => {
        const map: Record<string, string> = {
          terlambat: "Izin Datang Terlambat",
          tidak_masuk: "Izin Tidak Masuk Kerja",
          tidak_apel: "Izin Tidak Mengikuti Apel",
          pulang_awal: "Izin Pulang Sebelum Waktunya",
          keluar_jam_kerja: "Izin Keluar di Jam Kerja",
        };
        return jenis ? map[jenis] || jenis : "-";
      };

      const tanggalIzin = formatDate(izin.tanggal);
      const tanggalCetak = formatDate(new Date());
      const signaturePath = izin.pegawai?.ttd_digital
        ? path.join(process.cwd(), izin.pegawai.ttd_digital.replace("/uploads/", "uploads/"))
        : null;

      const drawHeader = () => {
        try { doc.image(logoYayasanPath, 35, 25, { width: 55 }); } catch { doc.font("Times-Roman").fontSize(8).text("Logo Yayasan", 35, 45); }
        try { doc.image(logoRsgmPath, 505, 25, { width: 55 }); } catch { doc.font("Times-Roman").fontSize(8).text("Logo RSGM", 505, 45); }
        doc.font("Times-Bold").fontSize(16).fillColor("black").text("YAYASAN KARTIKA EKA PAKSI", 0, 30, { align: "center" });
        doc.font("Times-Bold").fontSize(15).text("RUMAH SAKIT GIGI DAN MULUT UNJANI", { align: "center" });
        doc.font("Times-Roman").fontSize(8.5).text("Jl. Encep Kartawiria No. 88 Citeureup Cimahi Utara Kota Cimahi", { align: "center" });
        doc.font("Times-Roman").fontSize(8).text("Telp. (022) – 86001401, 86001402, 86001403", { align: "center" });
        doc.moveTo(35, 107).lineTo(560, 107).lineWidth(1).stroke();
        doc.moveTo(35, 111).lineTo(560, 111).lineWidth(0.5).stroke();
      };

      drawHeader();
      doc.y = 140;
      doc.font("Times-Bold").fontSize(15).text("FORMULIR PERMOHONAN IZIN", { align: "center" });
      doc.moveDown(2);
      doc.font("Times-Roman").fontSize(11).text("Yang bertanda tangan di bawah ini :", 35, doc.y);
      doc.moveDown(0.8);

      const leftX = 35, colonX = 210, valueX = 225;
      const row = (label: string, value: string) => {
        const y = doc.y;
        doc.font("Times-Roman").fontSize(11).fillColor("black");
        doc.text(label, leftX, y);
        doc.text(":", colonX, y);
        doc.text(value || "-", valueX, y, { width: 320 });
        doc.moveDown(0.7);
      };

      row("Nama", izin.pegawai?.nama || "-");
      row("NIP", izin.pegawai?.nip || "-");
      row("Bagian/Jabatan", izin.pegawai?.jabatan || "-");
      row("Jenis Izin", formatJenisIzin(izin.jenis_izin));
      row("Tanggal Izin", tanggalIzin);
      row("Jam", `${izin.jam_mulai || "-"} s/d ${izin.jam_selesai || "-"}`);
      row("Alasan", izin.alasan || "-");
      row("Status", "Disetujui Final");

      doc.moveDown(2);
      doc.text(
        "Dengan ini mengajukan permohonan izin sesuai keterangan di atas. Permohonan ini telah diproses melalui alur persetujuan SIMCI RSGM.",
        35, doc.y, { width: 520, align: "justify" },
      );

      doc.y = Math.max(doc.y + 45, 390);
      doc.font("Times-Roman").fontSize(11).text(`Cimahi, ${tanggalCetak}`, 350, doc.y);
      doc.moveDown(1.2);

      const signatureTop = doc.y;
      doc.text("Mengetahui", 80, signatureTop, { width: 170, align: "center" });
      doc.text("Hormat saya", 365, signatureTop, { width: 150, align: "center" });
      doc.text("Direktur Adm. & Ops RSGM", 55, signatureTop + 25, { width: 220, align: "center" });
      doc.text("........................................", 80, signatureTop + 95, { width: 170, align: "center" });
      doc.text("Dendy Ari Kurniawan, S.H.,M.H", 55, signatureTop + 115, { width: 220, align: "center" });
      doc.text("........................................", 355, signatureTop + 95, { width: 170, align: "center" });

      if (signaturePath) {
        try { doc.image(signaturePath, 395, signatureTop + 35, { width: 110, height: 60, fit: [90, 50] }); } catch {}
      }
      doc.text(izin.pegawai?.nama || "", 355, signatureTop + 115, { width: 170, align: "center" });

      doc.image(qrDataUrl, 40, 680, { width: 70 });
      doc.font("Times-Roman").fontSize(8).text("QR Verifikasi Digital SIMCI RSGM", 35, 775);
      doc.font("Times-Roman").fontSize(8).fillColor("#555555").text(`Dokumen: IZIN-${izin.id}`, 430, 775, { align: "right" });

      doc.end();
    });
  }
}
