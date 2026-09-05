-- AlterEnum
-- Additive: VERIFIED, INVALID, UNVERIFIABLE remain valid.
-- New values distinguish WHY a callback was rejected (attack detection/audit).
ALTER TYPE "PaymentWebhookVerificationResult" ADD VALUE IF NOT EXISTS 'FORGED';
ALTER TYPE "PaymentWebhookVerificationResult" ADD VALUE IF NOT EXISTS 'MALFORMED';
ALTER TYPE "PaymentWebhookVerificationResult" ADD VALUE IF NOT EXISTS 'SCHEMA_INVALID';
ALTER TYPE "PaymentWebhookVerificationResult" ADD VALUE IF NOT EXISTS 'UNVERIFIED';