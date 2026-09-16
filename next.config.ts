import type { NextConfig } from "next";

const solrProxyUpstream = process.env.SOLR_PROXY_UPSTREAM?.trim().replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  // Internal Solr hosts omit CORS headers, while the app fetches Solr in the browser.
  async rewrites() {
    if (!solrProxyUpstream) return [];
    return [{ source: "/solr/:path*", destination: `${solrProxyUpstream}/:path*` }];
  },
};

export default nextConfig;
