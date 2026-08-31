/** @type {import('next').NextConfig} */
const nextConfig = {
  // Backend Express runs on :4190 — proxy /api through Next so the
  // browser only ever talks to one origin (no CORS in production).
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:4190/api/:path*',
      },
    ];
  },
};

export default nextConfig;
