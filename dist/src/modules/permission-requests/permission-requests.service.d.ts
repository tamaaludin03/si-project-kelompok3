import { PrismaService } from '../../prisma.service';
import { CreatePermissionRequestDto } from './dto/create-permission-request.dto';
export declare class PermissionRequestsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private parseLocalDate;
    private startOfDay;
    private isValidTimeFormat;
    private timeToMinutes;
    create(dto: CreatePermissionRequestDto): Promise<{
        message: string;
        data: {
            pegawai: {
                id: number;
                nip: string;
                nama: string;
                jabatan: string;
                role: string;
            };
            pengajuan: {
                id: number;
                jenis_izin: string;
                tanggal: Date;
                jam_mulai: string;
                jam_selesai: string;
                alasan: string;
                status: string;
                created_at: Date;
            };
        };
    }>;
    findMine(nip: string): Promise<{
        message: string;
        data: {
            pegawai: {
                id: number;
                nip: string;
                nama: string;
                jabatan: string;
                role: string;
            };
            total: number;
            items: {
                id: number;
                jenis_izin: string;
                tanggal: Date;
                jam_mulai: string;
                jam_selesai: string;
                alasan: string;
                status: string;
                created_at: Date;
            }[];
        };
    }>;
}
