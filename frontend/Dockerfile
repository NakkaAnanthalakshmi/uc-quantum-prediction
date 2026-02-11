# Use an official Nginx image to serve the static files
FROM nginx:alpine

# Copy the frontend files into the Nginx html directory
COPY . /usr/share/nginx/html

# Expose port 80 for the Nginx server
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
