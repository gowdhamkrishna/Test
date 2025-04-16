/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Allow cross-origin requests from cloud shell or localhost
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
          },
        ],
      },
    ];
  },
  // Allow dev origins for cloud shell environments
  experimental: {
    allowedDevOrigins: ['*', 'https://*.cs-*.cloudshell.dev', 'https://*.cloudshell.dev'],
  },
};

export default nextConfig;
