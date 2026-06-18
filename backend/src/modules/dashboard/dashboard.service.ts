import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

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

  private getExpiredStatus(value?: Date | null) {
    if (!value) return "belum_diisi";

    const today = new Date();
    const expired = new Date(value);

    today.setHours(0, 0, 0, 0);
    expired.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil(
      (expired.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) return "expired";
    if (diffDays <= 30) return "kurang_1_bulan";
    if (diffDays <= 90) return "kurang_3_bulan";
    if (diffDays <= 180) return "kurang_6_bulan";
    if (diffDays <= 365) return "kurang_1_tahun";

    return "aman";
  }

  private isPending(status?: string | null) {
    const s = String(status || "").toLowerCase();
    return s === "pending" || s.includes("pending");
  }

  private isProses(status?: string | null) {
    const s = String(status || "").toLowerCase();
    return s.includes("kaur") || s.includes("kabag");
  }

  private isFinal(status?: string | null) {
    const s = String(status || "").toLowerCase();
    return s.includes("final") || s.includes("surat_diterbitkan");
  }

  private isDitolak(status?: string | null) {
    return String(status || "").toLowerCase().includes("tolak");
  }

  async getSummaryByNip(identifier: string) {
    const pegawai = await this.prisma.pegawai.findFirst({
      where: { OR: [{ nip: identifier }, { username: identifier }] },
      select: {
        id: true,
        nip: true,
        nama: true,
        jabatan: true,
        role: true,
      },
    });

    if (!pegawai) {
      throw new NotFoundException("Data pegawai tidak ditemukan");
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

    const cutiDisetujui = allCuti.filter(
      (item) =>
        item.status === "disetujui" || item.status === "disetujui_final",
    );

    const cutiPending = allCuti.filter((item) => item.status === "pending");

    const cutiDitolak = allCuti.filter((item) =>
      item.status.includes("tolak"),
    );

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
      (item) => item.status === "pending",
    ).length;

    const totalIzinDisetujui = allIzin.filter(
      (item) =>
        item.status === "disetujui" || item.status === "disetujui_final",
    ).length;

    const totalIzinDitolak = allIzin.filter((item) =>
      item.status.includes("tolak"),
    ).length;

    const jatahCutiTahunan = 12;
    const sisaCuti = Math.max(jatahCutiTahunan - totalHariCutiDisetujui, 0);

    return {
      message: "Ringkasan dashboard berhasil diambil",
      data: {
        pegawai,
        summary: {
          jatahCutiTahunan,
          sisaCuti,
          totalPengajuanCuti: allCuti.length,
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

  async getDireksiSummary() {
    const totalPegawai = await this.prisma.pegawai.count();

    const totalNakes = await this.prisma.pegawai.count({
      where: {
        is_nakes: true,
      },
    });

    const allCuti = await this.prisma.cuti.findMany({
      include: {
        pegawai: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const allIzin = await this.prisma.izin.findMany({
      include: {
        pegawai: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const totalCuti = allCuti.length;
    const totalIzin = allIzin.length;
    const totalPengajuan = totalCuti + totalIzin;

    const pending =
      allCuti.filter((item) => this.isPending(item.status)).length +
      allIzin.filter((item) => this.isPending(item.status)).length;

    const proses =
      allCuti.filter((item) => this.isProses(item.status)).length +
      allIzin.filter((item) => this.isProses(item.status)).length;

    const approvedFinal =
      allCuti.filter((item) => this.isFinal(item.status)).length +
      allIzin.filter((item) => this.isFinal(item.status)).length;

    const ditolak =
      allCuti.filter((item) => this.isDitolak(item.status)).length +
      allIzin.filter((item) => this.isDitolak(item.status)).length;

    const approvedKaur =
      allCuti.filter((item) => item.status === "disetujui_kaur").length +
      allIzin.filter((item) => item.status === "disetujui_kaur").length;

    const approvedKabag =
      allCuti.filter((item) => item.status === "disetujui_kabag").length +
      allIzin.filter((item) => item.status === "disetujui_kabag").length;

    const suratDiterbitkan = allCuti.filter(
      (item) => item.surat_cuti_diterbitkan,
    ).length;

    const nakes = await this.prisma.pegawai.findMany({
      where: {
        is_nakes: true,
      },
      select: {
        id: true,
        nama: true,
        nip: true,
        jabatan: true,
        nomor_str: true,
        str_seumur_hidup: true,
        expired_sip: true,
      },
      orderBy: {
        nama: "asc",
      },
    });

    // STR tidak lagi memiliki tanggal expired — status berdasarkan str_seumur_hidup & nomor_str
    const strExpired = nakes.filter(
      (item) => !item.nomor_str,
    ).length;

    const sipExpired = nakes.filter(
      (item) => this.getExpiredStatus(item.expired_sip) === "expired",
    ).length;

    const belumIsiStrSip = nakes.filter(
      (item) => !item.nomor_str || !item.expired_sip,
    ).length;

    const hampirExpiredStrSip = nakes.filter((item) => {
      const statusSip = this.getExpiredStatus(item.expired_sip);
      return statusSip.includes("kurang");
    }).length;

    const rekapPerUnitMap = new Map<
      string,
      {
        unit: string;
        totalCuti: number;
        totalIzin: number;
        totalPengajuan: number;
        pending: number;
        proses: number;
        approvedFinal: number;
        ditolak: number;
      }
    >();

    const ensureUnit = (unit?: string | null) => {
      const unitName = unit?.trim() || "Tanpa Unit";

      if (!rekapPerUnitMap.has(unitName)) {
        rekapPerUnitMap.set(unitName, {
          unit: unitName,
          totalCuti: 0,
          totalIzin: 0,
          totalPengajuan: 0,
          pending: 0,
          proses: 0,
          approvedFinal: 0,
          ditolak: 0,
        });
      }

      return rekapPerUnitMap.get(unitName)!;
    };

    for (const item of allCuti) {
      const unit = ensureUnit(item.pegawai?.unit);
      unit.totalCuti += 1;
      unit.totalPengajuan += 1;
      if (this.isPending(item.status)) unit.pending += 1;
      if (this.isProses(item.status)) unit.proses += 1;
      if (this.isFinal(item.status)) unit.approvedFinal += 1;
      if (this.isDitolak(item.status)) unit.ditolak += 1;
    }

    for (const item of allIzin) {
      const unit = ensureUnit(item.pegawai?.unit);
      unit.totalIzin += 1;
      unit.totalPengajuan += 1;
      if (this.isPending(item.status)) unit.pending += 1;
      if (this.isProses(item.status)) unit.proses += 1;
      if (this.isFinal(item.status)) unit.approvedFinal += 1;
      if (this.isDitolak(item.status)) unit.ditolak += 1;
    }

    const rekapPerUnit = Array.from(rekapPerUnitMap.values()).sort(
      (a, b) => b.totalPengajuan - a.totalPengajuan,
    );

    const recentPengajuan = [
      ...allCuti.map((item) => ({
        id: item.id,
        kategori: "Cuti",
        jenis: item.jenis_cuti,
        nama: item.pegawai?.nama || "-",
        nip: item.pegawai?.nip || "-",
        jabatan: item.pegawai?.jabatan || "-",
        unit: item.pegawai?.unit || "-",
        status: item.status,
        tanggal: item.tanggal_mulai,
        created_at: item.created_at,
      })),

      ...allIzin.map((item) => ({
        id: item.id,
        kategori: "Izin",
        jenis: item.jenis_izin,
        nama: item.pegawai?.nama || "-",
        nip: item.pegawai?.nip || "-",
        jabatan: item.pegawai?.jabatan || "-",
        unit: item.pegawai?.unit || "-",
        status: item.status,
        tanggal: item.tanggal,
        created_at: item.created_at,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime(),
      );

    const warningNakes = nakes
      .map((item) => ({
        id: item.id,
        nama: item.nama,
        nip: item.nip,
        jabatan: item.jabatan,
        status_str: item.nomor_str ? (item.str_seumur_hidup ? "aman" : "belum_diisi") : "belum_diisi",
        status_sip: this.getExpiredStatus(item.expired_sip),
        str_seumur_hidup: item.str_seumur_hidup,
        expired_sip: item.expired_sip,
      }))
      .filter(
        (item) => item.status_str !== "aman" || item.status_sip !== "aman",
      );

    const notifikasiDireksi = await this.prisma.notification.findMany({
      where: {
        OR: [
          { target_role: { in: ["direksi", "DIREKSI", "all", "ALL"] } },
          { target_role: null },
        ],
      },
      orderBy: {
        created_at: "desc",
      },
      take: 8,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        entity: true,
        entity_id: true,
        is_read: true,
        created_at: true,
      },
    });

    return {
      message: "Dashboard direksi berhasil diambil",
      data: {
        totalPegawai,
        totalNakes,
        totalCuti,
        totalIzin,
        totalPengajuan,
        pending,
        proses,
        approvedFinal,
        ditolak,
        approvedKaur,
        approvedKabag,
        suratDiterbitkan,
        strExpired,
        sipExpired,
        belumIsiStrSip,
        hampirExpiredStrSip,
        rekapApproval: {
          pending,
          approvedKaur,
          approvedKabag,
          approvedFinal,
          ditolak,
          suratDiterbitkan,
        },
        rekapPerUnit,
        recentPengajuan,
        warningNakes,
        notifikasiDireksi,
      },
    };
  }
}
