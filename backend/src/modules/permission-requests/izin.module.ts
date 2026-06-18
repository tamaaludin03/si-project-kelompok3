import { Module } from '@nestjs/common';
import { IzinController } from './izin.controller';
import { IzinService } from './izin.service';
import { RoleService } from "../auth/role.service";
import { PrismaService } from '../../prisma.service';
import { AuditLogModule } from "../audit-log/audit-log.module";

@Module({
  imports: [AuditLogModule],
  controllers: [IzinController],
  providers: [IzinService, RoleService, PrismaService],
  exports: [IzinService],
})
export class IzinModule {}