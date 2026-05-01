import { Module } from '@nestjs/common';
import { PermissionRequestsController } from './permission-requests.controller';
import { PermissionRequestsService } from './permission-requests.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [PermissionRequestsController],
  providers: [PermissionRequestsService, PrismaService],
})
export class PermissionRequestsModule {}