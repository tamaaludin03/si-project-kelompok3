import { Controller, Get, Param } from '@nestjs/common';
import { EmployeesService } from './employees.service';

@Controller('pegawai')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('me/:nip')
  async getProfile(@Param('nip') nip: string) {
    return this.employeesService.getProfileByNip(nip);
  }
}