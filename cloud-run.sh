#!/bin/bash

# This script configures the server to run properly in Google Cloud Shell

# Kill any existing node processes running the server
pkill -f "node server.js" || echo "No server running"

# Clean up any problematic socket files
rm -f /tmp/vscode-typescript*/*/tscancellation-*.tmp* 2>/dev/null || true

# Set environment variables for Cloud Shell
export NODE_ENV=production
export CLOUD_SHELL=true

# Run Next.js client with the correct port (3001 for Cloud Shell)
echo "Starting Next.js client on port 3001..."
npx next dev -p 3001 &

# Wait a moment for the client to start
sleep 3

# Start the server with proper memory settings
echo "Starting Socket.IO server on port 5000..."
node --max-old-space-size=2048 server.js &

# Wait for everything to be ready
sleep 2
echo "Application is running!"
echo "Frontend URL: https://3001-$(gcloud cloud-shell get-hostname).cloudshell.dev/"
echo "Backend URL: https://5000-$(gcloud cloud-shell get-hostname).cloudshell.dev/" 