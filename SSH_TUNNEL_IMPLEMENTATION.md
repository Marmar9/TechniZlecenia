# SSH Tunnel Implementation for Database Access

## Overview

The deployment system now implements a consistent database access pattern where:

1. **All database connections use `localhost`** - regardless of where the database actually runs
2. **SSH tunnels handle remote database access** - when the database is remote, an SSH tunnel automatically binds the remote port to localhost
3. **Transparent connectivity** - applications and tools don't need to know if the database is local or remote

## Implementation Details

### Database URL Pattern

**Before** (inconsistent):
```bash
# Local database
DATABASE_URL=postgresql://dev:dev@localhost:5432/techni-zlecenia

# Remote database  
DATABASE_URL=postgresql://dev:dev@206.189.52.131:5432/techni-zlecenia
```

**After** (consistent):
```bash
# Always localhost - SSH tunnel handles remote access
DATABASE_URL=postgresql://dev:dev@localhost:5432/techni-zlecenia
```

### SSH Tunnel Management

#### Automatic Tunnel Creation
When a remote database is started, the system automatically:
1. Checks if an SSH tunnel already exists
2. Creates a new tunnel if needed: `ssh -f -N -L 5432:localhost:5432 root@206.189.52.131`
3. Verifies tunnel connectivity
4. Reports tunnel status

#### Tunnel Functions Added

**`create_ssh_tunnel(location)`**
- Creates SSH tunnel for remote database access
- Handles existing tunnel detection
- Provides error handling and retry logic

**`is_ssh_tunnel_active(port)`**
- Checks if SSH tunnel is currently active
- Validates both port binding and SSH process existence

**`close_ssh_tunnel()`**
- Cleanly closes existing SSH tunnels
- Used when stopping remote database components

**`ensure_database_connectivity(location)`**
- High-level function that ensures database is accessible
- Creates tunnel if needed for remote databases
- Tests connectivity on localhost port

### Updated Components

#### 1. Database Component (`deploy/components/db.sh`)
- **Remote start**: Creates SSH tunnel after starting remote PostgreSQL service
- **Remote stop**: Closes SSH tunnel before stopping remote service
- **Migrations**: Uses tunnel for remote database migrations
- **Status checking**: Reports both remote service and tunnel status

#### 2. Health Check (`deploy/utils/health-check.sh`)
- **Remote database status**: Shows remote service status + tunnel status
- **Connectivity check**: Tests localhost connection via tunnel
- **Enhanced reporting**: Clear indication of tunnel usage

#### 3. Common Utilities (`deploy/utils/common.sh`)
- **Consistent URLs**: All database URLs use localhost
- **Tunnel management**: Centralized SSH tunnel functions
- **Error handling**: Proper cleanup and error reporting

#### 4. Main Deployment Script (`deploy/deploy.sh`)
- **New `tunnel` action**: Manual SSH tunnel management
- **Consistent environment**: All environments use localhost database URLs
- **Status reporting**: Shows tunnel status in component status

## Usage Examples

### Manual Tunnel Management
```bash
# Create/check SSH tunnel to remote database
./deploy/deploy.sh --db=remote tunnel

# Output when tunnel exists:
# SSH tunnel is active
# Database accessible at: localhost:5432

# Output when creating new tunnel:
# Creating SSH tunnel...
# SSH tunnel established
# Database now accessible at: localhost:5432
```

### Database Operations with Remote Database
```bash
# Start remote database (automatically creates tunnel)
./deploy/deploy.sh --db=remote start db

# Run migrations (uses tunnel automatically)
./deploy/deploy.sh --db=remote migrate

# Check status (shows both remote service and tunnel)
./deploy/deploy.sh --db=remote status
```

### Development Workflow
```bash
# Hybrid setup: API and DB remote, Web local
./deploy/deploy.sh --api=remote --db=remote --web=local start

# All database connections use localhost:5432
# SSH tunnel handles remote database access transparently
```

## Benefits

### 1. **Consistency**
- All applications use the same database URL format
- No need to change connection strings based on environment
- Simplified configuration management

### 2. **Security**
- Database traffic goes through encrypted SSH tunnel
- No need to expose PostgreSQL port directly
- Leverages existing SSH key authentication

### 3. **Transparency**
- Applications don't need to know database location
- Tools like `psql`, `sqlx`, etc. work the same way
- Easy to switch between local and remote databases

### 4. **Reliability**
- Automatic tunnel creation and management
- Error handling for connection failures
- Status reporting for troubleshooting

## Configuration

### SSH Tunnel Settings (in `deploy/config.env`)
```bash
# VPS Configuration
VPS_HOST="root@206.189.52.131"
VPS_IP="206.189.52.131"

# Database Port (used for tunnel)
DB_PORT="5432"

# Database Credentials (consistent everywhere)
POSTGRES_USER="dev"
POSTGRES_PASSWORD="dev"
POSTGRES_DB="techni-zlecenia"
```

### Environment Variables Generated
```bash
# Always the same regardless of database location
DATABASE_URL=postgresql://dev:dev@localhost:5432/techni-zlecenia
```

## Troubleshooting

### Check Tunnel Status
```bash
# Check if tunnel is active
./deploy/deploy.sh --db=remote tunnel

# Check overall status
./deploy/deploy.sh --db=remote status
```

### Manual Tunnel Operations
```bash
# Kill existing tunnel
pkill -f "ssh.*5432:localhost:5432"

# Create new tunnel manually
ssh -f -N -L 5432:localhost:5432 root@206.189.52.131

# Test connectivity
nc -z localhost 5432
```

### Common Issues

**Tunnel Creation Fails**
- Check SSH connectivity: `ssh root@206.189.52.131 echo "test"`
- Verify SSH keys are properly configured
- Check if port 5432 is already in use locally

**Database Connection Fails Through Tunnel**
- Verify remote PostgreSQL service is running
- Check database credentials match
- Test direct SSH connection to verify connectivity

**Port Conflicts**
- Stop local PostgreSQL if running on same port
- Or configure different port in `deploy/config.env`

## Testing Results

### SSH Tunnel Creation ✅ WORKING
```
Creating SSH tunnel...
SSH tunnel to database established (localhost:5432)
```

### Database URL Consistency ✅ VERIFIED
```
DATABASE_URL=postgresql://dev:dev@localhost:5432/techni-zlecenia
```

### Status Reporting ✅ ENHANCED
```
Database (remote): (remote service running) (tunnel active) ✓ Running and accessible via tunnel
```

### Manual Tunnel Management ✅ WORKING
```
SSH tunnel is active
Database accessible at: localhost:5432
```

## Migration Impact

### Files Updated
- ✅ `deploy/utils/common.sh` - Added tunnel management functions
- ✅ `deploy/components/db.sh` - Integrated tunnel creation/cleanup
- ✅ `deploy/utils/health-check.sh` - Enhanced status reporting
- ✅ `deploy/deploy.sh` - Added tunnel action and consistent URLs

### Backward Compatibility
- ✅ Local database operations unchanged
- ✅ Environment variables simplified and consistent
- ✅ All existing scripts work with new tunnel system

This implementation provides a robust, secure, and transparent way to handle database connectivity across local and remote environments while maintaining consistency in database connection strings.
