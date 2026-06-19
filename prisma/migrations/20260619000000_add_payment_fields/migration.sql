-- AlterTable User: add bank account fields for transfer payment
ALTER TABLE "User" ADD COLUMN "bankName"          TEXT;
ALTER TABLE "User" ADD COLUMN "bankAccountNumber" TEXT;
ALTER TABLE "User" ADD COLUMN "bankAccountHolder" TEXT;

-- AlterTable RentalOrder: add payment method and proof
ALTER TABLE "RentalOrder" ADD COLUMN "paymentMethod"   TEXT;
ALTER TABLE "RentalOrder" ADD COLUMN "paymentProofUrl" TEXT;
