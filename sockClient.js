// client.js
import { io } from "socket.io-client";

// Simple function to detect mobile devices
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent);
};

// Get the current hostname and port for dynamic connections
const getServerUrl = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') return 'http://localhost:5000';
  
  // For mobile devices, check if there's a saved custom server address in localStorage
  if (isMobileDevice()) {
    const savedServerAddress = localStorage.getItem('customServerAddress');
    if (savedServerAddress && savedServerAddress.includes(':')) {
      return `http://${savedServerAddress}`;
    }
  }
  
  // Check if we're in Google Cloud Shell environment
  if (window.location.hostname.includes('cloudshell.dev') || 
      window.location.pathname.includes('/devshell/proxy')) {
    
    // Get the current URL
    const currentUrl = window.location.href;
    console.log('Current URL:', currentUrl);
    
    // Special handling for devshell proxy format
    if (currentUrl.includes('/devshell/proxy')) {
      // Extract port from the URL or query params
      const urlParams = new URLSearchParams(window.location.search);
      const port = urlParams.get('port');
      const targetPort = port === '3000' ? '5000' : port;
      
      // Construct backend URL with the same domain but different port
      return `${window.location.protocol}//${window.location.host}/devshell/proxy?port=${targetPort}&environment_id=default`;
    }
    
    // Regular Cloud Shell format (hostname with port)
    const hostname = window.location.hostname;
    // Try to keep the same hostname but change port from 3000 to 5000
    if (hostname.startsWith('3000-')) {
      return `https://${hostname.replace('3000-', '5000-')}`;
    }
    
    // If hostname doesn't follow the expected pattern, fall back to a simple port replacement
    return window.location.origin.replace(/:\d+/, ':5000').replace(/\/\d+-/, '/5000-');
  }
  
  // Otherwise use the current hostname with port 5000
  const hostname = window.location.hostname;
  return `http://${hostname}:5000`;
};

// Get the current user from local storage if available
const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const userData = localStorage.getItem('guestSession');
    if (userData) {
      const parsed = JSON.parse(userData);
      return parsed?.userName || null;
    }
  } catch (e) {
    console.error("Error getting current user:", e);
  }
  return null;
};

// Logging wrapper to avoid excessive logging on mobile
const logMessage = (type, message, data) => {
  // On mobile, only log errors
  if (isMobileDevice() && type !== 'error') return;
  
  switch (type) {
    case 'error':
      console.error(message, data);
      break;
    case 'warn':
      console.warn(message, data);
      break;
    default:
      console.log(message, data);
  }
};

// Heartbeat system to track user activity and maintain session
let lastActiveTimestamp = Date.now();
let heartbeatInterval = null;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const updateActivityTimestamp = () => {
  lastActiveTimestamp = Date.now();
  localStorage.setItem('lastActive', lastActiveTimestamp.toString());
};

// Create socket instance with optimized settings
const createSocket = () => {
  const serverUrl = getServerUrl();
  
  console.log(`Connecting to server at: ${serverUrl}`);
  
  // Check if we're in Cloud Shell proxy environment
  const isCloudShellProxy = typeof window !== 'undefined' && 
                           (window.location.pathname.includes('/devshell/proxy') || 
                            window.location.hostname.includes('cloudshell.dev'));
  
  const socket = io(serverUrl, {
    reconnection: true,
    reconnectionAttempts: Infinity, // Try to reconnect indefinitely
    reconnectionDelay: 1000,
    reconnectionDelayMax: isMobileDevice() ? 10000 : 5000, // Longer max delay on mobile
    timeout: isMobileDevice() ? 30000 : 20000, // Longer timeout on mobile
    transports: ['polling'], // Force polling only - WebSockets failing with 503 in Cloud Shell
    autoConnect: true,
    forceNew: true, // Create a new connection to avoid stale connections
    // Include username in handshake query if available
    query: {
      userName: getCurrentUser(),
      lastActive: lastActiveTimestamp
    },
    // Enable CORS with credentials
    withCredentials: true,
    // Additional options that might help in Cloud Shell
    path: isCloudShellProxy ? '/socket.io' : undefined,
    extraHeaders: isCloudShellProxy ? {
      'X-Forwarded-Host': window.location.host,
      'X-Forwarded-Proto': window.location.protocol.replace(':', '')
    } : {}
  });
  
  // Add additional debugging for connection process
  socket.io.on("error", (error) => {
    console.error("Socket.io transport error:", error);
  });
  
  socket.io.on("reconnect_attempt", (attempt) => {
    console.log(`Socket reconnect attempt #${attempt}`);
    // Always use polling on reconnect attempts
    socket.io.opts.transports = ['polling'];
  });
  
  return socket;
};

// Create socket instance
const socket = createSocket();

// Add connection handling
let reconnectAttempts = 0;
let isReconnecting = false;
let reconnectTimer = null;

// Log the connection URL once
if (typeof window !== 'undefined') {
  logMessage('info', `Socket connecting to: ${getServerUrl()} as ${getCurrentUser() || 'anonymous'}`);
  
  // Set up activity listeners to track user interaction
  const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
  activityEvents.forEach(event => {
    window.addEventListener(event, updateActivityTimestamp, { passive: true });
  });
  
  // Restore last active time from storage if available
  try {
    const storedLastActive = localStorage.getItem('lastActive');
    if (storedLastActive) {
      const parsedTime = parseInt(storedLastActive, 10);
      if (!isNaN(parsedTime) && Date.now() - parsedTime < SESSION_TIMEOUT) {
        lastActiveTimestamp = parsedTime;
      }
    }
  } catch (e) {
    console.error("Error restoring activity timestamp:", e);
  }
}

socket.on('connect', () => {
  if (isReconnecting) {
    logMessage('info', 'Reconnected to server');
    
    // Clear any pending reconnect timer
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }
  
  reconnectAttempts = 0;
  isReconnecting = false;
  
  // Update query with current username if needed
  const currentUser = getCurrentUser();
  if (currentUser && (!socket.io.opts.query || socket.io.opts.query.userName !== currentUser)) {
    socket.io.opts.query = { 
      ...socket.io.opts.query, 
      userName: currentUser,
      lastActive: lastActiveTimestamp 
    };
    
    // Let the server know we're online
    socket.emit('user-online', currentUser);
    
    // Set up heartbeat system for session persistence
    if (typeof window !== 'undefined') {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      
      heartbeatInterval = setInterval(() => {
        const now = Date.now();
        const timeSinceLastActive = now - lastActiveTimestamp;
        
        // Only send heartbeat if user has been active recently
        if (timeSinceLastActive < SESSION_TIMEOUT) {
          socket.emit('heartbeat', {
            userName: currentUser,
            lastActive: lastActiveTimestamp
          });
        }
      }, 15000); // Send heartbeat every 15 seconds
    }
  }
  
  // Set up regular pinging to maintain connection
  if (typeof window !== 'undefined' && currentUser) {
    // Clear any existing ping interval
    if (window.socketPingInterval) {
      clearInterval(window.socketPingInterval);
    }
    
    // Set up new ping interval with adaptive timing
    window.socketPingInterval = setInterval(() => {
      if (socket.connected && currentUser) {
        const now = Date.now();
        const timeSinceLastActive = now - lastActiveTimestamp;
        
        // If user is active, ping more frequently
        if (timeSinceLastActive < 5 * 60 * 1000) {  // Active within 5 minutes
          socket.emit('ping-user', currentUser);
        } else if (timeSinceLastActive < SESSION_TIMEOUT) {
          // Less frequent pings for inactive but still in session
          if (Math.random() < 0.5) { // 50% chance to ping to reduce server load
            socket.emit('ping-user', currentUser);
          }
        }
      }
    }, isMobileDevice() ? 45000 : 30000); // Ping less frequently on mobile to save battery
  }
});

// Send offline status when the page unloads
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const currentUser = getCurrentUser();
    if (currentUser && socket.connected) {
      // Use sync XHR for better reliability during page unload
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${getServerUrl()}/api/user-offline`, false); // Synchronous request
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({
          userName: currentUser,
          timestamp: new Date().toISOString()
        }));
      } catch (e) {
        // Ignore errors during unload
      }
      
      // Also try the socket method as a backup
      socket.emit('user-offline', {
        userName: currentUser,
        timestamp: new Date().toISOString()
      });
    }
  });
}

socket.on('connect_error', (error) => {
  if (!isReconnecting) {
    logMessage('error', 'Connection error:', error.message);
    isReconnecting = true;
  }
  
  // If on mobile, and can't connect, show a more helpful message
  if (isMobileDevice() && reconnectAttempts === 0) {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(
        `Connection issue detected. Please ensure you're connecting to the correct server at ${getServerUrl()}`
      );
    }
  }
  
  reconnectAttempts++;
});

socket.on('disconnect', (reason) => {
  logMessage('warn', `Disconnected: ${reason}`);
  
  // Clean up heartbeat interval
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
  if (reason === 'io server disconnect') {
    // Server intentionally disconnected us, wait and reconnect
    reconnectTimer = setTimeout(() => {
      const currentUser = getCurrentUser();
      if (currentUser) {
        socket.io.opts.query = { 
          ...socket.io.opts.query, 
          userName: currentUser,
          lastActive: lastActiveTimestamp 
        };
      }
      socket.connect();
    }, 3000);
  } else if (reason === 'transport close' || reason === 'ping timeout') {
    // Transport-level disconnection - try to reconnect faster
    reconnectTimer = setTimeout(() => {
      socket.connect();
    }, 1000);
  }
});

// Server-initiated session expiration
socket.on('session-expired', () => {
  logMessage('warn', 'Session expired by server');
  // Clear session data
  if (typeof window !== 'undefined') {
    localStorage.removeItem('lastActive');
    // Don't clear the entire guestSession immediately
    
    // First attempt to reconnect if there's a valid session
    try {
      const userData = localStorage.getItem('guestSession');
      if (userData) {
        const parsedData = JSON.parse(userData);
        
        // Emit reconnect event with current user data
        socket.emit('user-reconnect', {
          ...parsedData,
          lastSeen: new Date().toISOString()
        });
        
        // Set a short timeout to see if reconnect succeeds
        setTimeout(() => {
          // If we're still on a page that requires auth and the session failed to restore,
          // redirect to login
          if (window.location.pathname !== '/' && !socket.connected) {
            localStorage.removeItem('guestSession');
            window.location.href = '/';
          }
        }, 3000);
        
        return;
      }
    } catch (e) {
      console.error("Error processing session data:", e);
    }
    
    // If we got here, we couldn't reconnect, so redirect
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }
});

// Add a specific handler for user-not-found that attempts recreation
socket.on('user-not-found', () => {
  logMessage('warn', 'User not found in database');
  
  if (typeof window !== 'undefined') {
    try {
      const userData = localStorage.getItem('guestSession');
      if (userData) {
        const parsedData = JSON.parse(userData);
        
        // Emit reconnect event with current user data
        socket.emit('user-reconnect', {
          ...parsedData,
          lastSeen: new Date().toISOString(),
          socketId: socket.id,
          online: true
        });
      }
    } catch (e) {
      console.error("Error processing session data:", e);
    }
  }
});

// Custom function to force reconnect and update user status
const forceReconnect = () => {
  const now = Date.now();
  updateActivityTimestamp(); // Update activity timestamp
  
  if (socket.disconnected) {
    const currentUser = getCurrentUser();
    if (currentUser) {
      socket.io.opts.query = { 
        ...socket.io.opts.query, 
        userName: currentUser,
        lastActive: lastActiveTimestamp
      };
    }
    socket.connect();
  } else if (socket.connected) {
    // Already connected, just update user status
    const currentUser = getCurrentUser();
    if (currentUser) {
      socket.emit('user-online', currentUser);
      socket.emit('heartbeat', {
        userName: currentUser,
        lastActive: lastActiveTimestamp
      });
    }
  }
};

// Detect if user regains focus/comes back online at the browser level
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    updateActivityTimestamp();
    const currentUser = getCurrentUser();
    if (currentUser && socket.connected) {
      socket.emit('user-online', currentUser);
    } else {
      forceReconnect();
    }
  });
  
  window.addEventListener('online', () => {
    updateActivityTimestamp();
    forceReconnect();
  });
  
  // Also handle visibility change for modern browsers
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateActivityTimestamp();
      forceReconnect();
    }
  });
}

// Update the socket query if the user logs in after socket creation
export const updateSocketUser = (userName) => {
  if (socket && socket.io && socket.io.opts && socket.io.opts.query) {
    updateActivityTimestamp();
    socket.io.opts.query.userName = userName;
    socket.io.opts.query.lastActive = lastActiveTimestamp;
    logMessage('info', `Updated socket user to: ${userName}`);
    
    // If already connected, notify the server about the user change
    if (socket.connected) {
      socket.emit('user-online', userName);
      socket.emit('heartbeat', {
        userName: userName,
        lastActive: lastActiveTimestamp
      });
    } else {
      // Not connected, try to reconnect
      socket.connect();
    }
  }
};

// Add a health check function to diagnose connection issues
export const checkServerHealth = async () => {
  try {
    const serverUrl = getServerUrl();
    const healthUrl = `${serverUrl}/health`;
    
    console.log(`Testing server health at: ${healthUrl}`);
    
    // Try to fetch the health endpoint with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin'
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Server health check failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Server health check result:', data);
    
    return {
      success: true,
      data,
      message: `Server is healthy. Uptime: ${Math.floor(data.uptime / 60)} minutes`
    };
  } catch (error) {
    console.error('Server health check error:', error);
    return {
      success: false,
      error: error.message,
      message: `Server health check failed: ${error.message}`
    };
  }
};

// Expose a function to force transport type
export const setTransportType = (transportType) => {
  if (!socket || !socket.io) return false;
  
  // Valid transport types
  if (['polling', 'websocket'].includes(transportType)) {
    console.log(`Manually setting transport to: ${transportType}`);
    socket.io.opts.transports = [transportType];
    
    // Reconnect to apply the change
    if (socket.connected) {
      socket.disconnect().connect();
    } else {
      socket.connect();
    }
    return true;
  }
  
  return false;
};

// Export additional functions
export { 
  forceReconnect, 
  updateActivityTimestamp,
  checkServerHealth,
  setTransportType,
  getServerUrl
};

export default socket;
