import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
export declare class LeaveRequestsController {
    private readonly leaveRequestsService;
    constructor(leaveRequestsService: LeaveRequestsService);
    create(dto: CreateLeaveRequestDto): Promise<{
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
                durasiCuti: number;
                id: number;
                jenis_cuti: string;
                tanggal_mulai: Date;
                tanggal_selesai: Date;
                alasan: string;
                status: string;
                created_at: Date;
            };
            summary: {
                jatahCutiTahunan: number;
                totalHariCutiDisetujui: number;
                sisaCuti: number;
                sisaCutiSetelahPengajuan: number;
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
                durasiCuti: number;
                id: number;
                jenis_cuti: string;
                tanggal_mulai: Date;
                tanggal_selesai: Date;
                alasan: string;
                status: string;
                created_at: Date;
            }[];
        };
    }>;
}
