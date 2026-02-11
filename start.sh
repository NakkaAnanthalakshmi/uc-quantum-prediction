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
cd /app/backend
uvicorn main:app --host 127.0.0.1 --port 8001 &

# 4. WAIT FOR BACKEND: Poll until port 8001 is active
echo "Waiting for Backend to maximize..."
timeout 30s bash -c 'until curl -s http://127.0.0.1:8001/health > /dev/null; do sleep 1; done'
echo "Backend is LIVE."

# 5. START NGINX: Run in foreground (this keeps container alive)
echo "Starting Nginx Proxy..."
nginx -g 'daemon off;'
