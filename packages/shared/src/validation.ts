import { z } from "zod";

// =====================================================
// Validation schemas
// =====================================================

// Tanzanian phone number normalization (07XXXXXXXX, +255, etc.)
export const phoneSchema = z
  .string()
  .regex(
    /^(\+?255|0)?[67]\d{8}$/,
    "Phone must be a valid Tanzanian number (e.g. 0712345678)"
  );

// --- Auth ---
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

// --- Customer ---
export const createCustomerSchema = z.object({
  fullName: z.string().min(1).optional(),
  phoneNumber: phoneSchema,
  email: z.string().email().optional().or(z.literal("")),
  siteId: z.string().optional(),
});

export const updateCustomerSchema = z.object({
  fullName: z.string().min(1).optional(),
  phoneNumber: phoneSchema.optional(),
  email: z.string().email().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "BLOCKED", "SUSPENDED"]).optional(),
  siteId: z.string().optional().nullable(),
});

// --- Package ---
export const createPackageSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  currency: z.string().default("TZS"),
  durationSeconds: z.number().int().positive(),
  downloadMbps: z.number().positive().optional(),
  uploadMbps: z.number().positive().optional(),
  dataLimitBytes: z.bigint().positive().optional(),
  deviceLimit: z.number().int().positive().default(1),
  siteId: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

export const updatePackageSchema = createPackageSchema.partial();

// --- Voucher ---
export const generateVoucherSchema = z.object({
  packageId: z.string().min(1),
  siteId: z.string().optional(),
  quantity: z.number().int().positive().max(1000).default(1),
  customerId: z.string().optional(),
});

export const voucherSaleSchema = z.object({
  voucherId: z.string().min(1),
  customerId: z.string().optional(),
  paymentMethod: z.enum(["MPESA", "AIRTEL_MONEY", "MIXX_BY_YAS", "HALOPESA", "CASH"]),
});

export const disableVoucherSchema = z.object({
  reason: z.string().optional(),
});

// --- Payment ---
export const initiatePaymentSchema = z.object({
  packageId: z.string().min(1),
  phoneNumber: phoneSchema,
  paymentMethod: z.enum(["MPESA", "AIRTEL_MONEY", "MIXX_BY_YAS", "HALOPESA"]),
  siteId: z.string().optional(),
});

// --- Query / Pagination ---
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const voucherQuerySchema = paginationSchema.extend({
  status: z
    .enum(["GENERATED", "AVAILABLE", "RESERVED", "SOLD", "ACTIVE", "EXPIRED", "USED", "DISABLED", "CANCELLED"])
    .optional(),
  siteId: z.string().optional(),
  packageId: z.string().optional(),
  customerId: z.string().optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const reportQuerySchema = paginationSchema.extend({
  from: z.string().optional(),
  to: z.string().optional(),
  siteId: z.string().optional(),
  packageId: z.string().optional(),
  agentId: z.string().optional(),
  paymentMethod: z
    .enum(["MPESA", "AIRTEL_MONEY", "MIXX_BY_YAS", "HALOPESA", "CASH"])
    .optional(),
  status: z.string().optional(),
});
