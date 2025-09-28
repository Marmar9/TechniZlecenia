# TechniZlecenia Deployment Guide

## Overview

TechniZlecenia is a full-stack job posting platform with a modern 3-tier architecture:
- **Frontend**: Next.js React application
- **Backend**: Rust API using Axum framework
- **Database**: PostgreSQL with custom extensions

## Architecture Components

### 1. API Backend (`/api/`)
- **Framework**: Axum with Tokio async runtime
- **Language**: Rust (Edition 2024)
- **Port**: 8080
- **Binary**: `techni-zlecenia-api`
- **Key Features**:
  - JWT-based authentication
  - Real-time chat system
  - File upload handling
  - PostgreSQL integration with SQLx

### 2. Web Frontend (`/web/`)
- **Framework**: Next.js 14 with TypeScript
- **Port**: 3000 (development), 80/443 (production)
- **Key Features**:
  - Server-side rendering
  - Tailwind CSS styling
  - Real-time chat interface
  - Authentication context

### 3. Database
- **Type**: PostgreSQL 15+
- **Extensions**: uuid-ossp, pgcrypto
- **Port**: 5432
- **Schema**: Users, posts, reviews, chat threads/messages

## Directory Structure

```
TechniZlecenia/
├── api/                     # Rust backend
│   ├── src/
│   │   ├── api/            # API route handlers
│   │   ├── db/             # Database models and queries
│   │   ├── server/         # Server configuration
│   │   └── main.rs         # Application entry point
│   ├── migrations/         # Database schema migrations
│   ├── Cargo.toml         # Rust dependencies
│   └── Dockerfile         # API container configuration
├── web/                    # Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js app router pages
│   │   ├── components/    # React components
│   │   ├── lib/           # Utility libraries
│   │   └── types/         # TypeScript definitions
│   ├── package.json       # Node.js dependencies
│   └── Dockerfile         # Web container configuration
├── docker-compose.yml     # Multi-container orchestration
├── nginx-*.conf          # Nginx configurations
└── deployment scripts    # Various deployment utilities
```

## Deployment Methods

### Local Development

1. **Prerequisites**:
   ```bash
   # Install required tools
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   npm install -g bun
   ```

2. **Setup Database**:
   ```bash
   # Start PostgreSQL with Docker
   docker-compose up postgres -d
   
   # Run migrations
   cd api
   sqlx migrate run
   ```

3. **Start Services**:
   ```bash
   # Terminal 1: API
   cd api
   cargo run
   
   # Terminal 2: Web
   cd web
   bun dev
   ```

### Docker Development

```bash
# Build and start all services
docker-compose up --build

# Services available at:
# - Frontend: http://localhost:3000
# - API: http://localhost:8080
# - Database: localhost:5432
```

### Production Deployment

#### Server Setup
Use the provided setup script:
```bash
./setup-server.sh
```

This script installs:
- Docker and Docker Compose
- Nginx
- PM2 process manager
- SSL certificates (Let's Encrypt)
- System service configuration

#### Deployment Process

1. **Prepare for Deployment**:
   ```bash
   ./dev-prepare.sh
   ```

2. **Deploy API**:
   ```bash
   ./deploy-api.sh
   ```

3. **Deploy Web**:
   ```bash
   # Web deployment is handled through Docker Compose
   docker-compose up -d web
   ```

## Configuration

### Environment Variables

#### API Configuration
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/techni_zlecenia
POSTGRES_USER=techni_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=techni_zlecenia

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# Server
API_HOST=0.0.0.0
API_PORT=8080
```

#### Web Configuration
```bash
# API Connection
NEXT_PUBLIC_API_URL=http://localhost:8080
API_URL=http://api:8080  # Internal Docker network

# Authentication
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

### Database Access

#### Local Database Access
```bash
# Direct connection (when running locally)
psql -h localhost -p 5432 -U techni_user -d techni_zlecenia

# Through Docker
docker exec -it techni-zlecenia-postgres-1 psql -U techni_user -d techni_zlecenia
```

#### Remote Database Access (SSH Tunnel)
```bash
# Create SSH tunnel to VPS
ssh -L 5432:localhost:5432 user@your-vps-ip

# Then connect locally
psql -h localhost -p 5432 -U techni_user -d techni_zlecenia
```

Alternative using the provided script:
```bash
# Use the database SSH script
./api/scripts/db_ssh.sh
```

## Nginx Configuration

### Development (nginx-config.conf)
- Serves static files
- Proxies API requests to port 8080
- Proxies web requests to port 3000

### Production (nginx-ssl.conf)
- SSL termination with Let's Encrypt
- Security headers
- Gzip compression
- WebSocket support for real-time features

### Static Optimization (nginx-static-trick.conf)
- Advanced caching strategies
- Static asset optimization
- CDN-ready configuration

## Service Management

### SystemD Service
The application runs as a system service:
```bash
# Start/stop/restart service
sudo systemctl start techni-zlecenia
sudo systemctl stop techni-zlecenia
sudo systemctl restart techni-zlecenia

# View logs
sudo journalctl -u techni-zlecenia -f
```

### PM2 Process Management
```bash
# View running processes
pm2 list

# View logs
pm2 logs techni-zlecenia

# Restart application
pm2 restart techni-zlecenia
```

## Database Schema

### Core Tables
- **users**: User accounts with authentication
- **posts**: Job/service postings
- **reviews**: User ratings and feedback
- **chat_threads**: Conversation containers
- **chat_messages**: Individual messages

### Migrations
Located in `/api/migrations/`, run with:
```bash
cd api
sqlx migrate run
```

## Build Process

### API Build
```bash
cd api
cargo build --release
# Binary: target/release/techni-zlecenia-api
```

### Web Build
```bash
cd web
bun run build
# Output: .next/ directory
```

### Docker Build
```bash
# Build specific service
docker-compose build api
docker-compose build web

# Build all services
docker-compose build
```

## Monitoring and Logs

### Application Logs
```bash
# API logs (when running with cargo)
cd api && cargo run

# Web logs (when running with bun)
cd web && bun dev

# Docker logs
docker-compose logs -f api
docker-compose logs -f web
```

### System Logs
```bash
# Service logs
sudo journalctl -u techni-zlecenia -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Security Considerations

### SSL/TLS
- Let's Encrypt certificates managed automatically
- HTTPS redirect enforced
- Security headers configured in Nginx

### Database Security
- User accounts with limited privileges
- Connection encryption in production
- Regular backup strategy recommended

### API Security
- JWT token authentication
- CORS configuration
- Input validation and sanitization

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   ```bash
   # Check if PostgreSQL is running
   docker-compose ps postgres
   
   # Verify connection
   psql -h localhost -p 5432 -U techni_user -d techni_zlecenia
   ```

2. **API Not Starting**:
   ```bash
   # Check database migrations
   cd api && sqlx migrate run
   
   # Verify environment variables
   env | grep DATABASE_URL
   ```

3. **Web Build Failures**:
   ```bash
   # Clear cache and reinstall
   cd web
   rm -rf node_modules .next
   bun install
   bun run build
   ```

### Port Conflicts
- API: 8080
- Web: 3000
- Database: 5432
- Nginx: 80, 443

Ensure these ports are available or modify configuration accordingly.

## Scaling Considerations

### Horizontal Scaling
- API: Multiple instances behind load balancer
- Web: Static files can be served from CDN
- Database: Read replicas for improved performance

### Performance Optimization
- API: Connection pooling configured (SQLx)
- Web: Next.js optimizations (SSR, image optimization)
- Database: Proper indexing on frequently queried columns

## Backup Strategy

### Database Backups
```bash
# Create backup
pg_dump -h localhost -U techni_user techni_zlecenia > backup.sql

# Restore backup
psql -h localhost -U techni_user techni_zlecenia < backup.sql
```

### Application Backups
- Source code: Git repository
- Configuration: Environment variables and config files
- User uploads: File system or object storage

---

## Quick Reference

### Start Development Environment
```bash
docker-compose up --build
```

### Deploy to Production
```bash
./setup-server.sh      # One-time server setup
./dev-prepare.sh       # Prepare deployment
./deploy-api.sh        # Deploy API
```

### Access Database
```bash
# Local
docker exec -it techni-zlecenia-postgres-1 psql -U techni_user -d techni_zlecenia

# Remote (SSH tunnel)
ssh -L 5432:localhost:5432 user@server-ip
psql -h localhost -p 5432 -U techni_user -d techni_zlecenia
```

### View Logs
```bash
# Development
docker-compose logs -f

# Production
sudo journalctl -u techni-zlecenia -f
```
