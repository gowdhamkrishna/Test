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

# Get hostname from environment or default
HOSTNAME=$(echo $HOSTNAME | grep -o '[^.]*' | head -n1 || echo "localhost")
CLOUDSHELL_HOST=$(echo $DEVSHELL_WEB_HOST | sed 's/.*\.\(.*\)/\1/')
echo "Cloud Shell host: $CLOUDSHELL_HOST"

# Start the Socket.IO server on port 5001
echo "Starting Socket.IO server on port 5001..."
node --max-old-space-size=2048 server.js &
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
# Use the Cloud Shell web preview URL format
echo "Frontend URL: https://3001-$HOSTNAME.$CLOUDSHELL_HOST/"
echo "Backend URL: https://5001-$HOSTNAME.$CLOUDSHELL_HOST/"
echo ""
echo "To stop the application, press Ctrl+C"

# Handle termination gracefully
trap "kill $SERVER_PID $CLIENT_PID; exit" INT TERM
wait 