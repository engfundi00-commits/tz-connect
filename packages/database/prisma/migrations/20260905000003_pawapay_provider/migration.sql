-- AlterEnum
-- Additive: PAWA_PAY is the PawaPay aggregator adapter (sandbox this stage).
-- Existing values remain valid; added per PawaPay sandbox integration (CRIT-3).
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'PAWA_PAY';