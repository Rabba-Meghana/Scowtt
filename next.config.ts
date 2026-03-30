import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "*.googleusercontent.com",   pathname: "/**" },
      { protocol: "https", hostname: "image.tmdb.org",            pathname: "/**" },
    ],
  },
};

export default nextConfig;
