import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuditLogModule } from "./modules/audit-log/audit-log.module";
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CutiModule } from './modules/cuti/cuti.module';
import { IzinModule } from './modules/permission-requests/izin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { VerifikasiModule } from "./modules/verifikasi/verifikasi.module";

@Module({
  imports: [
    AuthModule,
    EmployeesModule,
    DashboardModule,
    CutiModule,
    IzinModule,
    NotificationsModule,
    AuditLogModule,
    VerifikasiModule,
  ],
  controllers: [AppController],
})
export class AppModule {}