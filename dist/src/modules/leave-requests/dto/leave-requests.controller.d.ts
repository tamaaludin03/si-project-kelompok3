import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
export declare class LeaveRequestsController {
    private readonly leaveRequestsService;
    constructor(leaveRequestsService: LeaveRequestsService);
    create(body: CreateLeaveRequestDto): Promise<{
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
