#!/bin/bash

set -e  # Exit on any error

echo "🔧 Preparing development environment..."

# Check prerequisites
if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Docker not found. Please install Docker."
    exit 1
fi

if ! command -v sqlx >/dev/null 2>&1; then
    echo "❌ SQLx CLI not found. Installing..."
    cargo install sqlx-cli --no-default-features --features rustls,postgres
fi

export DATABASE_URL="postgres://dev:dev@localhost:5432/techni-zlecenia"
export NEXT_PUBLIC_API_URL="http://localhost:8080"

echo "🗄️ Setting up database..."

if [ -z $(docker ps --quiet --filter "name=dev-database") ]; then
    docker run -p 5432:5432 -d --name dev-database -e POSTGRES_USER=dev -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=techni-zlecenia postgres:17.6-alpine3.21 
else
    echo "---- dev-database container is already running ----"
fi

cd api/ && sqlx migrate run

# Todo, generate empty vars for api
export SERVER_PEPPER=$(head -c 50 /dev/random | base64)
export ACCESS_TOKEN_LIFETIME="15" # MIN
export REFRESH_TOKEN_LIFETIME="14" # DAYS
export ACCESS_TOKEN_SECRET=$(head -c 50 /dev/random | base64)
export REFRESH_TOKEN_SECRET=$(head -c 50 /dev/random | base64)
