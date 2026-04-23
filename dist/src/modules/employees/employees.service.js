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
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let EmployeesService = class EmployeesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProfileByNip(nip) {
        const user = await this.prisma.pegawai.findUnique({
            where: { nip: String(nip) },
            select: {
                id: true,
                nip: true,
                nama: true,
                jabatan: true,
                role: true,
                tanggal_lahir: true,
                must_change_password: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('Data pegawai tidak ditemukan');
        }
        return {
            message: 'Profil pegawai berhasil diambil',
            data: user,
        };
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map