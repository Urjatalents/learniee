import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  outputFileTracingIncludes: {
    "/api/**/*": ["./certs/rds-global-bundle.pem"],
    // Public pages that read the DB (blog, home latest-posts, sitemap).
    "/": ["./certs/rds-global-bundle.pem"],
    "/blog/**/*": ["./certs/rds-global-bundle.pem"],
    "/sitemap.xml": ["./certs/rds-global-bundle.pem"],
  },
};

export default nextConfig;