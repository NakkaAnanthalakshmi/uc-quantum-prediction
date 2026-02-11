#!/bin/bash

# Substitute the PORT environment variable into the nginx config
# Railway provides $PORT
# NOTE: In Debian, the default config is in /etc/nginx/sites-enabled/default
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/sites-available/default
ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# Start Nginx in background with logging to stdout
echo "Starting Nginx on port $PORT..."
nginx &

# Start FastAPI Backend
# We run this on 127.0.0.1:8001 so it's only accessible through Nginx
echo "Starting FastAPI Backend on 127.0.0.1:8001..."
cd /app/backend
exec uvicorn main:app --host 127.0.0.1 --port 8001
