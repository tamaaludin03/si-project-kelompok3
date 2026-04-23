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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveRequestsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let LeaveRequestsService = class LeaveRequestsService {
    constructor(prisma) {
        this.prisma = prisma;
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
        const tanggalMulai = new Date(dto.tanggal_mulai);
        const tanggalSelesai = new Date(dto.tanggal_selesai);
        if (Number.isNaN(tanggalMulai.getTime()) ||
            Number.isNaN(tanggalSelesai.getTime())) {
            throw new common_1.BadRequestException('Format tanggal tidak valid');
        }
        if (tanggalSelesai < tanggalMulai) {
            throw new common_1.BadRequestException('Tanggal selesai tidak boleh sebelum tanggal mulai');
        }
        const leaveRequest = await this.prisma.cuti.create({
            data: {
                pegawaiId: pegawai.id,
                jenis_cuti: dto.jenis_cuti,
                tanggal_mulai: tanggalMulai,
                tanggal_selesai: tanggalSelesai,
                alasan: dto.alasan,
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
        return {
            message: 'Pengajuan cuti berhasil dibuat',
            data: {
                pegawai,
                pengajuan: leaveRequest,
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
            where: {
                pegawaiId: pegawai.id,
            },
            orderBy: {
                created_at: 'desc',
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
        return {
            message: 'Riwayat pengajuan cuti berhasil diambil',
            data: {
                pegawai,
                total: leaveRequests.length,
                items: leaveRequests,
            },
        };
    }
};
exports.LeaveRequestsService = LeaveRequestsService;
exports.LeaveRequestsService = LeaveRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof prisma_service_1.PrismaService !== "undefined" && prisma_service_1.PrismaService) === "function" ? _a : Object])
], LeaveRequestsService);
//# sourceMappingURL=leave-requests.service.js.map