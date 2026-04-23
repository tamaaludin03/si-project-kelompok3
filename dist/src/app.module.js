"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const prisma_service_1 = require("./prisma.service");
const auth_controller_1 = require("./modules/auth/auth.controller");
const auth_service_1 = require("./modules/auth/auth.service");
const employees_module_1 = require("./modules/employees/employees.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const leave_requests_module_1 = require("./modules/leave-requests/leave-requests.module");
const permission_requests_module_1 = require("./modules/permission-requests/permission-requests.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            employees_module_1.EmployeesModule,
            dashboard_module_1.DashboardModule,
            leave_requests_module_1.LeaveRequestsModule,
            permission_requests_module_1.PermissionRequestsModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [app_controller_1.AppController, auth_controller_1.AuthController],
        providers: [prisma_service_1.PrismaService, auth_service_1.AuthService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map