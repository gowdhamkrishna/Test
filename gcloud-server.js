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

// Enable CORS
app.use(cors());

// Configuration for Cloud Shell
const CLIENT_PORT = 3000;
const SERVER_PORT = 5000;
const PORT = process.env.PORT || 8080;

// Add logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Proxy WebSocket connections for Socket.IO
app.use('/socket.io', createProxyMiddleware({
  target: `http://localhost:${SERVER_PORT}`,
  changeOrigin: true,
  ws: true,
}));

// Proxy API requests to the server
app.use('/api', createProxyMiddleware({
  target: `http://localhost:${SERVER_PORT}`,
  changeOrigin: true,
}));

// Proxy uploads endpoint
app.use('/uploads', createProxyMiddleware({
  target: `http://localhost:${SERVER_PORT}`,
  changeOrigin: true,
}));

// Proxy all other requests to the Next.js client
app.use('/', createProxyMiddleware({
  target: `http://localhost:${CLIENT_PORT}`,
  changeOrigin: true,
}));

// Create HTTP server
const server = http.createServer(app);

// Start the server
server.listen(PORT, () => {
  console.log(`
===========================================================
🚀 Google Cloud Shell proxy running on port ${PORT}
-----------------------------------------------------------
Client (Next.js): Running on port ${CLIENT_PORT}
Server (Express/Socket.IO): Running on port ${SERVER_PORT}
Proxy: Running on port ${PORT}

➡️ Access your app via Web Preview on port ${PORT}
===========================================================
  `);
}); 