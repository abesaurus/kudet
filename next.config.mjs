/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://api.hybridcash.site/api/:path*',
      },
    ];
  },
};

export default nextConfig;
