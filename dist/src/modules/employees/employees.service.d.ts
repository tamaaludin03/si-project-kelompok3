import { PrismaService } from '../../prisma.service';
export declare class EmployeesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getProfileByNip(nip: string): Promise<{
        message: string;
        data: {
            id: number;
            nip: string;
            nama: string;
            jabatan: string;
            must_change_password: boolean;
            role: string;
            tanggal_lahir: Date;
        };
    }>;
}
