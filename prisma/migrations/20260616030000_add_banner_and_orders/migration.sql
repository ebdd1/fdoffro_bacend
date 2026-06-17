-- AlterTable
ALTER TABLE "User" ADD COLUMN     "banner_url" TEXT;
-- CreateTable
CREATE TABLE "RentalOrder" (
    "id" TEXT NOT NULL,
    "seekerId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "durationMonths" INTEGER NOT NULL DEFAULT 1,
    "priceMonthly" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RentalOrder_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "RentalOrder_seekerId_idx" ON "RentalOrder"("seekerId");
-- CreateIndex
CREATE INDEX "RentalOrder_ownerId_idx" ON "RentalOrder"("ownerId");
-- CreateIndex
CREATE INDEX "RentalOrder_roomId_idx" ON "RentalOrder"("roomId");
-- CreateIndex
CREATE INDEX "RentalOrder_status_idx" ON "RentalOrder"("status");
-- AddForeignKey
ALTER TABLE "RentalOrder" ADD CONSTRAINT "RentalOrder_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "RentalOrder" ADD CONSTRAINT "RentalOrder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "RentalOrder" ADD CONSTRAINT "RentalOrder_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "RentalOrder" ADD CONSTRAINT "RentalOrder_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
