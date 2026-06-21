-- Migration: add_message_read_delivered_at
-- Add readAt and deliveredAt timestamps to Message model

-- Add readAt column (timestamp when message was read)
ALTER TABLE "Message" ADD COLUMN "readAt" TIMESTAMP;

-- Add deliveredAt column (timestamp when message was delivered)
ALTER TABLE "Message" ADD COLUMN "deliveredAt" TIMESTAMP;

-- Create index for unread messages query
CREATE INDEX "Message_conversationId_readAt_idx" ON "Message"("conversationId", "readAt");
