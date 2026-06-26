import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import * as path from "path";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../../prisma.service";
import { CreateLeaveRequestDto } from "./dto/create-leave-request.dto";
import { NotificationsGateway } from "../notifications/notifications.gateway";

const KUOTA_CUTI: Record<string, number> = {
  tahunan: 12,
  besar: 10,
  haid: 1,
  menikah: 3,
  melahirkan: 90,
};

const CUTI_NON_TAHUNAN = ["besar", "haid", "menikah", "melahirkan"];

@Injectable()
export class CutiService {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

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

  private isUrgentSubmission(targetDate: Date): boolean {
    const today = this.startOfDay(new Date());
    const target = this.startOfDay(targetDate);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }

  private async findPegawaiByIdentifier(identifier: string) {
    return this.prisma.pegawai.findFirst({
      where: { OR: [{ nip: identifier }, { username: identifier }] },
      select: { id: true, nip: true, nama: true, jabatan: true, role: true, internal_role: true, unit: true, jenis_kelamin: true },
    });
  }

  private nullableTrim(value?: string | null): string | null {
    const trimmed = String(value || "").trim();
    return trimmed ? trimmed : null;
  }

  private calculateDurationInDays(start: Date, end: Date): number {
    const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    return Math.floor((utcEnd - utcStart) / (1000 * 60 * 60 * 24)) + 1;
  }

  // Hitung hari cuti tahunan yang sudah dipakai (termasuk izin tidak_masuk)
  private async calculateUsedTahunan(pegawaiId: number): Promise<number> {
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
      return total + this.calculateDurationInDays(
        this.startOfDay(item.tanggal_mulai),
        this.startOfDay(item.tanggal_selesai),
      );
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

    return cutiDays + izinTidakMasuk;
  }

  // Hitung hari cuti non-tahunan yang sudah dipakai (per tahun)
  private async calculateUsedNonTahunan(pegawaiId: number, jenis: string): Promise<number> {
    const year = new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    const approved = await this.prisma.cuti.findMany({
      where: {
        pegawaiId,
        jenis_cuti: jenis,
        status: "disetujui_final",
        tanggal_mulai: { gte: yearStart, lte: yearEnd },
      },
      select: { tanggal_mulai: true, tanggal_selesai: true },
    });

    return approved.reduce((total, item) => {
      return total + this.calculateDurationInDays(
        this.startOfDay(item.tanggal_mulai),
        this.startOfDay(item.tanggal_selesai),
      );
    }, 0);
  }

  async getSisaCutiSemuaPegawai() {
    const year = new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd   = new Date(year, 11, 31, 23, 59, 59);

    // Fetch semua data sekaligus — hindari N+1
    const [allPegawai, allCuti, allIzinTidakMasuk] = await Promise.all([
      this.prisma.pegawai.findMany({
        select: { id: true, nip: true, nama: true, jabatan: true, unit: true, jenis_kelamin: true },
        orderBy: { nama: "asc" },
      }),
      this.prisma.cuti.findMany({
        where: { status: "disetujui_final", tanggal_mulai: { gte: yearStart, lte: yearEnd } },
        select: { pegawaiId: true, jenis_cuti: true, tanggal_mulai: true, tanggal_selesai: true },
      }),
      this.prisma.izin.findMany({
        where: {
          jenis_izin: "tidak_masuk",
          status: "disetujui_final",
          tanggal: { gte: yearStart, lte: yearEnd },
          // Izin sakit dengan surat dokter tidak memotong jatah cuti
          NOT: {
            alasan: { contains: "sakit", mode: "insensitive" },
            lampiran: { some: {} },
          },
        },
        select: { pegawaiId: true },
      }),
    ]);

    // Index by pegawaiId
    const cutiByPegawai = new Map<number, typeof allCuti>();
    for (const c of allCuti) {
      if (!cutiByPegawai.has(c.pegawaiId)) cutiByPegawai.set(c.pegawaiId, []);
      cutiByPegawai.get(c.pegawaiId)!.push(c);
    }
    const izinCountByPegawai = new Map<number, number>();
    for (const i of allIzinTidakMasuk) {
      izinCountByPegawai.set(i.pegawaiId, (izinCountByPegawai.get(i.pegawaiId) || 0) + 1);
    }

    const items = allPegawai.map((p) => {
      const cutiList = cutiByPegawai.get(p.id) || [];
      const usedByJenis: Record<string, number> = { tahunan: 0, besar: 0, haid: 0, menikah: 0, melahirkan: 0 };
      for (const c of cutiList) {
        const days = this.calculateDurationInDays(this.startOfDay(c.tanggal_mulai), this.startOfDay(c.tanggal_selesai));
        if (c.jenis_cuti in usedByJenis) usedByJenis[c.jenis_cuti] += days;
      }
      usedByJenis.tahunan += izinCountByPegawai.get(p.id) || 0;

      return {
        ...p,
        kuota: {
          tahunan:    { jatah: KUOTA_CUTI.tahunan,    terpakai: usedByJenis.tahunan,    sisa: Math.max(KUOTA_CUTI.tahunan    - usedByJenis.tahunan,    0) },
          besar:      { jatah: KUOTA_CUTI.besar,      terpakai: usedByJenis.besar,      sisa: Math.max(KUOTA_CUTI.besar      - usedByJenis.besar,      0) },
          haid:       { jatah: KUOTA_CUTI.haid,       terpakai: usedByJenis.haid,       sisa: Math.max(KUOTA_CUTI.haid       - usedByJenis.haid,       0) },
          menikah:    { jatah: KUOTA_CUTI.menikah,    terpakai: usedByJenis.menikah,    sisa: Math.max(KUOTA_CUTI.menikah    - usedByJenis.menikah,    0) },
          melahirkan: { jatah: KUOTA_CUTI.melahirkan, terpakai: usedByJenis.melahirkan, sisa: Math.max(KUOTA_CUTI.melahirkan - usedByJenis.melahirkan, 0) },
        },
      };
    });

    return { message: "Sisa cuti semua pegawai berhasil diambil", data: { total: items.length, items } };
  }

  async getSisaCutiByNip(identifier: string) {
    const pegawai = await this.findPegawaiByIdentifier(identifier);

    if (!pegawai) throw new NotFoundException("Data pegawai tidak ditemukan");

    const usedTahunan = await this.calculateUsedTahunan(pegawai.id);
    const usedBesar = await this.calculateUsedNonTahunan(pegawai.id, "besar");
    const usedHaid = await this.calculateUsedNonTahunan(pegawai.id, "haid");
    const usedMenikah = await this.calculateUsedNonTahunan(pegawai.id, "menikah");
    const usedMelahirkan = await this.calculateUsedNonTahunan(pegawai.id, "melahirkan");

    return {
      message: "Sisa kuota cuti berhasil diambil",
      data: {
        pegawai,
        kuota: {
          tahunan: { jatah: KUOTA_CUTI.tahunan, terpakai: usedTahunan, sisa: Math.max(KUOTA_CUTI.tahunan - usedTahunan, 0) },
          besar: { jatah: KUOTA_CUTI.besar, terpakai: usedBesar, sisa: Math.max(KUOTA_CUTI.besar - usedBesar, 0) },
          haid: { jatah: KUOTA_CUTI.haid, terpakai: usedHaid, sisa: Math.max(KUOTA_CUTI.haid - usedHaid, 0) },
          menikah: { jatah: KUOTA_CUTI.menikah, terpakai: usedMenikah, sisa: Math.max(KUOTA_CUTI.menikah - usedMenikah, 0) },
          melahirkan: { jatah: KUOTA_CUTI.melahirkan, terpakai: usedMelahirkan, sisa: Math.max(KUOTA_CUTI.melahirkan - usedMelahirkan, 0) },
        },
      },
    };
  }

  async create(dto: CreateLeaveRequestDto, file?: Express.Multer.File) {
    const pegawai = await this.findPegawaiByIdentifier(String(dto.nip));

    if (!pegawai) throw new NotFoundException("Data pegawai tidak ditemukan");

    const CUTI_ALLOWED_ROLES = ["pegawai", "kaur", "kabag", "sdm", "admin", "it"];
    const pegawaiRole = String(pegawai.role || "").toLowerCase().trim();
    if (!CUTI_ALLOWED_ROLES.includes(pegawaiRole)) {
      throw new ForbiddenException("Anda tidak memiliki akses untuk mengajukan cuti");
    }

    const jenisCuti = dto.jenis_cuti.trim().toLowerCase();
    const validJenis = Object.keys(KUOTA_CUTI);
    if (!validJenis.includes(jenisCuti)) {
      throw new BadRequestException(`Jenis cuti tidak valid. Pilih: ${validJenis.join(", ")}`);
    }

    const tanggalMulai = this.startOfDay(this.parseLocalDate(dto.tanggal_mulai));
    const tanggalSelesai = this.startOfDay(this.parseLocalDate(dto.tanggal_selesai));
    const tanggalKembali = dto.tanggal_kembali
      ? this.startOfDay(this.parseLocalDate(dto.tanggal_kembali))
      : null;

    const hariIni = this.startOfDay(new Date());

    if (tanggalMulai < hariIni) {
      throw new BadRequestException("Tanggal mulai cuti tidak boleh di masa lalu");
    }

    if (tanggalSelesai < tanggalMulai) {
      throw new BadRequestException("Tanggal selesai tidak boleh sebelum tanggal mulai");
    }

    if (tanggalKembali && tanggalKembali < tanggalSelesai) {
      throw new BadRequestException("Tanggal kembali tidak boleh sebelum tanggal selesai cuti");
    }

    const durasi = this.calculateDurationInDays(tanggalMulai, tanggalSelesai);
    const kuota = KUOTA_CUTI[jenisCuti];

    if (durasi > kuota) {
      throw new BadRequestException(
        `Durasi cuti ${jenisCuti} maksimal ${kuota} hari. Pengajuan Anda ${durasi} hari`,
      );
    }

    // Validasi kuota tahunan (termasuk izin tidak_masuk)
    if (jenisCuti === "tahunan") {
      const used = await this.calculateUsedTahunan(pegawai.id);
      const sisa = KUOTA_CUTI.tahunan - used;
      if (durasi > sisa) {
        throw new BadRequestException(
          `Pengajuan cuti melebihi sisa kuota tahunan. Sisa cuti Anda ${sisa} hari`,
        );
      }
    }

    // Validasi kuota cuti non-tahunan
    if (CUTI_NON_TAHUNAN.includes(jenisCuti)) {
      const used = await this.calculateUsedNonTahunan(pegawai.id, jenisCuti);
      const sisa = kuota - used;
      if (durasi > sisa) {
        throw new BadRequestException(
          `Pengajuan cuti ${jenisCuti} melebihi sisa kuota. Sisa kuota Anda ${sisa} hari`,
        );
      }
    }

    // Validasi khusus cuti haid
    if (jenisCuti === "haid") {
      if (pegawai.jenis_kelamin !== "P") {
        throw new BadRequestException("Jenis cuti ini hanya untuk pegawai perempuan");
      }
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const existingHaid = await this.prisma.cuti.findFirst({
        where: {
          pegawaiId: pegawai.id,
          jenis_cuti: "haid",
          status: { notIn: ["ditolak_kaur", "ditolak_kabag", "ditolak_direktur", "ditolak_direksi", "direset_admin"] },
          tanggal_mulai: { gte: monthStart, lte: monthEnd },
        },
        select: { id: true },
      });
      if (existingHaid) {
        throw new BadRequestException("Anda sudah menggunakan cuti haid bulan ini");
      }
    }

    // Validasi khusus cuti melahirkan
    if (jenisCuti === "melahirkan" && pegawai.jenis_kelamin !== "P") {
      throw new BadRequestException("Jenis cuti ini hanya untuk pegawai perempuan");
    }

    const overlappingLeave = await this.prisma.cuti.findFirst({
      where: {
        pegawaiId: pegawai.id,
        status: { in: ["pending", "disetujui_kaur", "pending_direktur", "disetujui_final"] },
        tanggal_mulai: { lte: tanggalSelesai },
        tanggal_selesai: { gte: tanggalMulai },
      },
      select: { id: true },
    });

    if (overlappingLeave) {
      throw new BadRequestException("Pengajuan cuti bentrok dengan data cuti yang sudah ada");
    }

    const isUrgent = this.isUrgentSubmission(tanggalMulai);

    // Tentukan status awal berdasarkan role pengaju
    const rolePengaju = (pegawai.internal_role || pegawai.role || "").toLowerCase();
    const isDokter = (pegawai.jabatan || "").toLowerCase().includes("dokter");
    let initialStatus = "pending";
    let autoKaurData: Record<string, any> = {};

    if (rolePengaju === "kaur") {
      // Kaur skip approval diri sendiri, langsung ke kabag
      initialStatus = "disetujui_kaur";
      autoKaurData = {
        status_kaur: "disetujui",
        approved_by_kaur: pegawai.nip,
        approved_at_kaur: new Date(),
        catatan_kaur: "Auto-disetujui (pengaju adalah Kaur)",
      };
    } else if (isDokter) {
      // Dokter skip KAUR, langsung ke KABAG
      initialStatus = "disetujui_kaur";
      autoKaurData = {
        status_kaur: "disetujui",
        approved_by_kaur: "SYSTEM",
        approved_at_kaur: new Date(),
        catatan_kaur: "Auto-disetujui (pengaju adalah Dokter, langsung ke KABAG)",
      };
    } else if (rolePengaju === "kabag") {
      // Kabag langsung ke direktur administrasi
      initialStatus = "pending_direktur";
    } else if (rolePengaju === "direktur") {
      // Direktur skip KAUR & KABAG, langsung ke antrian Direksi
      initialStatus = "pending_direksi";
    } else if (rolePengaju === "sdm") {
      // SDM skip KAUR, langsung ke KABAG (alur: KABAG → SDM)
      initialStatus = "disetujui_kaur";
      autoKaurData = {
        status_kaur: "disetujui",
        approved_by_kaur: pegawai.nip,
        approved_at_kaur: new Date(),
        catatan_kaur: "Auto-disetujui (pengaju adalah SDM, langsung ke KABAG)",
      };
    }
    // admin/it: alur normal KAUR → KABAG → SDM (initialStatus tetap "pending")

    const leaveRequest = await this.prisma.cuti.create({
      data: {
        pegawaiId: pegawai.id,
        jenis_cuti: jenisCuti,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        alasan: dto.alasan.trim(),
        tujuan_cuti: this.nullableTrim(dto.tujuan_cuti),
        alamat_selama_cuti: this.nullableTrim(dto.alamat_selama_cuti),
        no_hp_selama_cuti: this.nullableTrim(dto.no_hp_selama_cuti),
        tanggal_kembali: tanggalKembali,
        penyerahan_tugas_kepada: this.nullableTrim(dto.penyerahan_tugas_kepada),
        jabatan_pengganti: this.nullableTrim(dto.jabatan_pengganti),
        catatan_pegawai: this.nullableTrim(dto.catatan_pegawai),
        is_urgent: isUrgent,
        status: initialStatus,
        ...autoKaurData,
      },
      select: {
        id: true,
        jenis_cuti: true,
        tanggal_mulai: true,
        tanggal_selesai: true,
        alasan: true,
        tujuan_cuti: true,
        alamat_selama_cuti: true,
        no_hp_selama_cuti: true,
        tanggal_kembali: true,
        penyerahan_tugas_kepada: true,
        jabatan_pengganti: true,
        catatan_pegawai: true,
        status: true,
        is_urgent: true,
        created_at: true,
      },
    });

    let lampiran: any = null;
    if (file) {
      lampiran = await this.prisma.lampiranPengajuan.create({
        data: {
          cutiId: leaveRequest.id,
          nama_file: file.originalname,
          path_file: file.path.replace(/\\/g, "/"),
          tipe_file: file.mimetype,
          ukuran_file: file.size,
        },
      });
    }

    this.notificationsGateway.notifyUser(
      pegawai.nip || String(pegawai.id),
      "new_submission",
      {
        type: "cuti",
        id: leaveRequest.id,
        jenis: leaveRequest.jenis_cuti,
        status: leaveRequest.status,
        message: `Pengajuan cuti ${leaveRequest.jenis_cuti} berhasil dibuat`,
      },
    );

    const usedTahunan = await this.calculateUsedTahunan(pegawai.id);

    return {
      message: "Pengajuan cuti berhasil dibuat",
      data: {
        pegawai,
        pengajuan: { ...leaveRequest, durasi, lampiran },
        summary: {
          jatahCutiTahunan: KUOTA_CUTI.tahunan,
          totalHariCutiDisetujui: usedTahunan,
          sisaCuti: Math.max(KUOTA_CUTI.tahunan - usedTahunan, 0),
        },
      },
    };
  }

  async findMine(identifier: string) {
    const pegawai = await this.findPegawaiByIdentifier(identifier);

    if (!pegawai) throw new NotFoundException("Data pegawai tidak ditemukan");

    const leaveRequests = await this.prisma.cuti.findMany({
      where: { pegawaiId: pegawai.id },
      select: {
        id: true,
        jenis_cuti: true,
        tanggal_mulai: true,
        tanggal_selesai: true,
        alasan: true,
        tujuan_cuti: true,
        alamat_selama_cuti: true,
        no_hp_selama_cuti: true,
        tanggal_kembali: true,
        penyerahan_tugas_kepada: true,
        jabatan_pengganti: true,
        catatan_pegawai: true,
        status: true,
        status_kaur: true,
        approved_by_kaur: true,
        approved_at_kaur: true,
        catatan_kaur: true,
        rejected_reason_kaur: true,
        status_kabag: true,
        approved_by_kabag: true,
        approved_at_kabag: true,
        catatan_kabag: true,
        rejected_reason_kabag: true,
        status_direktur: true,
        approved_by_direktur: true,
        approved_at_direktur: true,
        catatan_direktur: true,
        rejected_reason_direktur: true,
        status_direksi: true,
        approved_by_direksi: true,
        approved_at_direksi: true,
        catatan_direksi: true,
        rejected_reason_direksi: true,
        surat_cuti_diterbitkan: true,
        nomor_surat: true,
        tanggal_surat: true,
        created_at: true,
        lampiran: true,
      },
      orderBy: { created_at: "asc" },
    });

    const items = leaveRequests.map((item) => ({
      ...item,
      durasiCuti: this.calculateDurationInDays(
        this.startOfDay(item.tanggal_mulai),
        this.startOfDay(item.tanggal_selesai),
      ),
    }));

    return {
      message: "Riwayat pengajuan cuti berhasil diambil",
      data: { pegawai, total: items.length, items },
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

    const cutiList = await this.prisma.cuti.findMany({
      where,
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        jenis_cuti: true,
        tanggal_mulai: true,
        tanggal_selesai: true,
        alasan: true,
        tujuan_cuti: true,
        alamat_selama_cuti: true,
        no_hp_selama_cuti: true,
        tanggal_kembali: true,
        penyerahan_tugas_kepada: true,
        jabatan_pengganti: true,
        catatan_pegawai: true,
        status: true,
        is_urgent: true,
        created_at: true,
        lampiran: true,
        pegawai: { select: { nip: true, nama: true, jabatan: true, unit: true, jenis_kelamin: true } },
      },
    });

    return {
      message: "Daftar pengajuan cuti pending untuk Kaur berhasil diambil",
      data: { total: cutiList.length, items: cutiList },
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

    const where: any = { status: "disetujui_kaur" };
    const pegawaiFilter: any = {};
    if (unitFilter) pegawaiFilter.unit = unitFilter;
    // Exclude pengajuan KABAG sendiri lewat id (null-safe; nip bisa null utk pegawai kontrak)
    if (kabagId)    pegawaiFilter.id   = { not: kabagId };
    if (Object.keys(pegawaiFilter).length > 0) where.pegawai = pegawaiFilter;

    // Kabag melihat pengajuan yang sudah disetujui kaur (dari pegawai/kaur)
    const cutiList = await this.prisma.cuti.findMany({
      where,
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        jenis_cuti: true,
        tanggal_mulai: true,
        tanggal_selesai: true,
        alasan: true,
        tujuan_cuti: true,
        alamat_selama_cuti: true,
        no_hp_selama_cuti: true,
        tanggal_kembali: true,
        penyerahan_tugas_kepada: true,
        jabatan_pengganti: true,
        catatan_pegawai: true,
        status: true,
        is_urgent: true,
        status_kaur: true,
        approved_by_kaur: true,
        approved_at_kaur: true,
        catatan_kaur: true,
        created_at: true,
        lampiran: true,
        pegawai: { select: { nip: true, nama: true, jabatan: true, unit: true, jenis_kelamin: true } },
      },
    });

    return {
      message: "Daftar pengajuan cuti menunggu persetujuan Kabag berhasil diambil",
      data: { total: cutiList.length, items: cutiList },
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

    const cutiList = await this.prisma.cuti.findMany({
      where,
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        jenis_cuti: true,
        tanggal_mulai: true,
        tanggal_selesai: true,
        alasan: true,
        tujuan_cuti: true,
        alamat_selama_cuti: true,
        no_hp_selama_cuti: true,
        tanggal_kembali: true,
        penyerahan_tugas_kepada: true,
        jabatan_pengganti: true,
        catatan_pegawai: true,
        status: true,
        is_urgent: true,
        status_direktur: true,
        created_at: true,
        lampiran: true,
        pegawai: { select: { nip: true, nama: true, jabatan: true, unit: true } },
      },
    });

    return {
      message: "Daftar cuti menunggu persetujuan Direktur Administrasi berhasil diambil",
      data: { total: cutiList.length, items: cutiList },
    };
  }

  async findMonitoringForSdm() {
    const cutiList = await this.prisma.cuti.findMany({
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        jenis_cuti: true,
        tanggal_mulai: true,
        tanggal_selesai: true,
        alasan: true,
        tujuan_cuti: true,
        alamat_selama_cuti: true,
        no_hp_selama_cuti: true,
        tanggal_kembali: true,
        penyerahan_tugas_kepada: true,
        jabatan_pengganti: true,
        catatan_pegawai: true,
        status: true,
        status_kaur: true,
        approved_by_kaur: true,
        approved_at_kaur: true,
        catatan_kaur: true,
        rejected_reason_kaur: true,
        status_kabag: true,
        approved_by_kabag: true,
        approved_at_kabag: true,
        catatan_kabag: true,
        rejected_reason_kabag: true,
        status_direktur: true,
        approved_by_direktur: true,
        approved_at_direktur: true,
        catatan_direktur: true,
        rejected_reason_direktur: true,
        status_direksi: true,
        approved_by_direksi: true,
        approved_at_direksi: true,
        catatan_direksi: true,
        rejected_reason_direksi: true,
        surat_cuti_diterbitkan: true,
        nomor_surat: true,
        tanggal_surat: true,
        created_at: true,
        lampiran: true,
        pegawai: { select: { nip: true, nama: true, jabatan: true, unit: true } },
      },
    });

    return {
      message: "Monitoring cuti SDM berhasil diambil",
      data: { total: cutiList.length, items: cutiList },
    };
  }

  async findAllPengajuanForAdmin() {
    const [cutiList, izinList] = await Promise.all([
      this.prisma.cuti.findMany({
        orderBy: { created_at: "desc" },
        select: {
          id: true, jenis_cuti: true, tanggal_mulai: true, tanggal_selesai: true,
          alasan: true, status: true, is_urgent: true,
          surat_cuti_diterbitkan: true, nomor_surat: true, tanggal_surat: true,
          created_at: true, lampiran: true,
          pegawai: { select: { nip: true, nama: true, jabatan: true, unit: true } },
        },
      }),
      this.prisma.izin.findMany({
        orderBy: { created_at: "desc" },
        select: {
          id: true, jenis_izin: true, tanggal: true, jam_mulai: true,
          jam_selesai: true, alasan: true, status: true, created_at: true,
          lampiran: true,
          pegawai: { select: { nip: true, nama: true, jabatan: true, unit: true } },
        },
      }),
    ]);
    return {
      message: "Data pengajuan admin berhasil diambil",
      data: { cuti: cutiList, izin: izinList },
    };
  }

  // ── Riwayat keputusan (KAUR & KABAG) — per unit, status sudah terminal ──────
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
    if (!unitFilter) {
      return { message: "Riwayat cuti: unit tidak diketahui", data: { total: 0, items: [] } };
    }

    const cutiList = await this.prisma.cuti.findMany({
      where: {
        status: { notIn: this.RIWAYAT_EXCLUDE },
        pegawai: { unit: unitFilter },
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true, jenis_cuti: true, tanggal_mulai: true, tanggal_selesai: true,
        alasan: true, status: true,
        status_kaur: true, approved_by_kaur: true, approved_at_kaur: true, catatan_kaur: true,
        status_kabag: true, approved_by_kabag: true, approved_at_kabag: true, catatan_kabag: true,
        surat_cuti_diterbitkan: true, nomor_surat: true,
        created_at: true, updated_at: true, lampiran: true,
        pegawai: { select: { nip: true, nama: true, jabatan: true, unit: true } },
      },
    });

    return {
      message: "Riwayat keputusan cuti berhasil diambil",
      data: { total: cutiList.length, items: cutiList },
    };
  }

  async approveByKaur(id: number, nipKaur: string, catatan?: string) {
    const cuti = await this.prisma.cuti.findUnique({ where: { id }, include: { pegawai: { select: { nip: true } } } });
    if (!cuti) throw new NotFoundException("Data cuti tidak ditemukan");
    if (cuti.status !== "pending") {
      throw new BadRequestException("Cuti ini tidak dalam status pending dan tidak dapat diproses oleh Kaur");
    }

    const updated = await this.prisma.cuti.update({
      where: { id },
      data: {
        status: "disetujui_kaur",
        status_kaur: "disetujui",
        approved_by_kaur: nipKaur,
        approved_at_kaur: new Date(),
        catatan_kaur: this.nullableTrim(catatan),
        rejected_reason_kaur: null,
      },
      select: { id: true, jenis_cuti: true, tanggal_mulai: true, tanggal_selesai: true, status: true, created_at: true },
    });

    this.notificationsGateway.notifyUser(cuti.pegawai?.nip || String(cuti.pegawaiId), "status", {
      type: "cuti", id: cuti.id, status: "disetujui_kaur",
      message: "Pengajuan cuti disetujui oleh Kaur",
    });

    await this.auditLogService.createLog({
      actor_nip: nipKaur, actor_role: "kaur",
      action: "APPROVE_CUTI_KAUR", entity: "cuti", entity_id: String(cuti.id),
      description: `KAUR menyetujui pengajuan cuti ID ${cuti.id}`,
      old_value: { status: cuti.status }, new_value: { status: updated.status, catatan: this.nullableTrim(catatan) },
    });

    return { message: "Cuti berhasil disetujui oleh Kaur", data: updated };
  }

  async rejectByKaur(id: number, nipKaur: string, alasan: string) {
    const cuti = await this.prisma.cuti.findUnique({ where: { id } });
    if (!cuti) throw new NotFoundException("Data cuti tidak ditemukan");
    if (cuti.status !== "pending") {
      throw new BadRequestException("Cuti ini tidak dalam status pending dan tidak dapat ditolak oleh Kaur");
    }
    if (!alasan?.trim()) throw new BadRequestException("Alasan penolakan wajib diisi");

    const updated = await this.prisma.cuti.update({
      where: { id },
      data: {
        status: "ditolak_kaur",
        status_kaur: "ditolak",
        approved_by_kaur: nipKaur,
        approved_at_kaur: new Date(),
        catatan_kaur: null,
        rejected_reason_kaur: alasan.trim(),
      },
      select: { id: true, jenis_cuti: true, tanggal_mulai: true, tanggal_selesai: true, status: true, created_at: true },
    });

    await this.auditLogService.createLog({
      actor_nip: nipKaur, actor_role: "kaur",
      action: "REJECT_CUTI_KAUR", entity: "cuti", entity_id: String(cuti.id),
      description: `KAUR menolak pengajuan cuti ID ${cuti.id}`,
      old_value: { status: cuti.status }, new_value: { status: updated.status, alasan },
    });

    return { message: "Cuti berhasil ditolak oleh Kaur", data: updated };
  }

  async approveByKabag(id: number, nipKabag: string, catatan?: string) {
    const cuti = await this.prisma.cuti.findUnique({ where: { id }, include: { pegawai: { select: { nip: true } } } });
    if (!cuti) throw new NotFoundException("Data cuti tidak ditemukan");
    if (cuti.status !== "disetujui_kaur") {
      throw new BadRequestException("Cuti ini belum disetujui Kaur atau sudah diproses Kabag");
    }

    // Kabag adalah approver final untuk pengajuan pegawai/kaur
    const updated = await this.prisma.cuti.update({
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
        id: true, jenis_cuti: true, tanggal_mulai: true, tanggal_selesai: true,
        status: true, status_kaur: true, status_kabag: true,
        approved_by_kabag: true, approved_at_kabag: true, catatan_kabag: true,
        surat_cuti_diterbitkan: true, nomor_surat: true, tanggal_surat: true, created_at: true,
      },
    });

    this.notificationsGateway.notifyUser(cuti.pegawai?.nip || String(cuti.pegawaiId), "status", {
      type: "cuti", id: cuti.id, status: "disetujui_final",
      message: "Pengajuan cuti disetujui final oleh Kabag",
    });

    await this.auditLogService.createLog({
      actor_nip: nipKabag, actor_role: "kabag",
      action: "APPROVE_CUTI_FINAL", entity: "cuti", entity_id: String(cuti.id),
      description: `KABAG menyetujui final pengajuan cuti ID ${cuti.id}`,
      old_value: { status: cuti.status }, new_value: { status: updated.status, catatan: this.nullableTrim(catatan) },
    });

    return { message: "Cuti berhasil disetujui final oleh Kabag", data: updated };
  }

  async rejectByKabag(id: number, nipKabag: string, alasan: string) {
    const cuti = await this.prisma.cuti.findUnique({ where: { id } });
    if (!cuti) throw new NotFoundException("Data cuti tidak ditemukan");
    if (cuti.status !== "disetujui_kaur") {
      throw new BadRequestException("Cuti ini belum disetujui Kaur atau sudah diproses Kabag");
    }
    if (!alasan?.trim()) throw new BadRequestException("Alasan penolakan wajib diisi");

    const updated = await this.prisma.cuti.update({
      where: { id },
      data: {
        status: "ditolak_kabag",
        status_kabag: "ditolak",
        approved_by_kabag: nipKabag,
        approved_at_kabag: new Date(),
        catatan_kabag: null,
        rejected_reason_kabag: alasan.trim(),
      },
      select: { id: true, jenis_cuti: true, tanggal_mulai: true, tanggal_selesai: true, status: true, created_at: true },
    });

    await this.auditLogService.createLog({
      actor_nip: nipKabag, actor_role: "kabag",
      action: "REJECT_CUTI_KABAG", entity: "cuti", entity_id: String(cuti.id),
      description: `KABAG menolak pengajuan cuti ID ${cuti.id}`,
      old_value: { status: cuti.status }, new_value: { status: updated.status, alasan },
    });

    return { message: "Cuti berhasil ditolak oleh Kabag", data: updated };
  }

  async approveByDirektur(id: number, nipDirektur: string, catatan?: string) {
    const cuti = await this.prisma.cuti.findUnique({ where: { id }, include: { pegawai: { select: { nip: true } } } });
    if (!cuti) throw new NotFoundException("Data cuti tidak ditemukan");
    if (cuti.status !== "pending_direktur") {
      throw new BadRequestException("Cuti ini tidak menunggu persetujuan Direktur Administrasi");
    }

    const updated = await this.prisma.cuti.update({
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
        id: true, jenis_cuti: true, tanggal_mulai: true, tanggal_selesai: true,
        status: true, status_direktur: true,
        approved_by_direktur: true, approved_at_direktur: true,
        catatan_direktur: true,
        surat_cuti_diterbitkan: true, nomor_surat: true, tanggal_surat: true, created_at: true,
      },
    });

    this.notificationsGateway.notifyUser(cuti.pegawai?.nip || String(cuti.pegawaiId), "status", {
      type: "cuti", id: cuti.id, status: "disetujui_final",
      message: "Pengajuan cuti disetujui oleh Direktur Administrasi",
    });

    await this.auditLogService.createLog({
      actor_nip: nipDirektur, actor_role: "direktur",
      action: "APPROVE_CUTI_DIREKTUR", entity: "cuti", entity_id: String(cuti.id),
      description: `Direktur Administrasi menyetujui pengajuan cuti ID ${cuti.id}`,
      old_value: { status: cuti.status }, new_value: { status: updated.status, catatan: this.nullableTrim(catatan) },
    });

    return { message: "Cuti berhasil disetujui oleh Direktur Administrasi", data: updated };
  }

  async rejectByDirektur(id: number, nipDirektur: string, alasan: string) {
    const cuti = await this.prisma.cuti.findUnique({ where: { id }, include: { pegawai: { select: { nip: true } } } });
    if (!cuti) throw new NotFoundException("Data cuti tidak ditemukan");
    if (cuti.status !== "pending_direktur") {
      throw new BadRequestException("Cuti ini tidak menunggu persetujuan Direktur Administrasi");
    }
    if (!alasan?.trim()) throw new BadRequestException("Alasan penolakan wajib diisi");

    const updated = await this.prisma.cuti.update({
      where: { id },
      data: {
        status: "ditolak_direktur",
        status_direktur: "ditolak",
        approved_by_direktur: nipDirektur,
        approved_at_direktur: new Date(),
        catatan_direktur: null,
        rejected_reason_direktur: alasan.trim(),
      },
      select: { id: true, jenis_cuti: true, tanggal_mulai: true, tanggal_selesai: true, status: true, created_at: true },
    });

    this.notificationsGateway.notifyUser(cuti.pegawai?.nip || String(cuti.pegawaiId), "status", {
      type: "cuti", id: cuti.id, status: "ditolak_direktur",
      message: "Pengajuan cuti ditolak oleh Direktur Administrasi",
    });

    await this.auditLogService.createLog({
      actor_nip: nipDirektur, actor_role: "direktur",
      action: "REJECT_CUTI_DIREKTUR", entity: "cuti", entity_id: String(cuti.id),
      description: `Direktur Administrasi menolak pengajuan cuti ID ${cuti.id}`,
      old_value: { status: cuti.status }, new_value: { status: updated.status, alasan },
    });

    return { message: "Cuti berhasil ditolak oleh Direktur Administrasi", data: updated };
  }

  private generateNomorSuratCuti(id: number): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const sequence = String(id).padStart(4, "0");
    return `${sequence}/SIMCI-RSGM/SDM/CUTI/${month}/${year}`;
  }

  async findPendingForDireksi() {
    const cutiList = await this.prisma.cuti.findMany({
      where: { status: "pending_direksi" },
      orderBy: { created_at: "asc" },
      select: {
        id: true, jenis_cuti: true, tanggal_mulai: true, tanggal_selesai: true,
        alasan: true, tujuan_cuti: true, status: true, is_urgent: true, created_at: true, lampiran: true,
        pegawai: { select: { nip: true, nama: true, jabatan: true, unit: true } },
      },
    });

    return {
      message: "Daftar cuti menunggu persetujuan Direksi berhasil diambil",
      data: { total: cutiList.length, items: cutiList },
    };
  }

  async approveByDireksi(id: number, nipDireksi: string, catatan?: string) {
    const cuti = await this.prisma.cuti.findUnique({ where: { id }, include: { pegawai: { select: { nip: true } } } });
    if (!cuti) throw new NotFoundException("Data cuti tidak ditemukan");
    if (cuti.status !== "pending_direksi") {
      throw new BadRequestException("Cuti ini tidak menunggu persetujuan Direksi");
    }

    const updated = await this.prisma.cuti.update({
      where: { id },
      data: {
        status: "disetujui_final",
        status_direksi: "disetujui",
        approved_by_direksi: nipDireksi,
        approved_at_direksi: new Date(),
        catatan_direksi: this.nullableTrim(catatan),
        rejected_reason_direksi: null,
      },
      select: { id: true, jenis_cuti: true, tanggal_mulai: true, tanggal_selesai: true, status: true, created_at: true },
    });

    this.notificationsGateway.notifyUser(cuti.pegawai?.nip || String(cuti.pegawaiId), "status", {
      type: "cuti", id: cuti.id, status: "disetujui_final",
      message: "Pengajuan cuti disetujui oleh Direksi",
    });

    await this.auditLogService.createLog({
      actor_nip: nipDireksi, actor_role: "direksi",
      action: "APPROVE_CUTI_DIREKSI", entity: "cuti", entity_id: String(cuti.id),
      description: `Direksi menyetujui pengajuan cuti ID ${cuti.id}`,
      old_value: { status: cuti.status }, new_value: { status: updated.status, catatan: this.nullableTrim(catatan) },
    });

    return { message: "Cuti berhasil disetujui oleh Direksi", data: updated };
  }

  async rejectByDireksi(id: number, nipDireksi: string, alasan: string) {
    const cuti = await this.prisma.cuti.findUnique({ where: { id }, include: { pegawai: { select: { nip: true } } } });
    if (!cuti) throw new NotFoundException("Data cuti tidak ditemukan");
    if (cuti.status !== "pending_direksi") {
      throw new BadRequestException("Cuti ini tidak menunggu persetujuan Direksi");
    }
    if (!alasan?.trim()) throw new BadRequestException("Alasan penolakan wajib diisi");

    const updated = await this.prisma.cuti.update({
      where: { id },
      data: {
        status: "ditolak_direksi",
        status_direksi: "ditolak",
        approved_by_direksi: nipDireksi,
        approved_at_direksi: new Date(),
        catatan_direksi: null,
        rejected_reason_direksi: alasan.trim(),
      },
      select: { id: true, jenis_cuti: true, tanggal_mulai: true, tanggal_selesai: true, status: true, created_at: true },
    });

    this.notificationsGateway.notifyUser(cuti.pegawai?.nip || String(cuti.pegawaiId), "status", {
      type: "cuti", id: cuti.id, status: "ditolak_direksi",
      message: "Pengajuan cuti ditolak oleh Direksi",
    });

    await this.auditLogService.createLog({
      actor_nip: nipDireksi, actor_role: "direksi",
      action: "REJECT_CUTI_DIREKSI", entity: "cuti", entity_id: String(cuti.id),
      description: `Direksi menolak pengajuan cuti ID ${cuti.id}`,
      old_value: { status: cuti.status }, new_value: { status: updated.status, alasan },
    });

    return { message: "Cuti berhasil ditolak oleh Direksi", data: updated };
  }

  async terbitkanSuratCuti(id: number, nipSdm: string, nomorSurat?: string) {
    const cuti = await this.prisma.cuti.findUnique({
      where: { id },
      include: {
        pegawai: { select: { id: true, nip: true, nama: true, jabatan: true } },
        lampiran: true,
      },
    });

    if (!cuti) throw new NotFoundException("Data cuti tidak ditemukan");

    if (cuti.status !== "disetujui_final") {
      throw new BadRequestException("Surat cuti hanya dapat diterbitkan setelah cuti disetujui final");
    }

    if (cuti.surat_cuti_diterbitkan) {
      return { message: "Surat cuti sudah pernah diterbitkan", data: cuti };
    }

    const finalNomorSurat = this.nullableTrim(nomorSurat) || this.generateNomorSuratCuti(cuti.id);

    const updated = await this.prisma.cuti.update({
      where: { id },
      data: {
        surat_cuti_diterbitkan: true,
        nomor_surat: finalNomorSurat,
        tanggal_surat: this.startOfDay(new Date()),
      },
      include: {
        pegawai: { select: { id: true, nip: true, nama: true, jabatan: true } },
        lampiran: true,
      },
    });

    this.notificationsGateway.notifyUser(
      updated.pegawai?.nip || String(updated.pegawaiId),
      "status",
      {
        type: "cuti", id: updated.id, status: updated.status,
        surat_cuti_diterbitkan: true, nomor_surat: updated.nomor_surat,
        message: `Surat cuti Anda sudah diterbitkan dengan nomor ${updated.nomor_surat}`,
      },
    );

    await this.auditLogService.createLog({
      actor_nip: nipSdm, actor_role: "sdm",
      action: "TERBITKAN_SURAT_CUTI", entity: "cuti", entity_id: String(cuti.id),
      description: `SDM menerbitkan surat cuti ID ${cuti.id}`,
      old_value: { surat_cuti_diterbitkan: cuti.surat_cuti_diterbitkan },
      new_value: { surat_cuti_diterbitkan: true, nomor_surat: finalNomorSurat },
    });

    return { message: "Surat cuti berhasil diterbitkan", data: updated };
  }

  async resetKuotaTahunan(nipAdmin: string, nipPegawai?: string, tahun?: number): Promise<object> {
    const year = tahun || new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd   = new Date(year, 11, 31, 23, 59, 59);

    const where: any = {
      jenis_cuti: "tahunan",
      status: "disetujui_final",
      tanggal_mulai: { gte: yearStart, lte: yearEnd },
    };

    let affectedNips: string[] = [];

    if (nipPegawai) {
      const pegawai = await this.prisma.pegawai.findFirst({ where: { nip: nipPegawai } });
      if (!pegawai) throw new NotFoundException(`Pegawai dengan NIP ${nipPegawai} tidak ditemukan`);
      where.pegawaiId = pegawai.id;
      affectedNips = [nipPegawai];
    } else {
      const affected = await this.prisma.cuti.findMany({
        where,
        select: { pegawai: { select: { nip: true } } },
        distinct: ["pegawaiId"],
      });
      affectedNips = affected.map((c) => c.pegawai?.nip).filter(Boolean) as string[];
    }

    const { count } = await this.prisma.cuti.updateMany({
      where,
      data: { status: "direset_admin" },
    });

    for (const nip of affectedNips) {
      this.notificationsGateway.notifyUser(nip, "status", {
        type: "cuti",
        status: "direset_admin",
        jenis: "Cuti Tahunan",
        message: `Kuota cuti tahunan ${year} Anda telah direset oleh admin`,
      });
    }

    await this.auditLogService.createLog({
      actor_nip: nipAdmin,
      actor_name: null,
      actor_role: "admin",
      action: "RESET_KUOTA_CUTI_TAHUNAN",
      entity: "cuti",
      entity_id: nipPegawai || "semua",
      description: nipPegawai
        ? `Reset kuota cuti tahunan ${year} untuk NIP ${nipPegawai}: ${count} record direset`
        : `Reset kuota cuti tahunan ${year} untuk semua pegawai: ${count} record direset`,
      new_value: { tahun: year, nip_pegawai: nipPegawai || "semua", count },
    });

    return {
      message: nipPegawai
        ? `Kuota cuti tahunan ${year} untuk NIP ${nipPegawai} berhasil direset (${count} record)`
        : `Kuota cuti tahunan ${year} untuk semua pegawai berhasil direset (${count} record)`,
      data: { tahun: year, nip_pegawai: nipPegawai || null, count },
    };
  }

  async generateCutiPdf(id: number): Promise<Buffer> {
    const cuti = await this.prisma.cuti.findUnique({
      where: { id },
      include: { pegawai: true, lampiran: true },
    });

    if (!cuti) throw new NotFoundException("Data cuti tidak ditemukan");
    if (cuti.status !== "disetujui_final") {
      throw new BadRequestException("PDF hanya dapat diunduh setelah cuti disetujui final");
    }
    if (!cuti.surat_cuti_diterbitkan) {
      throw new BadRequestException("Surat cuti belum diterbitkan oleh SDM");
    }

    await this.auditLogService.createLog({
      actor_nip: cuti.pegawai?.nip || null,
      actor_name: cuti.pegawai?.nama || null,
      actor_role: "pegawai",
      action: "DOWNLOAD_PDF_CUTI", entity: "cuti", entity_id: String(cuti.id),
      description: `PDF surat cuti ID ${cuti.id} diunduh`,
      new_value: { status: cuti.status, nama: cuti.pegawai?.nama, nip: cuti.pegawai?.nip },
    });

    const approvedBy = cuti.approved_by_direksi || cuti.approved_by_direktur || cuti.approved_by_kabag || "-";
    const approvedAt = cuti.approved_at_direksi || cuti.approved_at_direktur || cuti.approved_at_kabag;

    const qrText = `
SIMCI RSGM
FORMULIR PERMOHONAN CUTI
ID: CUTI-${cuti.id}
Nama: ${cuti.pegawai?.nama || "-"}
NIP: ${cuti.pegawai?.nip || "-"}
Status: ${cuti.status}
Nomor Surat: ${cuti.nomor_surat || "-"}
Tanggal Surat: ${cuti.tanggal_surat ? new Date(cuti.tanggal_surat).toLocaleDateString("id-ID") : "-"}
Disetujui oleh: ${approvedBy}
Tanggal Approval: ${approvedAt ? new Date(approvedAt).toLocaleString("id-ID") : "-"}
`;

    const qrDataUrl = await QRCode.toDataURL(qrText);
    const logoYayasanPath = (() => {
      const png  = path.join(process.cwd(), "src/assets/logo-yayasan.png");
      const jpeg = path.join(process.cwd(), "src/assets/logo-yayasan.jpeg");
      try { require("fs").accessSync(png); return png; } catch { return jpeg; }
    })();
    const logoRsgmPath = (() => {
      const png  = path.join(process.cwd(), "src/assets/logo-rsgm.png");
      const jpeg = path.join(process.cwd(), "src/assets/logo-rsgm.jpeg");
      try { require("fs").accessSync(png); return png; } catch { return jpeg; }
    })();

    return new Promise((resolve) => {
      const doc = new PDFDocument({ size: "A4", margin: 35 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const formatDate = (date?: Date | null) => date ? new Date(date).toLocaleDateString("id-ID") : "-";

      const totalHari = this.calculateDurationInDays(
        this.startOfDay(new Date(cuti.tanggal_mulai)),
        this.startOfDay(new Date(cuti.tanggal_selesai)),
      );

      const jatahCuti = KUOTA_CUTI[cuti.jenis_cuti] ?? 12;
      const sisaCuti = Math.max(jatahCuti - totalHari, 0);
      const tanggalMulai = formatDate(cuti.tanggal_mulai);
      const tanggalSelesai = formatDate(cuti.tanggal_selesai);
      const tanggalKembali = formatDate(cuti.tanggal_kembali);
      const tanggalCetak = cuti.tanggal_surat
        ? new Date(cuti.tanggal_surat).toLocaleDateString("id-ID")
        : new Date().toLocaleDateString("id-ID");
      const nomorSurat = cuti.nomor_surat || `CUTI-${cuti.id}`;
      const signaturePath = cuti.pegawai?.ttd_digital
        ? path.join(process.cwd(), cuti.pegawai.ttd_digital.replace("/uploads/", "uploads/"))
        : null;

      const jenisCutiLabel: Record<string, string> = {
        tahunan: "CUTI TAHUNAN",
        besar: "CUTI BESAR/IBADAH",
        haid: "CUTI HAID",
        menikah: "CUTI MENIKAH",
        melahirkan: "CUTI MELAHIRKAN",
      };
      const labelCuti = jenisCutiLabel[cuti.jenis_cuti] || `CUTI ${cuti.jenis_cuti.toUpperCase()}`;

      const drawHeader = () => {
        try { doc.image(logoYayasanPath, 40, 18, { width: 63, height: 90 }); } catch { doc.font("Times-Roman").fontSize(8).text("Logo Yayasan", 40, 45); }
        try { doc.image(logoRsgmPath, 468, 19, { width: 76, height: 76 }); } catch { doc.font("Times-Roman").fontSize(8).text("Logo RSGM", 468, 45); }
        doc.font("Times-Bold").fontSize(16).fillColor("black").text("YAYASAN KARTIKA EKA PAKSI", 0, 30, { align: "center" });
        doc.font("Times-Bold").fontSize(15).text("RUMAH SAKIT GIGI DAN MULUT UNJANI", { align: "center" });
        doc.font("Times-Roman").fontSize(8.5).text("Jl. Encep Kartawiria No. 88 Citeureup Cimahi Utara Kota Cimahi", { align: "center" });
        doc.font("Times-Roman").fontSize(8).text("Telp. (022) – 86001401, 86001402, 86001403", { align: "center" });
        doc.moveTo(35, 107).lineTo(560, 107).lineWidth(1).stroke();
        doc.moveTo(35, 111).lineTo(560, 111).lineWidth(0.5).stroke();
      };

      const pegawaiRolePdf = String(cuti.pegawai?.role || "").toLowerCase().trim();
      const internalRole = String(cuti.pegawai?.internal_role || "").toLowerCase().trim();
      const unitKerja = (cuti.pegawai?.unit || "").toLowerCase();
      const isKabag = pegawaiRolePdf === "kabag" || internalRole === "kabag";
      const isKabagPelayanan = isKabag && (unitKerja.includes("pelayan") || unitKerja.includes("penunjang"));
      const kepada = isKabagPelayanan
        ? "Yth. Direktur Yan dan Jang RSGM Jenderal A.Yani"
        : "Yth. Direktur Adm. dan Ops RSGM Jenderal A. Yani";

      drawHeader();
      doc.y = 135;

      doc.font("Times-Bold").fontSize(15).text(`FORMULIR PERMOHONAN ${labelCuti}`, { align: "center" });
      doc.moveDown(0.8);
      doc.font("Times-Roman").fontSize(10).text(`Nomor Surat: ${nomorSurat}`, { align: "center" });
      doc.moveDown(1.2);
      doc.font("Times-Roman").fontSize(11).text("Yang bertanda tangan di bawah ini :", 35, doc.y);
      doc.moveDown(0.8);

      const leftX = 35, colonX = 270, valueX = 285;
      const row = (label: string, value: string) => {
        const y = doc.y;
        doc.font("Times-Roman").fontSize(11).fillColor("black");
        doc.text(label, leftX, y);
        doc.text(":", colonX, y);
        doc.text(value || "-", valueX, y, { width: 260 });
        doc.moveDown(0.55);
      };

      row("Nama", cuti.pegawai?.nama || "-");
      row("Bagian", cuti.pegawai?.unit || "-");
      row("Jatah cuti yang ada", `${jatahCuti} Hari`);
      row("Mengajukan cuti selama", `${totalHari} Hari`);
      row("Tanggal cuti", `${tanggalMulai} s/d ${tanggalSelesai}`);
      row("Tanggal kembali", tanggalKembali);
      row("Tujuan Cuti", cuti.tujuan_cuti || "-");
      row("Sisa Cuti", `${sisaCuti} Hari`);
      row("Penyerahan tugas sementara kepada", cuti.penyerahan_tugas_kepada || "-");
      row("Telp yang dapat dihubungi", cuti.no_hp_selama_cuti || "-");
      if (cuti.alamat_selama_cuti) row("Alamat selama cuti", cuti.alamat_selama_cuti);
      if (cuti.alasan) row("Alasan", cuti.alasan);
      if (cuti.catatan_pegawai) row("Catatan", cuti.catatan_pegawai);

      doc.y = Math.max(doc.y + 25, 430);
      doc.font("Times-Roman").fontSize(11).text(`Cimahi, ${tanggalCetak}`, 365, doc.y, { width: 150, align: "center" });
      doc.moveDown(1.2);

      const signatureTop = doc.y;

      if (isKabag) {
        // Kabag form: Menyetujui (Direktur) kiri | Hormat saya (Kabag) kanan
        doc.text("Menyetujui,\nDirektur.....................", 70, signatureTop, { width: 190, align: "center" });
        doc.text("Hormat saya", 365, signatureTop, { width: 150, align: "center" });
        doc.text("........................................", 70, signatureTop + 85, { width: 190, align: "center" });
        doc.text("........................................", 355, signatureTop + 85, { width: 170, align: "center" });
        if (signaturePath) {
          try { doc.image(signaturePath, 395, signatureTop + 25, { width: 90, height: 50, fit: [90, 50] }); } catch {}
        }
        doc.text(approvedBy !== "-" ? approvedBy : "", 70, signatureTop + 105, { width: 190, align: "center" });
        doc.text(cuti.pegawai?.nama || "", 355, signatureTop + 105, { width: 170, align: "center" });
      } else {
        // Pegawai form: Atasan Langsung kiri | Hormat saya kanan
        doc.text("Atasan Langsung", 90, signatureTop, { width: 150, align: "center" });
        doc.text("Hormat saya", 365, signatureTop, { width: 150, align: "center" });
        doc.text("........................................", 80, signatureTop + 85, { width: 170, align: "center" });
        doc.text("........................................", 355, signatureTop + 85, { width: 170, align: "center" });
        if (signaturePath) {
          try { doc.image(signaturePath, 395, signatureTop + 25, { width: 90, height: 50, fit: [90, 50] }); } catch {}
        }
        doc.text(cuti.pegawai?.nama || "", 355, signatureTop + 105, { width: 170, align: "center" });

        const approvalTop = signatureTop + 145;
        doc.text("Menyetujui,\nKepala Urusan / Kepala Bagian", 70, approvalTop, { width: 190, align: "center" });
        doc.text("Mengetahui\nPjs. Kepala Bagian Administrasi", 335, approvalTop, { width: 190, align: "center" });
        doc.text("........................................", 70, approvalTop + 85, { width: 190, align: "center" });
        doc.text("Dendy Ari Kurniawan, S.H.,M.H", 335, approvalTop + 85, { width: 190, align: "center" });
      }

      doc.image(qrDataUrl, 40, 700, { width: 70 });
      doc.font("Times-Roman").fontSize(8).text("QR Verifikasi Digital SIMCI RSGM", 35, 775);
      doc.font("Times-Roman").fontSize(8).fillColor("#555555").text(`Dokumen: ${nomorSurat}`, 430, 775, { align: "right" });
      doc.fillColor("black");

      // PAGE 2
      doc.addPage({ size: "A4", margin: 35 });
      doc.font("Times-Roman").fontSize(11).fillColor("black");
      doc.text(`Kepada\n${kepada}\ndi Tempat`, 365, 70, { width: 190, lineGap: 4 });

      doc.y = 180;
      doc.text("Yang bertanda tangan dibawah ini :", 120, doc.y);
      doc.moveDown(1.5);

      const p2LeftX = 120, p2ColonX = 250, p2ValueX = 265;
      const page2Row = (label: string, value: string) => {
        const y = doc.y;
        doc.font("Times-Roman").fontSize(11).fillColor("black");
        doc.text(label, p2LeftX, y);
        doc.text(":", p2ColonX, y);
        doc.text(value || "-", p2ValueX, y, { width: 260 });
        doc.moveDown(1.15);
      };

      page2Row("Nama", cuti.pegawai?.nama || "-");
      page2Row("Unit Kerja", cuti.pegawai?.unit || "-");
      page2Row("Jabatan", cuti.pegawai?.jabatan || "-");
      page2Row("Alamat selama cuti", cuti.alamat_selama_cuti || "-");

      doc.moveDown(2);
      doc.text(
        `Dengan ini mengajukan permohonan ${labelCuti.toLowerCase()} selama ${totalHari} (${totalHari}) hari terhitung tanggal`,
        120, doc.y, { width: 405, align: "left" },
      );
      doc.moveDown(0.8);
      doc.text(`${tanggalMulai} sampai dengan / dan tanggal ${tanggalSelesai}.`, 120, doc.y, { width: 405 });
      doc.moveDown(1.6);
      doc.text("Demikian permohonan ini saya ajukan, mohon untuk menjadi periksa dan petunjuk selanjutnya.", 120, doc.y, { width: 405 });
      doc.moveDown(4);
      doc.text(`Cimahi, ${tanggalCetak}`, 360, doc.y, { width: 190, align: "center" });
      doc.moveDown(6.5);

      const page2SignatureY = doc.y;
      doc.text("( ....................................... )", 360, page2SignatureY, { width: 190, align: "center" });

      if (signaturePath) {
        try { doc.image(signaturePath, 405, page2SignatureY - 55, { width: 90, height: 50, fit: [90, 50] }); } catch {}
      }
      doc.moveDown(0.6);
      doc.text(cuti.pegawai?.nama || "", 360, doc.y, { width: 190, align: "center" });
      doc.font("Times-Roman").fontSize(8).fillColor("#555555").text(`Dokumen: ${nomorSurat} - Halaman 2`, 405, 775, { align: "right" });

      doc.end();
    });
  }

  async getDirekturStats(nipDirektur?: string) {
    let unitFilter: string | undefined;
    if (nipDirektur) {
      const direktur = await this.prisma.pegawai.findFirst({
        where: { OR: [{ nip: nipDirektur }, { username: nipDirektur }] },
        select: { unit: true },
      });
      unitFilter = direktur?.unit?.trim() || undefined;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const cutiUnit = unitFilter ? { pegawai: { unit: unitFilter } } : {};
    const izinUnit = unitFilter ? { pegawai: { unit: unitFilter } } : {};

    const [
      totalPegawai,
      cutiPending, cutiDisetujui, cutiDitolak,
      izinPending, izinDisetujui, izinDitolak,
      riwayatCuti, riwayatIzin,
    ] = await Promise.all([
      unitFilter
        ? this.prisma.pegawai.count({ where: { unit: unitFilter } })
        : this.prisma.pegawai.count(),
      this.prisma.cuti.count({
        where: { ...cutiUnit, status: "pending_direktur", created_at: { gte: monthStart, lte: monthEnd } },
      }),
      this.prisma.cuti.count({
        where: { ...cutiUnit, status: { in: ["disetujui_final", "selesai"] }, approved_at_direktur: { gte: monthStart, lte: monthEnd } },
      }),
      this.prisma.cuti.count({
        where: { ...cutiUnit, status: "ditolak_direktur", approved_at_direktur: { gte: monthStart, lte: monthEnd } },
      }),
      this.prisma.izin.count({
        where: { ...izinUnit, status: "pending_direktur", created_at: { gte: monthStart, lte: monthEnd } },
      }),
      this.prisma.izin.count({
        where: { ...izinUnit, status: "disetujui_final", approved_at_direktur: { gte: monthStart, lte: monthEnd } },
      }),
      this.prisma.izin.count({
        where: { ...izinUnit, status: "ditolak_direktur", approved_at_direktur: { gte: monthStart, lte: monthEnd } },
      }),
      this.prisma.cuti.findMany({
        where: { ...cutiUnit, status: { in: ["disetujui_final", "ditolak_direktur", "selesai"] }, approved_at_direktur: { not: null } },
        orderBy: { approved_at_direktur: "desc" },
        take: 5,
        select: {
          id: true, jenis_cuti: true, tanggal_mulai: true, tanggal_selesai: true, status: true,
          approved_at_direktur: true,
          pegawai: { select: { nip: true, nama: true, jabatan: true, unit: true } },
        },
      }),
      this.prisma.izin.findMany({
        where: { ...izinUnit, status: { in: ["disetujui_final", "ditolak_direktur"] }, approved_at_direktur: { not: null } },
        orderBy: { approved_at_direktur: "desc" },
        take: 5,
        select: {
          id: true, jenis_izin: true, tanggal: true, status: true,
          approved_at_direktur: true,
          pegawai: { select: { nip: true, nama: true, jabatan: true, unit: true } },
        },
      }),
    ]);

    return {
      message: "Statistik direktur berhasil diambil",
      data: {
        totalPegawai,
        pendingBulanIni:    cutiPending    + izinPending,
        disetujuiBulanIni:  cutiDisetujui  + izinDisetujui,
        ditolakBulanIni:    cutiDitolak    + izinDitolak,
        riwayatCuti,
        riwayatIzin,
      },
    };
  }

  async getHaidStatusBulanIni(identifier: string) {
    const pegawai = await this.findPegawaiByIdentifier(identifier);
    if (!pegawai) throw new NotFoundException("Data pegawai tidak ditemukan");

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const existing = await this.prisma.cuti.findFirst({
      where: {
        pegawaiId: pegawai.id,
        jenis_cuti: "haid",
        status: { notIn: ["ditolak_kaur", "ditolak_kabag", "ditolak_direktur", "ditolak_direksi", "direset_admin"] },
        tanggal_mulai: { gte: monthStart, lte: monthEnd },
      },
      select: { id: true, status: true },
    });

    return {
      message: "Status cuti haid bulan ini",
      data: {
        sudahDigunakan: !!existing,
        bulan: now.getMonth() + 1,
        tahun: now.getFullYear(),
      },
    };
  }
}
