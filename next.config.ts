import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.34.52.156", "192.168.1.0/24", "192.168.0.0/24", "10.0.0.0/8"],
};

export default nextConfig;
