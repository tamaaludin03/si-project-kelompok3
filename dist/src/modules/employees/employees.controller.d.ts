import { EmployeesService } from './employees.service';
export declare class EmployeesController {
    private readonly employeesService;
    constructor(employeesService: EmployeesService);
    getProfile(nip: string): Promise<{
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
