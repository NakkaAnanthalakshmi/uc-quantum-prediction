// Centralized Clinical API Configuration
const CONFIG = {
    // Check for a specifically defined global backend URL, else fallback to hostname-based detection
    API_URL: window.CLINICAL_BACKEND_URL ||
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:8001'
            : `https://${window.location.hostname.replace('frontend', 'backend')}`), // Heuristic for Railway/Render
    HEALTH_CHECK_INTERVAL: 5000,
    VERSION: '1.3.0-CloudReady'
};

// Make it available globally
window.API_CONFIG = CONFIG;
console.log("Clinical Config Loaded:", CONFIG.API_URL);
