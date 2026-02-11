#!/bin/bash

# Substitute the PORT environment variable into the nginx config
# Railway provides $PORT
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Start Nginx in background
nginx -g "daemon on;"

# Start FastAPI Backend
# We run this on 127.0.0.1:8001 so it's only accessible through Nginx
cd /app/backend
exec uvicorn main:app --host 127.0.0.1 --port 8001
