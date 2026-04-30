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
        email: true,
        no_hp: true,
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

  async updateProfileByNip(
    nip: string,
    body: { email?: string; no_hp?: string },
  ) {
    const existingUser = await this.prisma.pegawai.findUnique({
      where: { nip: String(nip) },
    });

    if (!existingUser) {
      throw new NotFoundException('Data pegawai tidak ditemukan');
    }

    const updatedUser = await this.prisma.pegawai.update({
      where: { nip: String(nip) },
      data: {
        email: body.email ?? null,
        no_hp: body.no_hp ?? null,
      },
      select: {
        id: true,
        nip: true,
        nama: true,
        jabatan: true,
        role: true,
        tanggal_lahir: true,
        must_change_password: true,
        email: true,
        no_hp: true,
      },
    });

    return {
      message: 'Profil pegawai berhasil diperbarui',
      data: updatedUser,
    };
  }
}