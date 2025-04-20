import express from 'express';
import http from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app for the proxy
const app = express();

// Enable CORS with specific options for cross-domain requests
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Configuration for Cloud Shell
const CLIENT_PORT = 3000;
const SERVER_PORT = 5000;
const PORT = process.env.PORT || 8080;

// Add logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} (${req.headers['user-agent'] || 'unknown agent'})`);
  next();
});

// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: 'cs-external'
  });
});

// Add explicit CORS preflight handling for all routes
app.options('*', cors());

// Proxy WebSocket connections for Socket.IO with proper WebSocket support
app.use('/socket.io', createProxyMiddleware({
  target: `http://localhost:${SERVER_PORT}`,
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/socket.io': '/socket.io' },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY WS] ${req.method} ${req.url} -> ${SERVER_PORT}`);
  },
  onError: (err, req, res) => {
    console.error('WebSocket proxy error:', err);
  }
}));

// Proxy API requests to the server
app.use('/api', createProxyMiddleware({
  target: `http://localhost:${SERVER_PORT}`,
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY API] ${req.method} ${req.url} -> ${SERVER_PORT}`);
  }
}));

// Proxy uploads endpoint
app.use('/uploads', createProxyMiddleware({
  target: `http://localhost:${SERVER_PORT}`,
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY UPLOADS] ${req.method} ${req.url} -> ${SERVER_PORT}`);
  }
}));

// Proxy all other requests to the Next.js client
app.use('/', createProxyMiddleware({
  target: `http://localhost:${CLIENT_PORT}`,
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY CLIENT] ${req.method} ${req.url} -> ${CLIENT_PORT}`);
  }
}));

// Create HTTP server with increased timeout
const server = http.createServer({
  requestTimeout: 120000,  // 2 minute timeout for long polling
}, app);

// Add specific error handling for the server
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Start the server
server.listen(PORT, () => {
  console.log(`
===========================================================
🚀 Proxy server running on port ${PORT}
-----------------------------------------------------------
Client (Next.js): Running on port ${CLIENT_PORT}
Server (Express/Socket.IO): Running on port ${SERVER_PORT}
Proxy: Running on port ${PORT}

➡️ Access your app via: http://localhost:${PORT}
   For external access, use your assigned domain/port
===========================================================
  `);
}); 