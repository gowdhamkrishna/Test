/** @type {import('next').NextConfig} */
const nextConfig = {
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
