import {
  Customer,
  CustomerStatus,
  Prisma,
  PrismaClient,
} from "@tz/database";
import { normalizeTanzanianPhone } from "@tz/shared";

// =====================================================
// Customer Service
// =====================================================

export class CustomerService {
  constructor(private prisma: PrismaClient) {}

  private normalize(phone: string): string {
    const normalized = normalizeTanzanianPhone(phone);
    if (!normalized) throw new Error("Invalid Tanzanian phone number");
    return normalized;
  }

  async findOrCreate(opts: {
    phoneNumber: string;
    organizationId: string;
    siteId?: string | null;
    fullName?: string | null;
    email?: string | null;
  }): Promise<Customer> {
    const normalized = this.normalize(opts.phoneNumber);
    const existing = await this.prisma.customer.findFirst({
      where: { organizationId: opts.organizationId, phoneNormalized: normalized },
    });
    if (existing) return existing;

    return this.prisma.customer.create({
      data: {
        organizationId: opts.organizationId,
        siteId: opts.siteId ?? null,
        phoneNumber: opts.phoneNumber,
        phoneNormalized: normalized,
        fullName: opts.fullName ?? null,
        email: opts.email ?? null,
        status: CustomerStatus.ACTIVE,
      },
    });
  }

  async create(opts: {
    fullName?: string | null;
    phoneNumber: string;
    email?: string | null;
    organizationId: string;
    siteId?: string | null;
    actor: string; // for audit consistency
  }): Promise<Customer> {
    return this.findOrCreate(opts);
  }

  async update(id: string, data: {
    fullName?: string | null;
    phoneNumber?: string;
    email?: string | null;
    status?: CustomerStatus;
    siteId?: string | null;
  }): Promise<Customer> {
    const normalized =
      data.phoneNumber !== undefined ? this.normalize(data.phoneNumber) : undefined;

    return this.prisma.customer.update({
      where: { id },
      data: {
        fullName: data.fullName !== undefined ? data.fullName : undefined,
        phoneNormalized: normalized,
        phoneNumber: data.phoneNumber,
        email: data.email !== undefined ? data.email : undefined,
        status: data.status,
        siteId: data.siteId !== undefined ? data.siteId : undefined,
      },
    });
  }

  async block(id: string): Promise<Customer> {
    return this.prisma.customer.update({
      where: { id },
      data: { status: CustomerStatus.BLOCKED },
    });
  }

  async suspend(id: string): Promise<Customer> {
    return this.prisma.customer.update({
      where: { id },
      data: { status: CustomerStatus.SUSPENDED },
    });
  }

  async unblock(id: string): Promise<Customer> {
    return this.prisma.customer.update({
      where: { id },
      data: { status: CustomerStatus.ACTIVE },
    });
  }

  async get(id: string, include?: Prisma.CustomerInclude) {
    return this.prisma.customer.findUnique({ where: { id }, include });
  }

  async list(params: {
    page?: number;
    limit?: number;
    status?: CustomerStatus;
    search?: string;
    organizationId?: string;
    siteId?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const where: Prisma.CustomerWhereInput = {};
    if (params.organizationId) where.organizationId = params.organizationId;
    if (params.status) where.status = params.status;
    if (params.siteId) where.siteId = params.siteId;
    if (params.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: "insensitive" } },
        { phoneNumber: { contains: params.search, mode: "insensitive" } },
        { phoneNormalized: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { site: true, _count: { select: { vouchers: true, payments: true } } },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items, total, page, limit };
  }
}
