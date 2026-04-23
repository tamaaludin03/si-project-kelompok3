import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getSummary(nip: string): Promise<{
        message: string;
        data: {
            pegawai: {
                id: number;
                nip: string;
                nama: string;
                jabatan: string;
                role: string;
            };
            summary: {
                jatahCutiTahunan: number;
                sisaCuti: number;
                totalPengajuanCuti: number;
                totalCutiDisetujui: number;
                totalCutiPending: number;
                totalCutiDitolak: number;
                totalHariCutiDisetujui: number;
                totalHariCutiPending: number;
                totalIzin: number;
                totalIzinPending: number;
                totalIzinDisetujui: number;
                totalIzinDitolak: number;
            };
        };
    }>;
}
