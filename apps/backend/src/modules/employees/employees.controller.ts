import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { EmployeesService } from './employees.service';

@Controller('pegawai')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('me/:nip')
  async getProfile(@Param('nip') nip: string) {
    return this.employeesService.getProfileByNip(nip);
  }

  @Put('me/:nip')
  async updateProfile(
    @Param('nip') nip: string,
    @Body() body: { email?: string; no_hp?: string },
  ) {
    return this.employeesService.updateProfileByNip(nip, body);
  }
}