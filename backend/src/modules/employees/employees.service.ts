import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import * as bcrypt from "bcrypt";

type UpdateProfileBody = {
  email?: string;
  no_hp?: string;
  is_nakes?: boolean;
  nomor_str?: string;
  str_seumur_hidup?: boolean;
  nomor_sip?: string;
  tanggal_terbit_sip?: string;
  expired_sip?: string;
};

type AdminUpdatePegawaiBody = {
  username?: string;
  nip?: string | null;
  nama?: string | null;
  jabatan?: string | null;
  jenis_pegawai?: string | null;
  email?: string | null;
  no_hp?: string | null;
  role?: string;
  internal_role?: string | null;
  portal_pegawai_access?: boolean;
  must_change_password?: boolean;
  is_nakes?: boolean;
};

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException("Format tanggal tidak valid");
    return date;
  }

  private getSipStatus(value?: Date | null) {
    if (!value) return "belum_diisi";
    const today = new Date();
    const expired = new Date(value);
    today.setHours(0, 0, 0, 0);
    expired.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expired.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "expired";
    if (diffDays <= 30) return "kurang_1_bulan";
    if (diffDays <= 90) return "kurang_3_bulan";
    if (diffDays <= 180) return "kurang_6_bulan";
    if (diffDays <= 365) return "kurang_1_tahun";
    return "aman";
  }

  // STR berlaku seumur hidup — status selalu "aman" jika str_seumur_hidup true
  private getStrStatus(isNakes: boolean, strSeumurHidup: boolean, nomorStr?: string | null) {
    if (!isNakes) return null;
    if (!nomorStr) return "belum_diisi";
    if (strSeumurHidup) return "aman";
    return "belum_diisi";
  }

  private selectPegawaiAdmin() {
    return {
      id: true,
      username: true,
      nip: true,
      nama: true,
      jabatan: true,
      unit: true,
      jenis_pegawai: true,
      jenis_kelamin: true,
      tanggal_lahir: true,
      email: true,
      no_hp: true,
      ttd_digital: true,
      role: true,
      internal_role: true,
      portal_pegawai_access: true,
      must_change_password: true,
      failedLoginAttempts: true,
      is_nakes: true,
      nomor_str: true,
      str_seumur_hidup: true,
      nomor_sip: true,
      tanggal_terbit_sip: true,
      expired_sip: true,
    };
  }

  private enrichWithStatus(user: any) {
    return {
      ...user,
      status_str: this.getStrStatus(user.is_nakes, user.str_seumur_hidup, user.nomor_str),
      status_sip: this.getSipStatus(user.expired_sip),
    };
  }

  async getProfileByNip(identifier: string) {
    const user = await this.prisma.pegawai.findFirst({
      where: { OR: [{ nip: identifier }, { username: identifier }] },
      select: this.selectPegawaiAdmin(),
    });

    if (!user) throw new NotFoundException("Data pegawai tidak ditemukan");

    return {
      message: "Profil pegawai berhasil diambil",
      data: this.enrichWithStatus(user),
    };
  }

  async updateProfileByNip(identifier: string, body: UpdateProfileBody) {
    const existingUser = await this.prisma.pegawai.findFirst({
      where: { OR: [{ nip: identifier }, { username: identifier }] },
    });
    if (!existingUser) throw new NotFoundException("Data pegawai tidak ditemukan");

    const isNakes = Boolean(body.is_nakes);

    if (isNakes) {
      if (!body.nomor_str) {
        throw new BadRequestException("Pegawai nakes wajib mengisi nomor STR");
      }
      if (!body.nomor_sip || !body.expired_sip) {
        throw new BadRequestException("Pegawai nakes wajib mengisi nomor SIP dan masa berlaku SIP");
      }
    }

    const strSeumurHidup = isNakes ? Boolean(body.str_seumur_hidup) : false;

    const updatedUser = await this.prisma.pegawai.update({
      where: { id: existingUser.id },
      data: {
        email: body.email ?? null,
        no_hp: body.no_hp ?? null,
        is_nakes: isNakes,
        nomor_str: isNakes ? body.nomor_str ?? null : null,
        str_seumur_hidup: strSeumurHidup,
        nomor_sip: isNakes ? body.nomor_sip ?? null : null,
        tanggal_terbit_sip: isNakes ? this.parseDate(body.tanggal_terbit_sip) : null,
        expired_sip: isNakes ? this.parseDate(body.expired_sip) : null,
      },
      select: this.selectPegawaiAdmin(),
    });

    return {
      message: "Profil pegawai berhasil diperbarui",
      data: this.enrichWithStatus(updatedUser),
    };
  }

  async uploadSignature(identifier: string, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("File tanda tangan wajib diupload");

    const existing = await this.prisma.pegawai.findFirst({
      where: { OR: [{ nip: identifier }, { username: identifier }] },
    });
    if (!existing) throw new NotFoundException("Data pegawai tidak ditemukan");

    const updated = await this.prisma.pegawai.update({
      where: { id: existing.id },
      data: { ttd_digital: `/uploads/signatures/${file.filename}` },
      select: this.selectPegawaiAdmin(),
    });

    await this.auditLogService.createLog({
      actor_nip: existing.nip,
      actor_name: existing.nama,
      actor_role: existing.role,
      action: "UPLOAD_TTD_DIGITAL",
      entity: "pegawai",
      entity_id: String(existing.id),
      description: `TTD digital pegawai ${existing.nama || existing.username} berhasil diupload`,
      old_value: { ttd_digital: existing.ttd_digital },
      new_value: { ttd_digital: updated.ttd_digital },
    });

    return {
      message: "TTD digital berhasil diupload",
      data: this.enrichWithStatus(updated),
    };
  }

  async getNakesMonitoring() {
    const nakes = await this.prisma.pegawai.findMany({
      where: { is_nakes: true },
      orderBy: { nama: "asc" },
      select: this.selectPegawaiAdmin(),
    });

    const items = nakes.map((item) => this.enrichWithStatus(item));

    return {
      message: "Monitoring STR/SIP nakes berhasil diambil",
      data: { total: items.length, items },
    };
  }

  async getPegawaiListPublic(unit?: string, excludeNip?: string) {
    const where: any = { portal_pegawai_access: true };
    if (unit) where.unit = unit;
    if (excludeNip) where.nip = { not: excludeNip };

    const pegawai = await this.prisma.pegawai.findMany({
      where,
      orderBy: { nama: "asc" },
      select: { id: true, nip: true, nama: true, jabatan: true, unit: true },
    });
    return {
      message: "Daftar pegawai berhasil diambil",
      data: { items: pegawai.filter((p) => p.nama) },
    };
  }

  async getAdminPegawaiList() {
    const pegawai = await this.prisma.pegawai.findMany({
      orderBy: { nama: "asc" },
      select: this.selectPegawaiAdmin(),
    });

    const items = pegawai.map((item) => this.enrichWithStatus(item));

    const totalPegawai = items.length;
    const totalNakes = items.filter((item) => item.is_nakes).length;
    const totalPortalAktif = items.filter((item) => item.portal_pegawai_access).length;
    const totalMustChangePassword = items.filter((item) => item.must_change_password).length;

    return {
      message: "Daftar pegawai admin berhasil diambil",
      data: {
        total: totalPegawai,
        summary: { totalPegawai, totalNakes, totalPortalAktif, totalMustChangePassword },
        items,
      },
    };
  }

  async adminUpdatePegawai(id: number, body: AdminUpdatePegawaiBody) {
    const existing = await this.prisma.pegawai.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Data pegawai tidak ditemukan");

    if (body.username && body.username !== existing.username) {
      const usernameExist = await this.prisma.pegawai.findUnique({ where: { username: body.username } });
      if (usernameExist) throw new BadRequestException("Username sudah digunakan pegawai lain");
    }

    if (body.nip && body.nip !== existing.nip) {
      const nipExist = await this.prisma.pegawai.findUnique({ where: { nip: body.nip } });
      if (nipExist) throw new BadRequestException("NIP sudah digunakan pegawai lain");
    }

    const isNakes = typeof body.is_nakes === "boolean" ? body.is_nakes : existing.is_nakes;

    const updated = await this.prisma.pegawai.update({
      where: { id },
      data: {
        username: body.username ?? existing.username,
        nip: body.nip === undefined ? existing.nip : body.nip,
        nama: body.nama === undefined ? existing.nama : body.nama,
        jabatan: body.jabatan === undefined ? existing.jabatan : body.jabatan,
        jenis_pegawai: body.jenis_pegawai === undefined ? existing.jenis_pegawai : body.jenis_pegawai,
        email: body.email === undefined ? existing.email : body.email,
        no_hp: body.no_hp === undefined ? existing.no_hp : body.no_hp,
        role: body.role ?? existing.role,
        internal_role: body.internal_role === undefined ? existing.internal_role : body.internal_role,
        portal_pegawai_access: typeof body.portal_pegawai_access === "boolean" ? body.portal_pegawai_access : existing.portal_pegawai_access,
        must_change_password: typeof body.must_change_password === "boolean" ? body.must_change_password : existing.must_change_password,
        is_nakes: isNakes,
      },
      select: this.selectPegawaiAdmin(),
    });

    await this.auditLogService.createLog({
      actor_role: "admin",
      action: "UPDATE_PEGAWAI",
      entity: "pegawai",
      entity_id: String(existing.id),
      description: `Admin memperbarui data pegawai ${existing.nama || existing.username}`,
      old_value: { username: existing.username, nip: existing.nip, nama: existing.nama, jabatan: existing.jabatan, role: existing.role, internal_role: existing.internal_role, is_nakes: existing.is_nakes },
      new_value: { username: updated.username, nip: updated.nip, nama: updated.nama, jabatan: updated.jabatan, role: updated.role, internal_role: updated.internal_role, is_nakes: updated.is_nakes },
    });

    return {
      message: "Data pegawai berhasil diperbarui admin",
      data: this.enrichWithStatus(updated),
    };
  }

  async adminResetPassword(id: number) {
    const existing = await this.prisma.pegawai.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Data pegawai tidak ditemukan");

    const defaultPassword = existing.nip || existing.username;
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    const updated = await this.prisma.pegawai.update({
      where: { id },
      data: { password: hashedPassword, must_change_password: true, failedLoginAttempts: 0 },
      select: this.selectPegawaiAdmin(),
    });

    await this.auditLogService.createLog({
      actor_role: "admin",
      action: "RESET_PASSWORD",
      entity: "pegawai",
      entity_id: String(existing.id),
      description: `Admin mereset password pegawai ${existing.nama || existing.username}`,
      old_value: { must_change_password: existing.must_change_password, failedLoginAttempts: existing.failedLoginAttempts },
      new_value: { must_change_password: true, failedLoginAttempts: 0 },
    });

    return {
      message: "Password berhasil direset. Password sementara menggunakan NIP atau username pegawai.",
      data: { ...this.enrichWithStatus(updated), temporary_password: defaultPassword },
    };
  }
}
