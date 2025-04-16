#!/bin/bash

# Log the startup
echo "Starting Chatup server in Google Cloud environment..."

# Set environment variables
export NODE_ENV=production

# Make sure we have the latest dependencies
echo "Installing dependencies..."
npm install

# Build the Next.js app (if needed)
echo "Building the Next.js app..."
npm run build

# Start the server with nodemon for auto-restart capability
echo "Starting server..."
npm run server

# Add a fallback to use node directly if nodemon fails
if [ $? -ne 0 ]; then
  echo "Fallback to direct node start..."
  node server.js
fi 