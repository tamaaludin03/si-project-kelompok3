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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let AuthService = class AuthService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async login(nip, password) {
        const user = await this.prisma.pegawai.findUnique({
            where: { nip: String(nip) },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('NIP atau password salah');
        }
        if (user.failedLoginAttempts >= 5) {
            throw new common_1.ForbiddenException('Akun Anda terkunci sementara karena terlalu banyak percobaan login gagal');
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
            throw new common_1.UnauthorizedException('NIP atau password salah');
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
    async changePassword(nip, oldPassword, newPassword, confirmPassword) {
        const user = await this.prisma.pegawai.findUnique({
            where: { nip: String(nip) },
        });
        if (!user) {
            throw new common_1.NotFoundException('Data pegawai tidak ditemukan');
        }
        if (String(user.password) !== String(oldPassword)) {
            throw new common_1.BadRequestException('Password lama tidak sesuai');
        }
        if (!newPassword || String(newPassword).length < 8) {
            throw new common_1.BadRequestException('Password baru minimal 8 karakter');
        }
        if (String(newPassword) !== String(confirmPassword)) {
            throw new common_1.BadRequestException('Konfirmasi password harus sama dengan password baru');
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map