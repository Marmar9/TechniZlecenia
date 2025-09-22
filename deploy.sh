#!/bin/bash

# Deploy script for TechniZlecenia web app
# Usage: ./deploy.sh

echo "🚀 Starting deployment..."

# Build the application
echo "📦 Building application..."
cd /home/eduard/Pulpit/TechniZlecenia/web
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# Copy static assets to server
echo "📤 Copying static assets..."
scp -r .next/static root@206.189.52.131:/var/www/myapp/

# Copy server files
echo "📤 Copying server files..."
scp -r .next/server/app/* root@206.189.52.131:/var/www/myapp/
scp .next/server/pages/_app.js root@206.189.52.131:/var/www/myapp/ 2>/dev/null || true
scp .next/server/pages/_document.js root@206.189.52.131:/var/www/myapp/ 2>/dev/null || true

# Test nginx configuration and reload
echo "🔄 Reloading nginx..."
ssh root@206.189.52.131 "nginx -t && systemctl reload nginx"

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Website: https://oxylize.com"
else
    echo "❌ Nginx reload failed!"
    exit 1
fi
