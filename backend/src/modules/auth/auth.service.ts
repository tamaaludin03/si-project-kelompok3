import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.pegawai.findUnique({
      where: {
        username: String(username),
      },
    });

    if (!user) {
      throw new UnauthorizedException("Username atau password salah");
    }

    if (user.failedLoginAttempts >= 5) {
      throw new ForbiddenException(
        "Akun Anda terkunci sementara karena terlalu banyak percobaan login gagal",
      );
    }

    const isPasswordValid = await bcrypt.compare(String(password), user.password);

    if (!isPasswordValid) {
      await this.prisma.pegawai.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: {
            increment: 1,
          },
        },
      });

      throw new UnauthorizedException("Username atau password salah");
    }

    if (user.failedLoginAttempts !== 0) {
      await this.prisma.pegawai.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
        },
      });
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      internal_role: user.internal_role,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      message: "Login berhasil",
      access_token,
      user: {
        id: user.id,
        username: user.username,
        nip: user.nip,
        nama: user.nama,
        jabatan: user.jabatan,
        unit: user.unit,
        role: user.role,
        internal_role: user.internal_role,
        jenis_kelamin: user.jenis_kelamin,
        portal_pegawai_access: user.portal_pegawai_access,
        must_change_password: user.must_change_password,
      },
    };
  }

  async changePassword(
    username: string,
    oldPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    const user = await this.prisma.pegawai.findUnique({
      where: {
        username: String(username),
      },
    });

    if (!user) {
      throw new NotFoundException("Data pegawai tidak ditemukan");
    }

    const isOldPasswordValid = await bcrypt.compare(String(oldPassword), user.password);

    if (!isOldPasswordValid) {
      throw new BadRequestException("Password lama tidak sesuai");
    }

    if (!newPassword || String(newPassword).length < 8) {
      throw new BadRequestException("Password baru minimal 8 karakter");
    }

    if (String(newPassword) !== String(confirmPassword)) {
      throw new BadRequestException(
        "Konfirmasi password harus sama dengan password baru",
      );
    }

    if (String(oldPassword) === String(newPassword)) {
      throw new BadRequestException(
        "Password baru tidak boleh sama dengan password lama",
      );
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 12);

    await this.prisma.pegawai.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
        must_change_password: false,
        failedLoginAttempts: 0,
      },
    });

    return {
      message: "Password berhasil diubah",
      username: user.username,
    };
  }
}