import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(nip: string, password: string) {
    const user = await this.prisma.pegawai.findUnique({
      where: { nip: String(nip) },
    });

    if (!user) {
      throw new UnauthorizedException('NIP atau password salah');
    }

    if (user.failedLoginAttempts >= 5) {
      throw new ForbiddenException(
        'Akun Anda terkunci sementara karena terlalu banyak percobaan login gagal',
      );
    }

    if (String(user.password) !== String(password)) {
      await this.prisma.pegawai.update({
        where: { nip: String(nip) },
        data: {
          failedLoginAttempts: {
            increment: 1,
          },
        },
      });

      throw new UnauthorizedException('NIP atau password salah');
    }

    if (user.failedLoginAttempts !== 0) {
      await this.prisma.pegawai.update({
        where: { nip: String(nip) },
        data: {
          failedLoginAttempts: 0,
        },
      });
    }

    return {
      message: 'Login berhasil',
      nip: user.nip,
      nama: user.nama,
      jabatan: user.jabatan,
      role: user.role,
    };
  }

  async changePassword(
    nip: string,
    oldPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    const user = await this.prisma.pegawai.findUnique({
      where: { nip: String(nip) },
    });

    if (!user) {
      throw new NotFoundException('Data pegawai tidak ditemukan');
    }

    if (String(user.password) !== String(oldPassword)) {
      throw new BadRequestException('Password lama tidak sesuai');
    }

    if (!newPassword || String(newPassword).length < 8) {
      throw new BadRequestException('Password baru minimal 8 karakter');
    }

    if (String(newPassword) !== String(confirmPassword)) {
      throw new BadRequestException(
        'Konfirmasi password harus sama dengan password baru',
      );
    }

    await this.prisma.pegawai.update({
      where: { nip: String(nip) },
      data: {
        password: String(newPassword),
        must_change_password: false,
      },
    });

    return {
      message: 'Password berhasil diubah',
      nip: user.nip,
    };
  }
}