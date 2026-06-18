import { Module } from "@nestjs/common";
import { CutiController } from "./cuti.controller";
import { CutiService } from "./cuti.service";
import { PrismaService } from "../../prisma.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { RoleService } from "../auth/role.service";
import { AuditLogModule } from "../audit-log/audit-log.module";

@Module({
  imports: [AuditLogModule],
  controllers: [CutiController],
  providers: [CutiService, PrismaService, NotificationsGateway, RoleService],
})
export class CutiModule {}