import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow Google profile photos
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
