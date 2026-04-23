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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveRequestsController = void 0;
const common_1 = require("@nestjs/common");
const leave_requests_service_1 = require("./leave-requests.service");
const create_leave_request_dto_1 = require("./dto/create-leave-request.dto");
let LeaveRequestsController = class LeaveRequestsController {
    constructor(leaveRequestsService) {
        this.leaveRequestsService = leaveRequestsService;
    }
    async create(body) {
        return this.leaveRequestsService.create(body);
    }
    async findMine(nip) {
        return this.leaveRequestsService.findMine(nip);
    }
};
exports.LeaveRequestsController = LeaveRequestsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_a = typeof create_leave_request_dto_1.CreateLeaveRequestDto !== "undefined" && create_leave_request_dto_1.CreateLeaveRequestDto) === "function" ? _a : Object]),
    __metadata("design:returntype", Promise)
], LeaveRequestsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('me/:nip'),
    __param(0, (0, common_1.Param)('nip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeaveRequestsController.prototype, "findMine", null);
exports.LeaveRequestsController = LeaveRequestsController = __decorate([
    (0, common_1.Controller)('leave-requests'),
    __metadata("design:paramtypes", [leave_requests_service_1.LeaveRequestsService])
], LeaveRequestsController);
//# sourceMappingURL=leave-requests.controller.js.map