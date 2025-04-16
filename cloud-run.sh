#!/bin/bash

# This script configures the server to run properly in Google Cloud Shell or other cloud environments

# Kill any existing node processes running the server
pkill -f "node server.js" || echo "No server running"
pkill -f "next dev" || echo "No Next.js process running"

# Clean up any problematic socket files
rm -f /tmp/vscode-typescript*/*/tscancellation-*.tmp* 2>/dev/null || true

# Set environment variables for deployment
export NODE_ENV=production
export PORT=5000
export SOCKET_SERVER_PORT=5000
export NEXT_PUBLIC_SOCKET_URL="https://$HOSTNAME:$SOCKET_SERVER_PORT"
export URI="mongodb://localhost:27017/Chat"

# Get hostname dynamically - works on most cloud environments
HOSTNAME=$(hostname -f 2>/dev/null || hostname || echo "localhost")
echo "Server hostname: $HOSTNAME"

# Make sure MongoDB is available
echo "Checking MongoDB connection..."
if command -v mongod &> /dev/null; then
    echo "MongoDB found on system."
else
    echo "Warning: MongoDB not found. Please make sure MongoDB is installed or provide a remote MongoDB URI."
    echo "You can set the URI environment variable with your MongoDB connection string."
fi

# Build the Next.js application
echo "Building Next.js application..."
npm run build

# Start the server
echo "Starting server on port $PORT..."
node --max-old-space-size=2048 server.js &
SERVER_PID=$!

echo "Application is running!"
echo "Server URL: http://$HOSTNAME:$PORT/"
echo ""
echo "To stop the application, press Ctrl+C"

# Handle termination gracefully
trap "kill $SERVER_PID; exit" INT TERM
wait 