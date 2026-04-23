import { Controller, Get, Param } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary/:nip')
  async getSummary(@Param('nip') nip: string) {
    return this.dashboardService.getSummaryByNip(nip);
  }
}