import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class VerifikasiService {
  constructor(private readonly prisma: PrismaService) {}

  async verify(kode: string) {
    const [type, idRaw] = kode.split("-");
    const id = Number(idRaw);

    if (!type || !id || Number.isNaN(id)) {
      throw new NotFoundException("Kode dokumen tidak valid");
    }

    if (type.toUpperCase() === "CUTI") {
      const cuti = await this.prisma.cuti.findUnique({
        where: { id },
        include: {
          pegawai: true,
        },
      });

      if (!cuti || cuti.status !== "disetujui_final") {
        throw new NotFoundException("Dokumen cuti tidak ditemukan");
      }

      return {
        message: "Dokumen cuti valid",
        data: {
          valid: true,
          jenis_dokumen: "CUTI",
          kode: `CUTI-${cuti.id}`,
          status: cuti.status,
          nama: cuti.pegawai?.nama,
          nip: cuti.pegawai?.nip,
          jabatan: cuti.pegawai?.jabatan,
          jenis: cuti.jenis_cuti,
          tanggal_mulai: cuti.tanggal_mulai,
          tanggal_selesai: cuti.tanggal_selesai,
          approved_by: cuti.approved_by_direktur || cuti.approved_by_kabag,
          approved_at: cuti.approved_at_direktur || cuti.approved_at_kabag,
        },
      };
    }

    if (type.toUpperCase() === "IZIN") {
      const izin = await this.prisma.izin.findUnique({
        where: { id },
        include: {
          pegawai: true,
        },
      });

      if (!izin || izin.status !== "disetujui_final") {
        throw new NotFoundException("Dokumen izin tidak ditemukan");
      }

      return {
        message: "Dokumen izin valid",
        data: {
          valid: true,
          jenis_dokumen: "IZIN",
          kode: `IZIN-${izin.id}`,
          status: izin.status,
          nama: izin.pegawai?.nama,
          nip: izin.pegawai?.nip,
          jabatan: izin.pegawai?.jabatan,
          jenis: izin.jenis_izin,
          tanggal: izin.tanggal,
          jam_mulai: izin.jam_mulai,
          jam_selesai: izin.jam_selesai,
          approved_by: izin.approved_by_direktur || izin.approved_by_kabag,
          approved_at: izin.approved_at_direktur || izin.approved_at_kabag,
        },
      };
    }

    throw new NotFoundException("Jenis dokumen tidak dikenali");
  }
}