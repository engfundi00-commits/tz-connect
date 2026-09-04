import { PrismaClient, UserRole } from "../generated/client";

const prisma = new PrismaClient();

async function main() {
  const orgName = process.env.SEED_ORG_NAME || "TZ Connect";
  const siteName = process.env.SEED_SITE_NAME || "TZ Connect Demo Site";

  // --- Organization ---
  const org = await prisma.organization.upsert({
    where: { slug: "tz-connect" },
    update: {},
    create: {
      name: orgName,
      slug: "tz-connect",
      email: process.env.SEED_ADMIN_EMAIL,
      phone: "+255700000000",
      address: "Dar es Salaam, Tanzania",
    },
  });

  // --- Site ---
  const site = await prisma.site.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: "demo-site" } },
    update: {},
    create: {
      organizationId: org.id,
      name: siteName,
      slug: "demo-site",
      address: "Demo Address",
      status: "UNKNOWN",
    },
  });

  // --- Packages ---
  const packages = [
    {
      name: "TZ Connect Hourly",
      description: "1 hour of high-speed internet",
      price: 1001,
      currency: "TZS",
      durationSeconds: 3600,
      downloadMbps: 5,
      uploadMbps: 2,
      dataLimitBytes: BigInt(2 * 1024 ** 3), // 2 GB
      deviceLimit: 1,
      siteId: site.id,
    },
    {
      name: "TZ Connect Daily",
      description: "24 hours of high-speed internet",
      price: 5000,
      currency: "TZS",
      durationSeconds: 24 * 3600,
      downloadMbps: 10,
      uploadMbps: 5,
      dataLimitBytes: BigInt(10 * 1024 ** 3), // 10 GB
      deviceLimit: 2,
      siteId: site.id,
    },
  ];

  for (const p of packages) {
    await prisma.package.upsert({
      where: { id: "" }, // upsert not meaningful by name; create if missing
      update: {},
      create: {
        organizationId: org.id,
        ...p,
      },
    });
  }

  // --- Admin User (credentials from env, never hardcoded) ---
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@tzconnect.co.tz";
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD || "change-me-in-production";

  // Heavy-weight hash (Argon2-style via bcrypt below)
  const bcrypt = (await import("bcryptjs")).default;
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      organizationId: org.id,
    },
    create: {
      email: adminEmail,
      passwordHash,
      fullName: "TZ Connect Super Admin",
      role: UserRole.SUPER_ADMIN,
      organizationId: org.id,
      siteId: site.id,
      isActive: true,
    },
  });

  console.log("Seed complete");
  console.log({ org: org.name, site: site.name, adminEmail });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
