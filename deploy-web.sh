#!/bin/bash

# Deploy script for TechniZlecenia Next.js Frontend
# Usage: ./deploy-web.sh

echo "🚀 Starting Frontend deployment..."

# Stop existing PM2 process if running
echo "🛑 Stopping existing frontend process..."
ssh root@206.189.52.131 "pm2 stop techni-zlecenia-web 2>/dev/null || true"

# Create application directory on server
echo "📁 Creating application directory on remote server..."
ssh root@206.189.52.131 "mkdir -p /var/www/myapp"

# Pull latest code from git and build on server
echo "📥 Pulling latest code from git..."
ssh root@206.189.52.131 "cd /var/www/myapp && rm -rf temp_repo && git clone https://github.com/Marmar9/TechniZlecenia.git temp_repo"

# Copy web files to main directory
echo "📁 Setting up web application..."
ssh root@206.189.52.131 "cd /var/www/myapp && cp -r temp_repo/web/* . && rm -rf temp_repo"

# Install dependencies and build
echo "📦 Installing dependencies and building..."
ssh root@206.189.52.131 "cd /var/www/myapp && npm ci && npm run build"

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

echo "✅ Frontend build successful!"

# Set permissions
echo "🔐 Setting permissions..."
ssh root@206.189.52.131 "chown -R www-data:www-data /var/www/myapp && chmod -R 755 /var/www/myapp"

# Update nginx configuration for Next.js standalone
echo "🔄 Updating nginx configuration for Next.js standalone..."
ssh root@206.189.52.131 "cat > /etc/nginx/sites-available/techni-zlecenia << 'EOF'
server {
    listen 80;
    server_name oxylize.com www.oxylize.com;

    # Serve static files directly
    location /_next/static/ {
        alias /var/www/myapp/.next/static/;
        expires 1y;
        add_header Cache-Control \"public, immutable\";
        access_log off;
    }

    # Serve other static assets
    location /static/ {
        alias /var/www/myapp/.next/static/;
        expires 1y;
        add_header Cache-Control \"public, immutable\";
        access_log off;
    }

    # Handle favicon and other root static files
    location ~* \\.(ico|css|js|gif|jpe?g|png|svg|woff|woff2|ttf|eot)$ {
        root /var/www/myapp;
        expires 1y;
        add_header Cache-Control \"public, immutable\";
        access_log off;
    }

    # Proxy API calls to backend
    location /api/ {
        proxy_pass https://api.oxylize.com/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host api.oxylize.com;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Proxy all other requests to Next.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF"

# Reload nginx
echo "🔄 Reloading nginx..."
ssh root@206.189.52.131 "nginx -t && systemctl reload nginx"

# Start the application with PM2
echo "🚀 Starting frontend with PM2..."
ssh root@206.189.52.131 "cd /var/www/myapp && pm2 start ecosystem.config.js"

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
ssh root@206.189.52.131 "pm2 save"

# Check status
echo "📊 Checking frontend status..."
ssh root@206.189.52.131 "pm2 list"

echo "✅ Frontend deployment complete!"
echo "🌐 Frontend: https://oxylize.com"