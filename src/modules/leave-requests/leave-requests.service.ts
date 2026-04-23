import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class LeaveRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  private parseLocalDate(value: string): Date {
    const parts = value.split('-');
    if (parts.length !== 3) {
      throw new BadRequestException('Format tanggal tidak valid');
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    if (!year || !month || !day) {
      throw new BadRequestException('Format tanggal tidak valid');
    }

    return new Date(year, month - 1, day);
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private calculateDurationInDays(start: Date, end: Date): number {
    const utcStart = Date.UTC(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    );

    const utcEnd = Date.UTC(
      end.getFullYear(),
      end.getMonth(),
      end.getDate(),
    );

    return Math.floor((utcEnd - utcStart) / (1000 * 60 * 60 * 24)) + 1;
  }

  private async calculateApprovedLeaveDays(pegawaiId: number): Promise<number> {
    const approvedLeaves = await this.prisma.cuti.findMany({
      where: {
        pegawaiId,
        status: 'disetujui',
      },
      select: {
        tanggal_mulai: true,
        tanggal_selesai: true,
      },
    });

    return approvedLeaves.reduce((total, item) => {
      const mulai = this.startOfDay(item.tanggal_mulai);
      const selesai = this.startOfDay(item.tanggal_selesai);

      return total + this.calculateDurationInDays(mulai, selesai);
    }, 0);
  }

  async create(dto: CreateLeaveRequestDto) {
    const pegawai = await this.prisma.pegawai.findUnique({
      where: { nip: String(dto.nip) },
      select: {
        id: true,
        nip: true,
        nama: true,
        jabatan: true,
        role: true,
      },
    });

    if (!pegawai) {
      throw new NotFoundException('Data pegawai tidak ditemukan');
    }

    const tanggalMulai = this.startOfDay(
      this.parseLocalDate(dto.tanggal_mulai),
    );
    const tanggalSelesai = this.startOfDay(
      this.parseLocalDate(dto.tanggal_selesai),
    );
    const hariIni = this.startOfDay(new Date());

    if (tanggalMulai < hariIni) {
      throw new BadRequestException(
        'Tanggal mulai cuti tidak boleh di masa lalu',
      );
    }

    if (tanggalSelesai < tanggalMulai) {
      throw new BadRequestException(
        'Tanggal selesai tidak boleh sebelum tanggal mulai',
      );
    }

    const durasiCuti = this.calculateDurationInDays(
      tanggalMulai,
      tanggalSelesai,
    );

    const jatahCutiTahunan = 12;
    const totalHariCutiDisetujui = await this.calculateApprovedLeaveDays(
      pegawai.id,
    );
    const sisaCuti = jatahCutiTahunan - totalHariCutiDisetujui;

    if (durasiCuti > sisaCuti) {
      throw new BadRequestException(
        `Pengajuan cuti melebihi sisa kuota. Sisa cuti Anda ${sisaCuti} hari`,
      );
    }

    const overlappingLeave = await this.prisma.cuti.findFirst({
      where: {
        pegawaiId: pegawai.id,
        status: { in: ['pending', 'disetujui'] },
        tanggal_mulai: { lte: tanggalSelesai },
        tanggal_selesai: { gte: tanggalMulai },
      },
      select: {
        id: true,
        jenis_cuti: true,
        tanggal_mulai: true,
        tanggal_selesai: true,
        status: true,
      },
    });

    if (overlappingLeave) {
      throw new BadRequestException(
        'Pengajuan cuti bentrok dengan data cuti yang sudah ada',
      );
    }

    const leaveRequest = await this.prisma.cuti.create({
      data: {
        pegawaiId: pegawai.id,
        jenis_cuti: dto.jenis_cuti.trim(),
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        alasan: dto.alasan.trim(),
        status: 'pending',
      },
      select: {
        id: true,
        jenis_cuti: true,
        tanggal_mulai: true,
        tanggal_selesai: true,
        alasan: true,
        status: true,
        created_at: true,
      },
    });

    this.notificationsGateway.notifyUser(pegawai.nip, 'new_submission', {
      type: 'cuti',
      id: leaveRequest.id,
      jenis: leaveRequest.jenis_cuti,
      status: leaveRequest.status,
      tanggal_mulai: leaveRequest.tanggal_mulai,
      tanggal_selesai: leaveRequest.tanggal_selesai,
      message: `Pengajuan cuti ${leaveRequest.jenis_cuti} berhasil dibuat`,
    });

    return {
      message: 'Pengajuan cuti berhasil dibuat',
      data: {
        pegawai,
        pengajuan: {
          ...leaveRequest,
          durasiCuti,
        },
        summary: {
          jatahCutiTahunan,
          totalHariCutiDisetujui,
          sisaCuti,
          sisaCutiSetelahPengajuan: Math.max(sisaCuti - durasiCuti, 0),
        },
      },
    };
  }

  async findMine(nip: string) {
    const pegawai = await this.prisma.pegawai.findUnique({
      where: { nip: String(nip) },
      select: {
        id: true,
        nip: true,
        nama: true,
        jabatan: true,
        role: true,
      },
    });

    if (!pegawai) {
      throw new NotFoundException('Data pegawai tidak ditemukan');
    }

    const leaveRequests = await this.prisma.cuti.findMany({
      where: { pegawaiId: pegawai.id },
      select: {
        id: true,
        jenis_cuti: true,
        tanggal_mulai: true,
        tanggal_selesai: true,
        alasan: true,
        status: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const items = leaveRequests.map((item) => ({
      ...item,
      durasiCuti: this.calculateDurationInDays(
        this.startOfDay(item.tanggal_mulai),
        this.startOfDay(item.tanggal_selesai),
      ),
    }));

    return {
      message: 'Riwayat pengajuan cuti berhasil diambil',
      data: {
        pegawai,
        total: items.length,
        items,
      },
    };
  }
}