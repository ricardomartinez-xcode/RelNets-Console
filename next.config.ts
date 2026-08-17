import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/', destination: '/console/', permanent: false },
      { source: '/app', destination: '/console/', permanent: true }
    ];
  }
};
export default nextConfig;
