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
exports.NotificationsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
let NotificationsGateway = class NotificationsGateway {
    constructor() {
        this.connectedUsers = new Map();
    }
    handleConnection(client) {
        console.log('Client connected:', client.id);
    }
    handleDisconnect(client) {
        for (const [nip, clients] of this.connectedUsers.entries()) {
            const index = clients.indexOf(client);
            if (index > -1) {
                clients.splice(index, 1);
                if (clients.length === 0) {
                    this.connectedUsers.delete(nip);
                }
            }
        }
        console.log('Client disconnected:', client.id);
    }
    handleJoin(data, client) {
        const { nip } = data;
        if (!this.connectedUsers.has(nip)) {
            this.connectedUsers.set(nip, []);
        }
        this.connectedUsers.get(nip).push(client);
        client.emit('joined', { nip, message: 'Berhasil terhubung ke notifikasi' });
    }
    handleLeave(data, client) {
        const { nip } = data;
        const clients = this.connectedUsers.get(nip);
        if (clients) {
            const index = clients.indexOf(client);
            if (index > -1) {
                clients.splice(index, 1);
            }
            if (clients.length === 0) {
                this.connectedUsers.delete(nip);
            }
        }
    }
    notifyUser(nip, event, data) {
        const clients = this.connectedUsers.get(nip);
        if (clients) {
            clients.forEach((client) => {
                if (client.connected) {
                    client.emit(event, data);
                }
            });
        }
    }
};
exports.NotificationsGateway = NotificationsGateway;
__decorate([
    (0, websockets_1.SubscribeMessage)('join'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], NotificationsGateway.prototype, "handleJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], NotificationsGateway.prototype, "handleLeave", null);
exports.NotificationsGateway = NotificationsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    })
], NotificationsGateway);
//# sourceMappingURL=notifications.gateway.js.map