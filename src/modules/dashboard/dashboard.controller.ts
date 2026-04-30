import { Controller, Get, Param, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary/:nip')
  async getSummary(@Param('nip') nip: string) {
    return this.dashboardService.getSummaryByNip(nip);
  }

  // Tambahkan ini untuk Homepage Admin:
  @Get('admin')
  async getAdminDashboard(@Request() req) {
    return this.dashboardService.getAdminDashboardData(req.user.role);
  }
}