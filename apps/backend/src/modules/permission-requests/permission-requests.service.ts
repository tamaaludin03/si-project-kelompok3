import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreatePermissionRequestDto } from './dto/create-permission-request.dto';

@Injectable()
export class PermissionRequestsService {
  constructor(private readonly prisma: PrismaService) {}

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

  private isValidTimeFormat(value?: string): boolean {
    if (!value) return true;
    return /^\d{2}:\d{2}$/.test(value);
  }

  private timeToMinutes(value: string): number {
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
  }

  async create(dto: CreatePermissionRequestDto) {
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

    const tanggalIzin = this.startOfDay(this.parseLocalDate(dto.tanggal));
    const hariIni = this.startOfDay(new Date());

    if (tanggalIzin < hariIni) {
      throw new BadRequestException('Tanggal izin tidak boleh di masa lalu');
    }

    if (!this.isValidTimeFormat(dto.jam_mulai)) {
      throw new BadRequestException('Format jam_mulai tidak valid');
    }

    if (!this.isValidTimeFormat(dto.jam_selesai)) {
      throw new BadRequestException('Format jam_selesai tidak valid');
    }

    if (dto.jam_mulai && dto.jam_selesai) {
      if (this.timeToMinutes(dto.jam_selesai) < this.timeToMinutes(dto.jam_mulai)) {
        throw new BadRequestException(
          'Jam selesai tidak boleh sebelum jam mulai',
        );
      }
    }

    const overlappingIzin = await this.prisma.izin.findFirst({
      where: {
        pegawaiId: pegawai.id,
        tanggal: tanggalIzin,
        status: {
          in: ['pending', 'disetujui'],
        },
        jenis_izin: dto.jenis_izin,
      },
      select: {
        id: true,
        jenis_izin: true,
        tanggal: true,
        status: true,
      },
    });

    if (overlappingIzin) {
      throw new BadRequestException(
        'Pengajuan izin dengan jenis yang sama pada tanggal tersebut sudah ada',
      );
    }

    const permissionRequest = await this.prisma.izin.create({
      data: {
        pegawaiId: pegawai.id,
        jenis_izin: dto.jenis_izin.trim(),
        tanggal: tanggalIzin,
        jam_mulai: dto.jam_mulai?.trim() || null,
        jam_selesai: dto.jam_selesai?.trim() || null,
        alasan: dto.alasan.trim(),
        status: 'pending',
      },
      select: {
        id: true,
        jenis_izin: true,
        tanggal: true,
        jam_mulai: true,
        jam_selesai: true,
        alasan: true,
        status: true,
        created_at: true,
      },
    });

    return {
      message: 'Pengajuan izin berhasil dibuat',
      data: {
        pegawai,
        pengajuan: permissionRequest,
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

    const permissionRequests = await this.prisma.izin.findMany({
      where: {
        pegawaiId: pegawai.id,
      },
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        jenis_izin: true,
        tanggal: true,
        jam_mulai: true,
        jam_selesai: true,
        alasan: true,
        status: true,
        created_at: true,
      },
    });

    return {
      message: 'Riwayat pengajuan izin berhasil diambil',
      data: {
        pegawai,
        total: permissionRequests.length,
        items: permissionRequests,
      },
    };
  }
}