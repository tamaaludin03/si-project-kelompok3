import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfileByNip(nip: string) {
    const user = await this.prisma.pegawai.findUnique({
      where: { nip: String(nip) },
      select: {
        id: true,
        nip: true,
        nama: true,
        jabatan: true,
        role: true,
        tanggal_lahir: true,
        must_change_password: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Data pegawai tidak ditemukan');
    }

    return {
      message: 'Profil pegawai berhasil diambil',
      data: user,
    };
  }
}