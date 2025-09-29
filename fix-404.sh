#!/bin/bash

# Fix 404 issue on oxylize.com
echo "🔧 Fixing 404 issue..."

# Check and restart PM2 process
echo "🔄 Checking PM2 status..."
ssh root@206.189.52.131 "pm2 list"

echo "🔄 Restarting PM2 process..."
ssh root@206.189.52.131 "pm2 restart techni-zlecenia-web"

# Check nginx configuration
echo "🔄 Checking nginx configuration..."
ssh root@206.189.52.131 "nginx -t"

# Reload nginx
echo "🔄 Reloading nginx..."
ssh root@206.189.52.131 "systemctl reload nginx"

# Test local connection
echo "🧪 Testing local connection..."
ssh root@206.189.52.131 "curl -I http://localhost:3000"

# Test external connection
echo "🧪 Testing external connection..."
curl -I https://oxylize.com

echo "✅ Fix complete!"


