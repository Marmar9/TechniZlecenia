#!/bin/bash

# Setup script for remote server
# Run this once to set up the server environment

set -e  # Exit on any error

echo "🔧 Setting up remote server..."

# Check prerequisites
if ! command -v ssh >/dev/null 2>&1; then
    echo "❌ SSH client not found. Please install openssh-client."
    exit 1
fi

if ! command -v scp >/dev/null 2>&1; then
    echo "❌ SCP not found. Please install openssh-client."
    exit 1
fi

# Test SSH connection
echo "🔐 Testing SSH connection..."
if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@206.189.52.131 "echo 'SSH connection successful'" 2>/dev/null; then
    echo "❌ Cannot connect to remote server. Please check SSH keys and connection."
    exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
ssh root@206.189.52.131 "apt update && apt upgrade -y"

# Install Node.js 18+
echo "📦 Installing Node.js..."
ssh root@206.189.52.131 "curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs"

# Install PM2 globally
echo "📦 Installing PM2..."
ssh root@206.189.52.131 "npm install -g pm2"

# Install nginx
echo "📦 Installing nginx..."
ssh root@206.189.52.131 "apt install -y nginx"

# Create application directory
echo "📁 Creating application directory..."
ssh root@206.189.52.131 "mkdir -p /var/www/myapp/.next/static /var/www/myapp/public /var/log/pm2"

# Set proper permissions
echo "🔐 Setting permissions..."
ssh root@206.189.52.131 "chown -R www-data:www-data /var/www/myapp && chmod -R 755 /var/www/myapp"

# Copy nginx configuration
echo "🔄 Setting up nginx configuration..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
scp "$SCRIPT_DIR/nginx-config.conf" root@206.189.52.131:/etc/nginx/sites-available/techni-zlecenia

# Enable the site
echo "🔗 Enabling nginx site..."
ssh root@206.189.52.131 "ln -sf /etc/nginx/sites-available/techni-zlecenia /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default"

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
ssh root@206.189.52.131 "nginx -t"

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid!"
    ssh root@206.189.52.131 "systemctl reload nginx"
    echo "✅ Server setup complete!"
else
    echo "❌ Nginx configuration failed!"
    exit 1
fi

echo "🚀 Server is ready for deployment!"
echo "Run ./deploy.sh to deploy your application."




