import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

/**
 * Thin emitter used by feature services (orders, conversations) to push
 * realtime events to the relevant users + admins without depending on the
 * gateway's socket internals.
 */
@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emitOrderUpdate(order: { seekerId: string; ownerId: string; [k: string]: any }) {
    this.gateway.server
      ?.to([order.seekerId, order.ownerId, 'admins'])
      .emit('order:update', order);
  }

  emitMessage(payload: { conversationId: string; seekerId: string; ownerId: string; [k: string]: any }) {
    this.gateway.server
      ?.to([payload.seekerId, payload.ownerId, 'admins'])
      .emit('message:new', payload);
  }

  emitTyping(payload: { conversationId: string; toUserId: string; fromId: string; fromName: string; isTyping: boolean }) {
    this.gateway.server?.to(payload.toUserId).emit('chat:typing', {
      conversationId: payload.conversationId,
      fromUserId: payload.fromId,
      fromName: payload.fromName,
      isTyping: payload.isTyping,
    });
  }

  // Push a freshly created notification to its recipient.
  emitNotification(userId: string, notification: { [k: string]: any }) {
    this.gateway.server?.to(userId).emit('notification:new', notification);
  }
}
