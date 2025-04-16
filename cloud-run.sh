#!/bin/bash

# This script configures the server to run properly in Google Cloud Shell

# Kill any existing node processes running the server
pkill -f "node server.js" || echo "No server running"
pkill -f "next dev" || echo "No Next.js process running"

# Clean up any problematic socket files
rm -f /tmp/vscode-typescript*/*/tscancellation-*.tmp* 2>/dev/null || true

# Set environment variables for Cloud Shell
export NODE_ENV=production
export CLOUD_SHELL=true
export CLOUD_SHELL_PORT=3001
export SOCKET_SERVER_PORT=5001

# Get Cloud Shell hostname
HOSTNAME=$(gcloud cloud-shell get-hostname 2>/dev/null || echo "unknown")
echo "Cloud Shell hostname: $HOSTNAME"

# Start the Socket.IO server on port 5001
echo "Starting Socket.IO server on port 5001..."
node --max-old-space-size=2048 --port=$SOCKET_SERVER_PORT server.js &
SERVER_PID=$!

# Wait for server to initialize
sleep 2

# Run Next.js client with port 3001
echo "Starting Next.js client on port 3001..."
npx next dev -p 3001 &
CLIENT_PID=$!

# Wait for client to initialize
sleep 3

echo "Application is running!"
echo "Frontend URL: https://3001-$HOSTNAME.cloudshell.dev/"
echo "Backend URL: https://5001-$HOSTNAME.cloudshell.dev/"
echo ""
echo "To stop the application, press Ctrl+C"

# Handle termination gracefully
trap "kill $SERVER_PID $CLIENT_PID; exit" INT TERM
wait 