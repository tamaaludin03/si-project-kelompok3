import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private connectedUsers: Map<string, Socket[]> = new Map();

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
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

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() data: { nip: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { nip } = data;

    if (!this.connectedUsers.has(nip)) {
      this.connectedUsers.set(nip, []);
    }

    this.connectedUsers.get(nip)!.push(client);
    client.emit('joined', { nip, message: 'Berhasil terhubung ke notifikasi' });
  }

  @SubscribeMessage('leave')
  handleLeave(
    @MessageBody() data: { nip: string },
    @ConnectedSocket() client: Socket,
  ) {
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

  notifyUser(nip: string, event: string, data: any) {
    const clients = this.connectedUsers.get(nip);

    if (clients) {
      clients.forEach((client) => {
        if (client.connected) {
          client.emit(event, data);
        }
      });
    }
  }
}