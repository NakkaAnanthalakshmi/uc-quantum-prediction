#!/bin/bash

# 1. CLEAN UP: Remove default Debian Nginx site configs to prevent port conflicts (Port 80 vs $PORT)
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-available/default

# 2. CONFIGURE: Substitute the PORT into our template
# Railway provides $PORT. We output to conf.d which is automatically included by nginx.conf
echo "Configuring Nginx to listen on Port: $PORT"
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# 3. START BACKEND: Run FastAPI in background
echo "Starting FastAPI Backend on 127.0.0.1:8001..."
# 3. START BACKEND: Run FastAPI in background
echo "Starting FastAPI Backend on 127.0.0.1:8001..."
cd /app/backend
# Redirect stderr to stdout to capture import errors
uvicorn main:app --host 127.0.0.1 --port 8001 > /var/log/nginx/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# 4. WAIT FOR BACKEND: Poll until port 8001 is active
# 4. WAIT FOR BACKEND: Poll until port 8001 is active
echo "Waiting for Backend to maximize..."
for i in {1..45}; do
    # Check if backend process is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "CRITICAL: Backend process died unexpectedly!"
        echo "--- BACKEND LOGS ---"
        cat /var/log/nginx/backend.log
        echo "--------------------"
        exit 1
    fi

    # Check health
    if curl -s http://127.0.0.1:8001/health > /dev/null; then
        echo "Backend is LIVE."
        break
    fi
    
    if [ $i -eq 45 ]; then
        echo "CRITICAL: Backend timed out (45s)."
        echo "--- BACKEND LOGS ---"
        cat /var/log/nginx/backend.log
        echo "--------------------"
        exit 1
    fi
    sleep 1
done

# 5. START NGINX: Run in foreground (this keeps container alive)
echo "Starting Nginx Proxy..."
nginx -g 'daemon off;'
