"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let DashboardService = class DashboardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    calculateDurationInDays(start, end) {
        const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
        const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
        return Math.floor((utcEnd - utcStart) / (1000 * 60 * 60 * 24)) + 1;
    }
    async getSummaryByNip(nip) {
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
            throw new common_1.NotFoundException('Data pegawai tidak ditemukan');
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
            return (total +
                this.calculateDurationInDays(this.startOfDay(item.tanggal_mulai), this.startOfDay(item.tanggal_selesai)));
        }, 0);
        const totalHariCutiPending = cutiPending.reduce((total, item) => {
            return (total +
                this.calculateDurationInDays(this.startOfDay(item.tanggal_mulai), this.startOfDay(item.tanggal_selesai)));
        }, 0);
        const allIzin = await this.prisma.izin.findMany({
            where: { pegawaiId: pegawai.id },
            select: {
                id: true,
                status: true,
            },
        });
        const totalIzin = allIzin.length;
        const totalIzinPending = allIzin.filter((item) => item.status === 'pending').length;
        const totalIzinDisetujui = allIzin.filter((item) => item.status === 'disetujui').length;
        const totalIzinDitolak = allIzin.filter((item) => item.status === 'ditolak').length;
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
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map