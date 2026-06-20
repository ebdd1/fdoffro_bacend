-- AlterTable
ALTER TABLE "Message" ADD COLUMN "readAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Message_conversationId_readAt_idx" ON "Message"("conversationId", "readAt");
