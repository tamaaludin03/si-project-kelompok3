import { PrismaService } from '../../prisma.service';
export declare class AuthService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    login(nip: string, password: string): Promise<{
        message: string;
        nip: string;
        nama: string;
        jabatan: string;
        role: string;
    }>;
    changePassword(nip: string, oldPassword: string, newPassword: string, confirmPassword: string): Promise<{
        message: string;
        nip: string;
    }>;
}
