# Unified UC Prediction QML Dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PORT 8080

# Install Nginx and system dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    gettext-base \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log

# Set the working directory
WORKDIR /app

# 1. Prepare Backend
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
COPY backend /app/backend/
# OPTIMIZATION: Pre-download heavy models during build to prevent OOM
RUN python /app/backend/preload_models.py

# 2. Prepare Frontend
COPY frontend /usr/share/nginx/html/

# 3. Configure Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# 4. Prepare Startup
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose the Railway port (dynamically set by Railway)
EXPOSE 80

# Run the unified rest-stop
CMD ["/app/start.sh"]
