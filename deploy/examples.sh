#!/bin/bash

# Quick examples for common deployment scenarios

DEPLOY_CMD="./deploy/deploy.sh"

echo "🚀 TechniZlecenia Deployment Examples"
echo ""

echo "1. 📊 Check current status:"
echo "   $DEPLOY_CMD status"
echo ""

echo "2. 🔧 Show current configuration:"
echo "   $DEPLOY_CMD config"
echo ""

echo "3. 🏠 Full local development:"
echo "   $DEPLOY_CMD --mode=dev start all"
echo ""

echo "4. 🌐 Hybrid development (API+DB remote, Web local):"
echo "   $DEPLOY_CMD --api=remote --db=remote --web=local --mode=dev start"
echo ""

echo "5. 🚀 Full production deployment:"
echo "   $DEPLOY_CMD --api=remote --db=remote --web=remote --mode=prod start"
echo ""

echo "6. 🔄 Restart just the web component:"
echo "   $DEPLOY_CMD restart web"
echo ""

echo "7. 🔨 Rebuild and deploy API:"
echo "   $DEPLOY_CMD rebuild api"
echo ""

echo "8. 📊 Run database migrations:"
echo "   $DEPLOY_CMD migrate"
echo ""

echo "9. 📋 View API logs:"
echo "   $DEPLOY_CMD logs api"
echo ""

echo "10. 🛑 Stop everything:"
echo "    $DEPLOY_CMD stop all"
echo ""

echo "Choose a scenario and run the command!"
