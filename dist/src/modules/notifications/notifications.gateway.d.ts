import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket } from 'socket.io';
export declare class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private connectedUsers;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoin(data: {
        nip: string;
    }, client: Socket): void;
    handleLeave(data: {
        nip: string;
    }, client: Socket): void;
    notifyUser(nip: string, event: string, data: any): void;
}
