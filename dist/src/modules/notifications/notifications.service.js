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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const notifications_gateway_1 = require("./notifications.gateway");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma, gateway) {
        this.prisma = prisma;
        this.gateway = gateway;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async createNotification(nip, type, id) {
        const data = await this.getNotificationData(nip, type, id);
        this.gateway.notifyUser(nip, 'new_submission', data);
        this.logger.log(`Notifikasi dikirim ke ${nip}: ${type} #${id}`);
    }
    async getNotificationData(nip, type, id) {
        if (type === 'cuti') {
            const cuti = await this.prisma.cuti.findUnique({
                where: { id },
                select: { jenis_cuti: true, tanggal_mulai: true },
            });
            return {
                nip,
                type,
                id,
                status: 'pending',
                jenis: cuti?.jenis_cuti || 'Cuti Tahunan',
                tanggal: cuti?.tanggal_mulai.toISOString().split('T')[0] || '',
            };
        }
        const izin = await this.prisma.izin.findUnique({
            where: { id },
            select: { jenis_izin: true, tanggal: true },
        });
        return {
            nip,
            type,
            id,
            status: 'pending',
            jenis: izin?.jenis_izin || 'Izin',
            tanggal: izin?.tanggal.toISOString().split('T')[0] || '',
        };
    }
    async notifyStatusChange(nip, type, id, status) {
        const data = await this.getNotificationData(nip, type, id);
        data.status = status;
        this.gateway.notifyUser(nip, 'status_updated', data);
        this.logger.log(`Status update notifikasi: ${nip} - ${status}`);
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_gateway_1.NotificationsGateway])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map