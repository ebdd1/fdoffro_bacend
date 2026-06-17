import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * Realtime gateway. Clients emit `join` with their userId (and role) after
 * connecting; the server places each socket in a room named by userId, and
 * admins additionally join the shared `admins` room. Services emit updates to
 * these rooms via RealtimeService.
 */
@WebSocketGateway({ cors: { origin: true } })
export class RealtimeGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() data: { userId?: string; role?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data?.userId) {
      client.join(data.userId);
    }
    if (data?.role === 'admin') {
      client.join('admins');
    }
    return { ok: true };
  }

  // Relay typing state to the other participant of a conversation. The client
  // sends the recipient's userId; we forward only to that room (not global).
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody()
    data: { conversationId: string; toUserId: string; fromUserId: string; fromName: string; isTyping: boolean },
  ) {
    if (data?.toUserId) {
      this.server.to(data.toUserId).emit('chat:typing', {
        conversationId: data.conversationId,
        fromUserId: data.fromUserId,
        fromName: data.fromName,
        isTyping: data.isTyping,
      });
    }
    return { ok: true };
  }
}
