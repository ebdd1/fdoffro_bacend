import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

/**
 * Realtime gateway with JWT-authenticated handshake [F-014].
 * Clients must provide a valid Bearer token in the auth handshake.
 * User identity is extracted server-side — not trusted from client emit.
 */
@WebSocketGateway({
  cors: {
    origin: [
      'https://kostfindweb.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  // Verify JWT before allowing connection [F-014]
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        console.warn(`[Socket] No token — disconnecting client ${client.id}`);
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      // Attach verified user data to socket for later use
      (client as any).user = { id: payload.sub, email: payload.email, role: payload.role };
      console.log(`[Socket] Connected: user ${payload.sub} (${client.id})`);
    } catch (err) {
      console.warn(`[Socket] Invalid token — disconnecting client ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = (client as any).user;
    console.log(`[Socket] Disconnected: ${user?.id ?? 'unknown'} (${client.id})`);
  }

  private extractToken(client: Socket): string | null {
    // Try Authorization header first
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    // Fallback: token from auth handshake data
    const authData = client.handshake.auth?.token;
    if (authData) return authData;
    return null;
  }

  /** Client joins their own user room — now verified via JWT, not self-reported */
  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket) {
    const user = (client as any).user;
    if (user?.id) {
      client.join(user.id);
      if (user.role === 'admin') client.join('admins');
    }
    return { ok: true };
  }

  /**
   * Relay typing state. fromUserId is extracted from the verified socket user,
   * NOT from the client message body — prevents impersonation [F-014].
   */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; toUserId: string; isTyping: boolean },
  ) {
    const fromUser = (client as any).user;
    if (!fromUser) return { ok: false, error: 'Not authenticated' };

    if (data?.toUserId) {
      this.server.to(data.toUserId).emit('chat:typing', {
        conversationId: data.conversationId,
        fromUserId: fromUser.id,
        fromName: fromUser.name ?? fromUser.email,
        isTyping: data.isTyping,
      });
    }
    return { ok: true };
  }
}
