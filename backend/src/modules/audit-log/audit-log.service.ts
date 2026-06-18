import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

type CreateAuditLogParams = {
  actor_nip?: string | null;
  actor_name?: string | null;
  actor_role?: string | null;

  action: string;
  entity: string;
  entity_id?: string | null;

  description?: string | null;

  old_value?: any;
  new_value?: any;
};

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async createLog(params: CreateAuditLogParams) {
    return this.prisma.auditLog.create({
      data: {
        actor_nip: params.actor_nip || null,
        actor_name: params.actor_name || null,
        actor_role: params.actor_role || null,

        action: params.action,
        entity: params.entity,
        entity_id: params.entity_id || null,

        description: params.description || null,

        old_value: params.old_value || undefined,
        new_value: params.new_value || undefined,
      },
    });
  }

  async getLogs() {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: {
        created_at: "desc",
      },
      take: 200,
    });

    return {
      message: "Audit log berhasil diambil",
      data: logs,
    };
  }
}