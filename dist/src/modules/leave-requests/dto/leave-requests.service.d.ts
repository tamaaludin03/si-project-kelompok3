import { PrismaService } from '../../prisma.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
export declare class LeaveRequestsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateLeaveRequestDto): Promise<{
        message: string;
        data: {
            pegawai: any;
            pengajuan: any;
        };
    }>;
    findMine(nip: string): Promise<{
        message: string;
        data: {
            pegawai: any;
            total: any;
            items: any;
        };
    }>;
}
