import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}
  
  async getAdminDashboardData(role: string) {
  const stats = await this.prisma.pegawai.groupBy({
    by: ['jabatan'],
    _count: { nip: true },
  });

  return {
    message: 'Dashboard Admin',
    totalPegawai: await this.prisma.pegawai.count(),
    statsByJabatan: stats,
  };
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

  async getSummaryByNip(nip: string) {
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

    const allCuti = await this.prisma.cuti.findMany({
      where: { pegawaiId: pegawai.id },
      select: {
        id: true,
        status: true,
        tanggal_mulai: true,
        tanggal_selesai: true,
      },
    });

    const totalPengajuanCuti = allCuti.length;
    const cutiDisetujui = allCuti.filter((item) => item.status === 'disetujui');
    const cutiPending = allCuti.filter((item) => item.status === 'pending');
    const cutiDitolak = allCuti.filter((item) => item.status === 'ditolak');

    const totalHariCutiDisetujui = cutiDisetujui.reduce((total, item) => {
      return (
        total +
        this.calculateDurationInDays(
          this.startOfDay(item.tanggal_mulai),
          this.startOfDay(item.tanggal_selesai),
        )
      );
    }, 0);

    const totalHariCutiPending = cutiPending.reduce((total, item) => {
      return (
        total +
        this.calculateDurationInDays(
          this.startOfDay(item.tanggal_mulai),
          this.startOfDay(item.tanggal_selesai),
        )
      );
    }, 0);

    const allIzin = await this.prisma.izin.findMany({
      where: { pegawaiId: pegawai.id },
      select: {
        id: true,
        status: true,
      },
    });

    const totalIzin = allIzin.length;
    const totalIzinPending = allIzin.filter(
      (item) => item.status === 'pending',
    ).length;
    const totalIzinDisetujui = allIzin.filter(
      (item) => item.status === 'disetujui',
    ).length;
    const totalIzinDitolak = allIzin.filter(
      (item) => item.status === 'ditolak',
    ).length;

    const jatahCutiTahunan = 12;
    const sisaCuti = Math.max(jatahCutiTahunan - totalHariCutiDisetujui, 0);

    return {
      message: 'Ringkasan dashboard berhasil diambil',
      data: {
        pegawai,
        summary: {
          jatahCutiTahunan,
          sisaCuti,
          totalPengajuanCuti,
          totalCutiDisetujui: cutiDisetujui.length,
          totalCutiPending: cutiPending.length,
          totalCutiDitolak: cutiDitolak.length,
          totalHariCutiDisetujui,
          totalHariCutiPending,
          totalIzin,
          totalIzinPending,
          totalIzinDisetujui,
          totalIzinDitolak,
        },
      },
    };
  }
}