import {
  Package,
  PackageStatus,
  Prisma,
  PrismaClient,
} from "@tz/database";

// =====================================================
// Package Service
// =====================================================

export class PackageService {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    organizationId: string;
    name: string;
    description?: string | null;
    price: number;
    currency?: string;
    durationSeconds: number;
    downloadMbps?: number | null;
    uploadMbps?: number | null;
    dataLimitBytes?: bigint | null;
    deviceLimit?: number;
    siteId?: string | null;
    status?: PackageStatus;
  }): Promise<Package> {
    return this.prisma.package.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        description: data.description ?? null,
        price: data.price,
        currency: data.currency ?? "TZS",
        durationSeconds: data.durationSeconds,
        downloadMbps: data.downloadMbps ?? null,
        uploadMbps: data.uploadMbps ?? null,
        dataLimitBytes: data.dataLimitBytes ?? null,
        deviceLimit: data.deviceLimit ?? 1,
        siteId: data.siteId ?? null,
        status: data.status ?? PackageStatus.ACTIVE,
      },
    });
  }

  async update(id: string, data: Partial<Omit<Parameters<PackageService["create"]>[0], "organizationId">>) {
    return this.prisma.package.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description === undefined ? undefined : data.description ?? null,
        price: data.price,
        currency: data.currency,
        durationSeconds: data.durationSeconds,
        downloadMbps: data.downloadMbps === undefined ? undefined : data.downloadMbps ?? null,
        uploadMbps: data.uploadMbps === undefined ? undefined : data.uploadMbps ?? null,
        dataLimitBytes: data.dataLimitBytes === undefined ? undefined : data.dataLimitBytes ?? null,
        deviceLimit: data.deviceLimit,
        siteId: data.siteId === undefined ? undefined : data.siteId ?? null,
        status: data.status,
      },
    });
  }

  async archive(id: string): Promise<Package> {
    return this.prisma.package.update({
      where: { id },
      data: { status: PackageStatus.ARCHIVED },
    });
  }

  async get(id: string) {
    return this.prisma.package.findUnique({ where: { id } });
  }

  async list(params: {
    page?: number;
    limit?: number;
    status?: PackageStatus;
    organizationId?: string;
    siteId?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const where: Prisma.PackageWhereInput = {};
    if (params.organizationId) where.organizationId = params.organizationId;
    if (params.status) where.status = params.status;
    if (params.siteId) where.siteId = params.siteId;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.package.findMany({ where, orderBy: { createdAt: "asc" }, skip: (page - 1) * limit, take: limit }),
      this.prisma.package.count({ where }),
    ]);
    return { items, total, page, limit };
  }
}
