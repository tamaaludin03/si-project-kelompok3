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
exports.LeaveRequestsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
let LeaveRequestsService = class LeaveRequestsService {
    constructor(prisma, notificationsGateway) {
        this.prisma = prisma;
        this.notificationsGateway = notificationsGateway;
    }
    parseLocalDate(value) {
        const parts = value.split('-');
        if (parts.length !== 3) {
            throw new common_1.BadRequestException('Format tanggal tidak valid');
        }
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        if (!year || !month || !day) {
            throw new common_1.BadRequestException('Format tanggal tidak valid');
        }
        return new Date(year, month - 1, day);
    }
    startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    calculateDurationInDays(start, end) {
        const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
        const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
        return Math.floor((utcEnd - utcStart) / (1000 * 60 * 60 * 24)) + 1;
    }
    async calculateApprovedLeaveDays(pegawaiId) {
        const approvedLeaves = await this.prisma.cuti.findMany({
            where: {
                pegawaiId,
                status: 'disetujui',
            },
            select: {
                tanggal_mulai: true,
                tanggal_selesai: true,
            },
        });
        return approvedLeaves.reduce((total, item) => {
            const mulai = this.startOfDay(item.tanggal_mulai);
            const selesai = this.startOfDay(item.tanggal_selesai);
            return total + this.calculateDurationInDays(mulai, selesai);
        }, 0);
    }
    async create(dto) {
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
            throw new common_1.NotFoundException('Data pegawai tidak ditemukan');
        }
        const tanggalMulai = this.startOfDay(this.parseLocalDate(dto.tanggal_mulai));
        const tanggalSelesai = this.startOfDay(this.parseLocalDate(dto.tanggal_selesai));
        const hariIni = this.startOfDay(new Date());
        if (tanggalMulai < hariIni) {
            throw new common_1.BadRequestException('Tanggal mulai cuti tidak boleh di masa lalu');
        }
        if (tanggalSelesai < tanggalMulai) {
            throw new common_1.BadRequestException('Tanggal selesai tidak boleh sebelum tanggal mulai');
        }
        const durasiCuti = this.calculateDurationInDays(tanggalMulai, tanggalSelesai);
        const jatahCutiTahunan = 12;
        const totalHariCutiDisetujui = await this.calculateApprovedLeaveDays(pegawai.id);
        const sisaCuti = jatahCutiTahunan - totalHariCutiDisetujui;
        if (durasiCuti > sisaCuti) {
            throw new common_1.BadRequestException(`Pengajuan cuti melebihi sisa kuota. Sisa cuti Anda ${sisaCuti} hari`);
        }
        const overlappingLeave = await this.prisma.cuti.findFirst({
            where: {
                pegawaiId: pegawai.id,
                status: { in: ['pending', 'disetujui'] },
                tanggal_mulai: { lte: tanggalSelesai },
                tanggal_selesai: { gte: tanggalMulai },
            },
            select: {
                id: true,
                jenis_cuti: true,
                tanggal_mulai: true,
                tanggal_selesai: true,
                status: true,
            },
        });
        if (overlappingLeave) {
            throw new common_1.BadRequestException('Pengajuan cuti bentrok dengan data cuti yang sudah ada');
        }
        const leaveRequest = await this.prisma.cuti.create({
            data: {
                pegawaiId: pegawai.id,
                jenis_cuti: dto.jenis_cuti.trim(),
                tanggal_mulai: tanggalMulai,
                tanggal_selesai: tanggalSelesai,
                alasan: dto.alasan.trim(),
                status: 'pending',
            },
            select: {
                id: true,
                jenis_cuti: true,
                tanggal_mulai: true,
                tanggal_selesai: true,
                alasan: true,
                status: true,
                created_at: true,
            },
        });
        this.notificationsGateway.notifyUser(pegawai.nip, 'new_submission', {
            type: 'cuti',
            id: leaveRequest.id,
            jenis: leaveRequest.jenis_cuti,
            status: leaveRequest.status,
            tanggal_mulai: leaveRequest.tanggal_mulai,
            tanggal_selesai: leaveRequest.tanggal_selesai,
            message: `Pengajuan cuti ${leaveRequest.jenis_cuti} berhasil dibuat`,
        });
        return {
            message: 'Pengajuan cuti berhasil dibuat',
            data: {
                pegawai,
                pengajuan: {
                    ...leaveRequest,
                    durasiCuti,
                },
                summary: {
                    jatahCutiTahunan,
                    totalHariCutiDisetujui,
                    sisaCuti,
                    sisaCutiSetelahPengajuan: Math.max(sisaCuti - durasiCuti, 0),
                },
            },
        };
    }
    async findMine(nip) {
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
        const leaveRequests = await this.prisma.cuti.findMany({
            where: { pegawaiId: pegawai.id },
            select: {
                id: true,
                jenis_cuti: true,
                tanggal_mulai: true,
                tanggal_selesai: true,
                alasan: true,
                status: true,
                created_at: true,
            },
            orderBy: {
                created_at: 'desc',
            },
        });
        const items = leaveRequests.map((item) => ({
            ...item,
            durasiCuti: this.calculateDurationInDays(this.startOfDay(item.tanggal_mulai), this.startOfDay(item.tanggal_selesai)),
        }));
        return {
            message: 'Riwayat pengajuan cuti berhasil diambil',
            data: {
                pegawai,
                total: items.length,
                items,
            },
        };
    }
};
exports.LeaveRequestsService = LeaveRequestsService;
exports.LeaveRequestsService = LeaveRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_gateway_1.NotificationsGateway])
], LeaveRequestsService);
//# sourceMappingURL=leave-requests.service.js.map