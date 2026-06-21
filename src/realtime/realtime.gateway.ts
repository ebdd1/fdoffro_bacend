import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

/**
 * Realtime gateway with JWT-authenticated handshake [F-014].
 * Clients must provide a valid Bearer token in the auth handshake.
 * User identity is extracted server-side — not trusted from client emit.
 *
 * Redis adapter enabled for horizontal scaling across multiple instances.
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
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Presence: userId → set of connected socketIds (handles multi-tab) [presence]
  private onlineUsers = new Map<string, Set<string>>();

  // Typing: key = `${userId}:${conversationId}` → timeout ID [typing]
  private typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly TYPING_TIMEOUT_MS = 5000; // 5 seconds — auto-clear typing indicator

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Initialize Redis adapter for multi-instance Socket.IO synchronization.
   * REDIS_URL from env — if not set, fall back to in-memory (single instance).
   */
  async afterInit(server: Server) {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      try {
        const pubClient = createClient({ url: redisUrl });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);

        server.adapter(createAdapter(pubClient, subClient));
        console.log('[Socket.IO] Redis adapter initialized for horizontal scaling');
      } catch (error) {
        console.error('[Socket.IO] Redis adapter failed to initialize:', error);
        console.warn('[Socket.IO] Falling back to in-memory adapter (single instance only)');
      }
    } else {
      console.warn('[Socket.IO] REDIS_URL not set — using in-memory adapter (single instance only)');
    }
  }

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

      // Track presence — broadcast online when this is the user's first socket [presence]
      const userId = payload.sub;
      const sockets = this.onlineUsers.get(userId) ?? new Set<string>();
      const wasOffline = sockets.size === 0;
      sockets.add(client.id);
      this.onlineUsers.set(userId, sockets);

      // Auto-join user's personal room for targeted events
      client.join(userId);
      if (payload.role === 'admin') client.join('admins');

      if (wasOffline) {
        // Broadcast to all connected clients (they filter on frontend)
        this.server.emit('presence:update', { userId, online: true });
      }
    } catch (err) {
      console.warn(`[Socket] Invalid token — disconnecting client ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = (client as any).user;
    console.log(`[Socket] Disconnected: ${user?.id ?? 'unknown'} (${client.id})`);

    // Track presence — broadcast offline when the user's last socket disconnects [presence]
    const userId = user?.id;
    if (userId) {
      const sockets = this.onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.onlineUsers.delete(userId);
          this.server.emit('presence:update', { userId, online: false });
        }
      }
    }
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
   *
   * Server-side timeout: if client fails to emit isTyping:false, auto-clear after 5s [typing]
   */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; toUserId: string; isTyping: boolean },
  ) {
    const fromUser = (client as any).user;
    if (!fromUser) return { ok: false, error: 'Not authenticated' };

    if (data?.toUserId) {
      const timeoutKey = `${fromUser.id}:${data.conversationId}`;

      // Clear existing timeout for this user+conversation [typing]
      const existingTimeout = this.typingTimeouts.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.typingTimeouts.delete(timeoutKey);
      }

      // If typing:true, set server-side timeout to auto-clear after 5s [typing]
      if (data.isTyping) {
        const timeout = setTimeout(() => {
          this.typingTimeouts.delete(timeoutKey);
          // Auto-send isTyping:false to recipient
          this.server.to(data.toUserId).emit('chat:typing', {
            conversationId: data.conversationId,
            fromUserId: fromUser.id,
            fromName: fromUser.name ?? fromUser.email,
            isTyping: false,
          });
        }, this.TYPING_TIMEOUT_MS);
        this.typingTimeouts.set(timeoutKey, timeout);
      }

      // Relay typing state to recipient
      this.server.to(data.toUserId).emit('chat:typing', {
        conversationId: data.conversationId,
        fromUserId: fromUser.id,
        fromName: fromUser.name ?? fromUser.email,
        isTyping: data.isTyping,
      });
    }
    return { ok: true };
  }

  /**
   * Return list of currently online userIds for initial presence state [presence]
   */
  @SubscribeMessage('presence:check')
  handlePresenceCheck() {
    return { onlineUserIds: Array.from(this.onlineUsers.keys()) };
  }

  /**
   * Mark message as read and broadcast to sender
   */
  @SubscribeMessage('message:read')
  handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    const user = (client as any).user;
    if (!user) return { ok: false, error: 'Not authenticated' };

    // Broadcast read receipt to conversation participants
    // Backend should update DB and emit this event after persist
    this.server.to(data.conversationId).emit('message:read:ack', {
      messageId: data.messageId,
      readBy: user.id,
      readAt: new Date().toISOString(),
    });

    return { ok: true };
  }
}
