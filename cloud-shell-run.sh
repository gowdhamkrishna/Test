#!/bin/bash

# Print banner
echo "============================================="
echo "ChatUp Google Cloud Shell Configuration"
echo "============================================="
echo "Setting up the application for Google Cloud Shell..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Add http-proxy-middleware if not already installed
if ! grep -q "http-proxy-middleware" package.json; then
    echo "Adding http-proxy-middleware..."
    npm install --save http-proxy-middleware
fi

# Configure the application for Google Cloud Shell
# Get the web preview URL from environment variable
CLOUDSHELL_HOST=${CLOUDSHELL_HOST:-"localhost"}
CLOUDSHELL_PORT=${CLOUDSHELL_PORT:-8080}

echo "Starting the application in Google Cloud Shell mode..."
echo "Client will run on port 3000"
echo "Server will run on port 5000"
echo "Access via Web Preview at port $CLOUDSHELL_PORT"

# Start all components
npx concurrently \
  "PORT=3000 npm run dev" \
  "PORT=5000 npm run server" \
  "PORT=8080 node cloud-shell-setup.js"

exit 0 