import { PrismaService } from '../../prisma.service';
import { NotificationsGateway } from './notifications.gateway';
export interface NotificationData {
    nip: string;
    type: 'cuti' | 'izin';
    id: number;
    status: 'pending' | 'disetujui' | 'ditolak';
    jenis: string;
    tanggal: string;
}
export declare class NotificationsService {
    private readonly prisma;
    private readonly gateway;
    private readonly logger;
    constructor(prisma: PrismaService, gateway: NotificationsGateway);
    createNotification(nip: string, type: 'cuti' | 'izin', id: number): Promise<void>;
    private getNotificationData;
    notifyStatusChange(nip: string, type: 'cuti' | 'izin', id: number, status: string): Promise<void>;
}
