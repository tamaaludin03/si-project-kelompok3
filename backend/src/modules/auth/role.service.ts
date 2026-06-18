import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async assertRole(nip: string, allowedRoles: string[]) {
    const pegawai = await this.prisma.pegawai.findUnique({
      where: { nip },
      select: {
        id: true,
        nip: true,
        nama: true,
        role: true,
        internal_role: true,
      },
    });

    if (!pegawai) {
      throw new ForbiddenException("Pegawai tidak ditemukan");
    }

    const userRole = String(pegawai.role || "").toLowerCase().trim();
    const userInternalRole = String(pegawai.internal_role || "")
      .toLowerCase()
      .trim();

    const normalizedAllowedRoles = allowedRoles.map((role) =>
      String(role).toLowerCase().trim(),
    );

    const hasAccess =
      normalizedAllowedRoles.includes(userRole) ||
      normalizedAllowedRoles.includes(userInternalRole);

    if (!hasAccess) {
      throw new ForbiddenException("Anda tidak memiliki akses ke fitur ini");
    }

    return pegawai;
  }
}