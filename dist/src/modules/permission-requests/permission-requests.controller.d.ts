import { PermissionRequestsService } from './permission-requests.service';
import { CreatePermissionRequestDto } from './dto/create-permission-request.dto';
export declare class PermissionRequestsController {
    private readonly permissionRequestsService;
    constructor(permissionRequestsService: PermissionRequestsService);
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
