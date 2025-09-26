#!/bin/env bash

export DATABASE_URL="postgres://dev:dev@localhost:5432/tz"
export NEXT_PUBLIC_API_URL="http://localhost:8080"

if [ -z $(docker ps --quiet --filter "name=dev-database") ]; then
    docker run -p 5432:5432 -d --name dev-database -e POSTGRES_USER=dev -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=tz postgres:17.6-alpine3.21 
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
