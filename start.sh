#!/bin/bash

# 1. CLEAN UP: Remove default Debian Nginx site configs to prevent port conflicts (Port 80 vs $PORT)
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-available/default

# 2. CONFIGURE: Substitute the PORT into our template
# Railway provides $PORT. We output to conf.d which is automatically included by nginx.conf
echo "Configuring Nginx to listen on Port: $PORT"
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# 3. START NGINX: Run in background
# We don't use 'daemon off' here because uvicorn will be our foreground process
nginx

# 4. START BACKEND: Run FastAPI in foreground
echo "Starting FastAPI Backend on 127.0.0.1:8001..."
cd /app/backend
exec uvicorn main:app --host 127.0.0.1 --port 8001
