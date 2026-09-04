/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@tz/database",
    "@tz/shared",
    "@tz/payments",
    "@tz/notifications",
    "@tz/mikrotik",
    "@tz/monitoring",
    "@tz/services",
    "@tz/infra",
  ],
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

module.exports = nextConfig;
