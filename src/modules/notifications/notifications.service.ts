import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async createNotification(nip: string, type: 'cuti' | 'izin', id: number) {
    const data = await this.getNotificationData(nip, type, id);
    
    // Simpan ke database (optional)
    // await this.prisma.notification.create({...});
    
    // Emit real-time ke client yang connect
    this.gateway.notifyUser(nip, 'new_submission', data);
    
    this.logger.log(`Notifikasi dikirim ke ${nip}: ${type} #${id}`);
  }

  private async getNotificationData(
    nip: string,
    type: 'cuti' | 'izin',
    id: number,
  ): Promise<NotificationData> {
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

  async notifyStatusChange(nip: string, type: 'cuti' | 'izin', id: number, status: string) {
    const data = await this.getNotificationData(nip, type, id);
    data.status = status as any;
    
    this.gateway.notifyUser(nip, 'status_updated', data);
    this.logger.log(`Status update notifikasi: ${nip} - ${status}`);
  }
}