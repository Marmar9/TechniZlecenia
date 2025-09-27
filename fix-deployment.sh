#!/bin/bash

# Quick fix script for current deployment issues
echo "🔧 Fixing deployment issues..."

# Install dependencies locally with correct React version
echo "📦 Installing correct React version locally..."
cd /home/eduard/Pulpit/TechniZlecenia/web
npm install --legacy-peer-deps

# Rebuild the application
echo "🔨 Rebuilding application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Copy ecosystem config to remote server
echo "📤 Copying ecosystem config..."
scp /home/eduard/Pulpit/TechniZlecenia/ecosystem.config.js root@206.189.52.131:/var/www/myapp/

# Install dependencies on remote server with legacy peer deps
echo "📦 Installing dependencies on remote server..."
ssh root@206.189.52.131 "cd /var/www/myapp && npm install --legacy-peer-deps"

# Start the application with PM2
echo "🚀 Starting application with PM2..."
ssh root@206.189.52.131 "cd /var/www/myapp && pm2 start ecosystem.config.js"

# Check status
echo "📊 Checking application status..."
ssh root@206.189.52.131 "pm2 status"

echo "✅ Fix complete! Check the application status above."




