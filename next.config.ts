import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.111", "192.168.111.110", "localhost"],
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
