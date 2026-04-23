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
exports.PermissionRequestsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let PermissionRequestsService = class PermissionRequestsService {
    constructor(prisma) {
        this.prisma = prisma;
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
    isValidTimeFormat(value) {
        if (!value)
            return true;
        return /^\d{2}:\d{2}$/.test(value);
    }
    timeToMinutes(value) {
        const [hour, minute] = value.split(':').map(Number);
        return hour * 60 + minute;
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
        const tanggalIzin = this.startOfDay(this.parseLocalDate(dto.tanggal));
        const hariIni = this.startOfDay(new Date());
        if (tanggalIzin < hariIni) {
            throw new common_1.BadRequestException('Tanggal izin tidak boleh di masa lalu');
        }
        if (!this.isValidTimeFormat(dto.jam_mulai)) {
            throw new common_1.BadRequestException('Format jam_mulai tidak valid');
        }
        if (!this.isValidTimeFormat(dto.jam_selesai)) {
            throw new common_1.BadRequestException('Format jam_selesai tidak valid');
        }
        if (dto.jam_mulai && dto.jam_selesai) {
            if (this.timeToMinutes(dto.jam_selesai) < this.timeToMinutes(dto.jam_mulai)) {
                throw new common_1.BadRequestException('Jam selesai tidak boleh sebelum jam mulai');
            }
        }
        const overlappingIzin = await this.prisma.izin.findFirst({
            where: {
                pegawaiId: pegawai.id,
                tanggal: tanggalIzin,
                status: {
                    in: ['pending', 'disetujui'],
                },
                jenis_izin: dto.jenis_izin,
            },
            select: {
                id: true,
                jenis_izin: true,
                tanggal: true,
                status: true,
            },
        });
        if (overlappingIzin) {
            throw new common_1.BadRequestException('Pengajuan izin dengan jenis yang sama pada tanggal tersebut sudah ada');
        }
        const permissionRequest = await this.prisma.izin.create({
            data: {
                pegawaiId: pegawai.id,
                jenis_izin: dto.jenis_izin.trim(),
                tanggal: tanggalIzin,
                jam_mulai: dto.jam_mulai?.trim() || null,
                jam_selesai: dto.jam_selesai?.trim() || null,
                alasan: dto.alasan.trim(),
                status: 'pending',
            },
            select: {
                id: true,
                jenis_izin: true,
                tanggal: true,
                jam_mulai: true,
                jam_selesai: true,
                alasan: true,
                status: true,
                created_at: true,
            },
        });
        return {
            message: 'Pengajuan izin berhasil dibuat',
            data: {
                pegawai,
                pengajuan: permissionRequest,
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
        const permissionRequests = await this.prisma.izin.findMany({
            where: {
                pegawaiId: pegawai.id,
            },
            orderBy: {
                created_at: 'desc',
            },
            select: {
                id: true,
                jenis_izin: true,
                tanggal: true,
                jam_mulai: true,
                jam_selesai: true,
                alasan: true,
                status: true,
                created_at: true,
            },
        });
        return {
            message: 'Riwayat pengajuan izin berhasil diambil',
            data: {
                pegawai,
                total: permissionRequests.length,
                items: permissionRequests,
            },
        };
    }
};
exports.PermissionRequestsService = PermissionRequestsService;
exports.PermissionRequestsService = PermissionRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PermissionRequestsService);
//# sourceMappingURL=permission-requests.service.js.map