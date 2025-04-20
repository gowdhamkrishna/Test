#!/bin/bash

echo "==========================================="
echo "Starting ChatUp in CS External Environment"
echo "==========================================="

# Set environment variables
export NODE_ENV=production

# Check if ports are available
check_port() {
  if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null; then
    echo "Warning: Port $1 is already in use. Attempting to kill processes..."
    lsof -ti:$1 | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

check_port 3000
check_port 5000
check_port 8080

# Start the services
echo "Starting services..."

# Install dependencies if needed
if ! command -v concurrently &> /dev/null; then
  echo "Installing concurrently..."
  npm install -g concurrently
fi

# Start the app differently based on whether we're in a terminal or not
if [ -t 0 ]; then
  # We're in a terminal - use concurrently to show all logs
  npx concurrently -c "blue,green,red" \
    -n "CLIENT,SERVER,PROXY" \
    "PORT=3000 npm run dev" \
    "PORT=5000 node server.js" \
    "PORT=8080 node gcloud-server.js"
else
  # We're in a non-interactive environment - run the proxy in foreground, others in background
  echo "Starting in non-interactive mode..."
  PORT=3000 npm run dev > client.log 2>&1 &
  echo "Client started on port 3000 (logs in client.log)"
  
  PORT=5000 node server.js > server.log 2>&1 &
  echo "Server started on port 5000 (logs in server.log)"
  
  echo "Starting proxy on port 8080 (logs to console)"
  PORT=8080 node gcloud-server.js
fi

exit 0 