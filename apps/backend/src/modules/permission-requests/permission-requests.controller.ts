import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PermissionRequestsService } from './permission-requests.service';
import { CreatePermissionRequestDto } from './dto/create-permission-request.dto';

@Controller('permissions')
export class PermissionRequestsController {
  constructor(
    private readonly permissionRequestsService: PermissionRequestsService,
  ) {}

  @Post()
  create(@Body() dto: CreatePermissionRequestDto) {
    return this.permissionRequestsService.create(dto);
  }

  @Get('mine/:nip')
  findMine(@Param('nip') nip: string) {
    return this.permissionRequestsService.findMine(nip);
  }
}