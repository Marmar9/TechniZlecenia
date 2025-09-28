# TechniZlecenia Hybrid Deployment System

A unified deployment system that allows you to control components across local and remote environments seamlessly.

## Quick Start

```bash
# Show current status
./deploy/deploy.sh status

# Start everything locally in development mode
./deploy/deploy.sh --mode=dev start all

# Run API and DB on server, web locally
./deploy/deploy.sh --api=remote --db=remote --web=local --mode=dev start

# Production setup (all remote)
./deploy/deploy.sh --api=remote --db=remote --web=remote --mode=prod start
```

## Usage Examples

### Hybrid Development (Recommended)
```bash
# API and DB on server, Web locally for fast development
./deploy/deploy.sh --api=remote --db=remote --web=local --mode=dev start

# View logs
./deploy/deploy.sh logs web
./deploy/deploy.sh logs api
```

### Full Local Development
```bash
# Everything local
./deploy/deploy.sh --mode=dev start all

# Rebuild just the API
./deploy/deploy.sh rebuild api
```

### Production Deployment
```bash
# Deploy everything to production
./deploy/deploy.sh --api=remote --db=remote --web=remote --mode=prod start

# Just restart the web component
./deploy/deploy.sh --web=remote restart web
```

### Database Operations
```bash
# Run migrations
./deploy/deploy.sh migrate

# Backup database
./deploy/deploy.sh --db=remote backup backup_$(date +%Y%m%d).sql

# Test database connection
./deploy/deploy.sh --db=remote test db
```

## Component Locations

- **local**: Runs on your development machine
- **remote**: Runs on the VPS (206.189.52.131)

## Modes

- **dev**: Development mode with dev database and relaxed settings
- **prod**: Production mode with production database and optimizations

## Commands

| Command | Description | Example |
|---------|-------------|---------|
| `start` | Start components | `./deploy.sh start api` |
| `stop` | Stop components | `./deploy.sh stop all` |
| `restart` | Restart components | `./deploy.sh restart web` |
| `rebuild` | Rebuild and restart | `./deploy.sh rebuild api` |
| `status` | Show status | `./deploy.sh status` |
| `logs` | Show logs | `./deploy.sh logs api` |
| `migrate` | Run DB migrations | `./deploy.sh migrate` |
| `config` | Show configuration | `./deploy.sh config` |

## Configuration

The system automatically generates environment variables based on component locations:

- **Web** gets the correct API URL based on where the API is running
- **API** gets the correct database URL based on where the DB is running
- **All components** get appropriate settings for dev/prod mode

## Environment URLs

### Development Mode
- Local API: `http://localhost:8080`
- Remote API: `http://206.189.52.131:8080`
- Local Web: `http://localhost:3000`
- Remote Web: `http://206.189.52.131:3000`

### Production Mode
- Remote API: `https://api.oxylize.com`
- Remote Web: `https://oxylize.com`

## Troubleshooting

### Check Status
```bash
./deploy/deploy.sh status
```

### View Logs
```bash
./deploy/deploy.sh logs api
./deploy/deploy.sh logs web
./deploy/deploy.sh logs db
```

### Test Connectivity
```bash
# Test if web can reach API and API can reach DB
./deploy/deploy.sh config
```

### Common Issues

1. **API not responding**: Check if database is running and accessible
2. **Web can't reach API**: Verify API location and firewall settings
3. **Permission denied**: Ensure SSH keys are set up for VPS access
4. **Port conflicts**: Stop conflicting services or change ports

## File Structure

```
deploy/
├── deploy.sh              # Main orchestrator
├── components/
│   ├── api.sh             # API management
│   ├── db.sh              # Database management
│   └── web.sh             # Web management
├── utils/
│   ├── common.sh          # Shared utilities
│   └── health-check.sh    # Health checking
├── config/                # Generated environment files
└── README.md              # This file
```
