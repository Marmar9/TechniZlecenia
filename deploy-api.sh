#!/bin/bash

# Deploy script for TechniZlecenia Rust API
# Usage: ./deploy-api.sh

echo "🚀 Starting API deployment..."

# Build the Rust API
echo "📦 Building Rust API..."
cd /home/eduard/Pulpit/TechniZlecenia/api
cargo build --release

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
Environment=DATABASE_URL=postgresql://username:password@localhost/techni_zlecenia

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




