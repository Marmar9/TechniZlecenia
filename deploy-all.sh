#!/bin/bash

# Complete deployment script for TechniZlecenia
# Usage: ./deploy-all.sh

echo "🚀 Starting complete deployment..."

# Deploy API first
echo "📡 Deploying API..."
./deploy-api.sh

if [ $? -ne 0 ]; then
    echo "❌ API deployment failed!"
    exit 1
fi

# Deploy Frontend
echo "🌐 Deploying Frontend..."
./deploy-web.sh

if [ $? -ne 0 ]; then
    echo "❌ Frontend deployment failed!"
    exit 1
fi

echo "✅ Complete deployment successful!"
echo "🌐 Frontend: https://oxylize.com"
echo "📡 API: https://api.oxylize.com"


