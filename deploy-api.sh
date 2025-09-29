#!/bin/bash

# Deploy script for TechniZlecenia Rust API
# Usage: ./deploy-api.sh

set -e  # Exit on any error

echo "🚀 Starting API deployment..."

# Check prerequisites
if ! command -v cargo >/dev/null 2>&1; then
    echo "❌ Rust/Cargo not found. Please install Rust: https://rustup.rs/"
    exit 1
fi

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
if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@206.189.52.131 "echo 'SSH connection successful'" >/dev/null 2>&1; then
    echo "❌ Cannot connect to remote server. Please check SSH keys and connection."
    exit 1
fi

# Build the Rust API
echo "📦 Building Rust API..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/api"
cargo build

if [ $? -ne 0 ]; then
    echo "❌ API build failed!"
    exit 1
fi

echo "✅ API build successful!"

# Create API directory on server
echo "📁 Creating API directory on remote server..."
ssh root@206.189.52.131 "mkdir -p /var/www/api"

# Copy the API binary
echo "📤 Copying API binary..."
scp target/release/techni-zlecenia-api root@206.189.52.131:/var/www/api/

# Copy any necessary files (migrations, config, etc.)
echo "📤 Copying API files..."
scp -r migrations/ root@206.189.52.131:/var/www/api/ 2>/dev/null || true
scp Cargo.toml root@206.189.52.131:/var/www/api/ 2>/dev/null || true

# Set permissions
echo "🔐 Setting permissions..."
ssh root@206.189.52.131 "chmod +x /var/www/api/techni-zlecenia-api && chown -R www-data:www-data /var/www/api/"

# Create systemd service for API
echo "🔧 Creating systemd service..."
ssh root@206.189.52.131 "cat > /etc/systemd/system/techni-zlecenia-api.service << 'EOF'
[Unit]
Description=TechniZlecenia API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/api
ExecStart=/var/www/api/techni-zlecenia-api
Restart=always
RestartSec=5
Environment=RUST_LOG=info
Environment=DATABASE_URL=postgresql://dev:dev@localhost:5432/techni_zlecenia

[Install]
WantedBy=multi-user.target
EOF"

# Reload systemd and start the service
echo "🔄 Starting API service..."
ssh root@206.189.52.131 "systemctl daemon-reload && systemctl enable techni-zlecenia-api && systemctl start techni-zlecenia-api"

# Check status
echo "📊 Checking API status..."
ssh root@206.189.52.131 "systemctl status techni-zlecenia-api --no-pager"

echo "✅ API deployment complete!"
echo "🌐 API: https://api.oxylize.com"




