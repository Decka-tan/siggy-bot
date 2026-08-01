/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ships a self-contained server with only the traced deps, so the runtime
  // image does not carry a full node_modules. Needed to keep this thing small
  // enough to be comfortable on a 2GB VPS.
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
