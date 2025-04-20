/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable custom URL handling
  experimental: {
    allowedRevalidateHeaderKeys: ['x-prerender-revalidate'],
    esmExternals: 'loose'
  },
  
  // Add CORS headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization,X-Requested-With' },
        ],
      },
    ];
  },
  
  // Configure rewrites to use appropriate URLs
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: '/socket.io/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: '/uploads/:path*',
      },
    ];
  },
  // Ensure Next.js properly handles WebSocket connections
  webSocketServerFactory: (handler) => {
    // Return the handler as-is to let the proxy handle WebSockets
    return handler;
  },
};

export default nextConfig;
