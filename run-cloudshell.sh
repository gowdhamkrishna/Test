#!/bin/bash

# Make sure we're in the project directory
cd "$(dirname "$0")"

# Print banner
echo "===================================================="
echo "Starting ChatUp in Google Cloud Shell Environment"
echo "===================================================="

# Set environment variables
export NODE_ENV=production
export PORT=8080

# Install required dependencies if not already installed
if ! npm list http-proxy-middleware > /dev/null 2>&1; then
  echo "Installing http-proxy-middleware..."
  npm install --save http-proxy-middleware
fi

# Start the application with the cloudshell configuration
echo "Starting application..."
echo "Use Web Preview (port 8080) to access the application"
echo "Press Ctrl+C to stop"

npm run cloudshell

exit 0 