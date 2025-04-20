import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app for the proxy
const app = express();

// Enable CORS
app.use(cors());

// Configuration for development in Google Cloud Shell
const CLOUD_SHELL_HOST = process.env.CLOUD_SHELL_HOST || 'localhost';
const CLIENT_PORT = 3000;
const SERVER_PORT = 5000;

// Add health check endpoint
app.get('/health', (req, res) => {
  res.send('Proxy server is healthy');
});

// Proxy requests for API/server endpoints to the backend server
app.use('/api', createProxyMiddleware({
  target: `http://localhost:${SERVER_PORT}`,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // remove /api prefix when forwarding to the server
  },
  onProxyReq: (proxyReq, req, res) => {
    // Log proxied requests
    console.log(`[PROXY] ${req.method} ${req.url} -> ${SERVER_PORT}`);
  },
}));

// Proxy WebSocket connections for Socket.IO
app.use('/socket.io', createProxyMiddleware({
  target: `http://localhost:${SERVER_PORT}`,
  changeOrigin: true,
  ws: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] WebSocket ${req.url} -> ${SERVER_PORT}`);
  },
}));

// Proxy uploads endpoint
app.use('/uploads', createProxyMiddleware({
  target: `http://localhost:${SERVER_PORT}`,
  changeOrigin: true,
}));

// Forward all other requests to the Next.js client
app.use('/', createProxyMiddleware({
  target: `http://localhost:${CLIENT_PORT}`,
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    // Log proxied requests
    console.log(`[PROXY] ${req.method} ${req.url} -> ${CLIENT_PORT}`);
  },
}));

// Start the proxy server
const PORT = process.env.PORT || 8080;
http.createServer(app).listen(PORT, () => {
  console.log(`
====================================================
🚀 Proxy server running on port ${PORT}
----------------------------------------------------
Client running on: http://localhost:${CLIENT_PORT}
Server running on: http://localhost:${SERVER_PORT}
Proxy available at: http://localhost:${PORT}
If running in Google Cloud Shell, access via the Web Preview URL
====================================================
`);
}); 