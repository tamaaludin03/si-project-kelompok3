"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionRequestsController = void 0;
const common_1 = require("@nestjs/common");
const permission_requests_service_1 = require("./permission-requests.service");
const create_permission_request_dto_1 = require("./dto/create-permission-request.dto");
let PermissionRequestsController = class PermissionRequestsController {
    constructor(permissionRequestsService) {
        this.permissionRequestsService = permissionRequestsService;
    }
    create(dto) {
        return this.permissionRequestsService.create(dto);
    }
    findMine(nip) {
        return this.permissionRequestsService.findMine(nip);
    }
};
exports.PermissionRequestsController = PermissionRequestsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_permission_request_dto_1.CreatePermissionRequestDto]),
    __metadata("design:returntype", void 0)
], PermissionRequestsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('mine/:nip'),
    __param(0, (0, common_1.Param)('nip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PermissionRequestsController.prototype, "findMine", null);
exports.PermissionRequestsController = PermissionRequestsController = __decorate([
    (0, common_1.Controller)('permissions'),
    __metadata("design:paramtypes", [permission_requests_service_1.PermissionRequestsService])
], PermissionRequestsController);
//# sourceMappingURL=permission-requests.controller.js.map