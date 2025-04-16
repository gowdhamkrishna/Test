# Deploying to Google Cloud Shell

This guide explains how to deploy Chatup on Google Cloud Shell using the URL format like `3000-cs-90e50494-9265-4a69-8fea-20051c5279ad.cs-asia-southeast1-bool.cloudshell.dev`.

## Prerequisites

- A Google Cloud account
- Access to Google Cloud Shell
- Git installed in your Cloud Shell environment

## Deployment Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-repo/Chatup.git
   cd Chatup
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the Next.js application**

   ```bash
   npm run build
   ```

4. **Start the server**

   There are two ways to start the server:

   a. Using the included start script:
   ```bash
   ./start-cloud.sh
   ```

   b. Manually:
   ```bash
   export NODE_ENV=production
   npm run server
   # or with node directly
   node server.js
   ```

5. **Access your application**

   Once the server is running, you can access it through the Cloud Shell web preview by clicking on the web preview icon in the top right of the Cloud Shell and selecting "Preview on port 3000".

   The application will be available at a URL like:
   `https://3000-cs-90e50494-9265-4a69-8fea-20051c5279ad.cs-asia-southeast1-bool.cloudshell.dev`

## Troubleshooting

### Connection Issues

If you encounter connection issues between the client and server:

1. Verify that the server is running on port 5000:
   ```bash
   netstat -tulpn | grep 5000
   ```

2. Check that the Google Cloud Shell Web Preview is properly configured:
   - Click on the Web Preview icon
   - Select "Change port" and enter 3000
   - Make sure the firewall isn't blocking connections

3. Check server logs for any CORS-related errors:
   ```bash
   tail -f server.log
   ```

### HTTPS Issues

The application is configured to work with the HTTPS connections provided by Google Cloud Shell. If you're facing HTTPS-related issues:

1. Check that all connections between the client and server are using HTTPS
2. Verify that your domain is correctly listed in the allowed origins in server.js

## Persistent Deployment

For a persistent deployment, consider:

1. Setting up a systemd service
2. Using a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js
   ```

3. Deploying to Google App Engine or Google Kubernetes Engine for more robust hosting 