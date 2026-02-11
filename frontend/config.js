// Centralized Clinical API Configuration
const CONFIG = {
    // ONE-LINK ARCHITECTURE: Use relative /api path in cloud, fallback to localhost:8001 for local dev
    API_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8001'
        : '/api', // This routes through the Nginx reverse proxy
    HEALTH_CHECK_INTERVAL: 5000,
    VERSION: '1.4.0-Enterprise-Proxy'
};

// Make it available globally
window.API_CONFIG = CONFIG;
console.log("Clinical Config Loaded:", CONFIG.API_URL);
