import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: LoginDto): Promise<{
        message: string;
        nip: string;
        nama: string;
        jabatan: string;
        role: string;
    }>;
    changePassword(body: ChangePasswordDto & {
        nip: string;
    }): Promise<{
        message: string;
        nip: string;
    }>;
}
