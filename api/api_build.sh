#!/bin/sh
set -e

# This runs inside docker image it is not designed to run on host mashine

su - postgres -c "pg_ctl -D /postgres -w start"

# Step 3: Run SQL commands / migrations
psql -U postgres <<EOSQL
CREATE DATABASE "techni-zlecenia" OWNER postgres;
EOSQL

export DATABASE_URL="postgres://postgres@localhost:5432/techni-zlecenia"
sqlx migrate run

# Step 4: Build Rust project
RUSTFLAGS='-C target-feature=+crt-static' cargo build --release --target x86_64-unknown-linux-musl

# Step 5: Stop PostgreSQL
su - postgres -c "pg_ctl -D /postgres -m fast stop"
