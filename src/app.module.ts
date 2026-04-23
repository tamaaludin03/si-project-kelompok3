import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaService } from './prisma.service';

import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';

import { EmployeesModule } from './modules/employees/employees.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { LeaveRequestsModule } from './modules/leave-requests/leave-requests.module';
import { PermissionRequestsModule } from './modules/permission-requests/permission-requests.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    EmployeesModule,
    DashboardModule,
    LeaveRequestsModule,
    PermissionRequestsModule,
    NotificationsModule,
  ],
  controllers: [AppController, AuthController],
  providers: [PrismaService, AuthService],
})
export class AppModule {}