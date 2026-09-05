-- CreateEnum
CREATE TYPE "PaymentFulfilmentStatus" AS ENUM ('NONE', 'LOCKED', 'ISSUING', 'DONE');

-- CreateEnum
CREATE TYPE "PaymentWebhookVerificationResult" AS ENUM ('VERIFIED', 'INVALID', 'UNVERIFIABLE');

-- CreateEnum
CREATE TYPE "PaymentWebhookProcessingState" AS ENUM ('RECEIVED', 'PROCESSED', 'REJECTED', 'ERROR');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "fulfilmentStatus" "PaymentFulfilmentStatus" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentMethod" NOT NULL,
    "providerTransactionId" TEXT,
    "eventId" TEXT,
    "paymentId" TEXT,
    "claimedStatus" "PaymentStatus",
    "claimedAmount" DOUBLE PRECISION,
    "claimedCurrency" TEXT,
    "payload" JSONB NOT NULL,
    "verificationResult" "PaymentWebhookVerificationResult" NOT NULL,
    "processingState" "PaymentWebhookProcessingState" NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_paymentId_idx" ON "PaymentWebhookEvent"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_provider_processingState_idx" ON "PaymentWebhookEvent"("provider", "processingState");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_receivedAt_idx" ON "PaymentWebhookEvent"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_providerTransactionId_eventId_key" ON "PaymentWebhookEvent"("provider", "providerTransactionId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_paymentId_key" ON "Voucher"("paymentId");

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
