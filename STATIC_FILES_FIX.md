# Static Files Fix for TechniZlecenia

## Problem
The application was showing "loading..." indefinitely because static files (CSS, JS, images) were not being served correctly by nginx.

## Solution
Updated nginx configuration and deployment scripts to properly serve Next.js static files.

## Files Modified

### 1. nginx-config.conf
- Added proper static file serving for `/_next/static/` directory
- Added caching headers for better performance
- Added API proxy configuration
- Updated server name to actual domain

### 2. deploy.sh
- Fixed static file copying to correct directory structure
- Added directory creation on remote server
- Added production dependency installation
- Added PM2 restart functionality
- Added nginx configuration update

### 3. ecosystem.config.js
- Updated working directory to `/var/www/myapp`
- Added logging configuration

### 4. Created setup-server.sh
- Initial server setup script
- Installs Node.js, PM2, nginx
- Creates necessary directories
- Sets proper permissions

### 5. Created nginx-ssl.conf
- SSL/HTTPS configuration
- Security headers
- HTTP to HTTPS redirect

## Deployment Instructions

### First Time Setup (Run Once)
```bash
# Make scripts executable
chmod +x setup-server.sh deploy.sh

# Set up the remote server
./setup-server.sh
```

### Regular Deployment
```bash
# Deploy the application
./deploy.sh
```

### Manual SSH Commands (if needed)

#### Check nginx status
```bash
ssh root@206.189.52.131 "systemctl status nginx"
```

#### Check PM2 status
```bash
ssh root@206.189.52.131 "pm2 status"
```

#### View logs
```bash
ssh root@206.189.52.131 "pm2 logs techni-zlecenia-web"
```

#### Restart services
```bash
ssh root@206.189.52.131 "pm2 restart techni-zlecenia-web && systemctl reload nginx"
```

#### Check static files
```bash
ssh root@206.189.52.131 "ls -la /var/www/myapp/.next/static/"
```

## Directory Structure on Server
```
/var/www/myapp/
├── .next/
│   ├── static/          # Static assets served by nginx
│   └── server/          # Next.js server files
├── public/              # Public assets
├── package.json
├── package-lock.json
└── node_modules/        # Production dependencies
```

## Nginx Configuration
- Static files served directly by nginx (faster)
- API calls proxied to backend
- All other requests proxied to Next.js app
- Proper caching headers for performance

## Troubleshooting

### If static files still don't load:
1. Check nginx error logs: `ssh root@206.189.52.131 "tail -f /var/log/nginx/error.log"`
2. Verify static files exist: `ssh root@206.189.52.131 "ls -la /var/www/myapp/.next/static/"`
3. Check nginx configuration: `ssh root@206.189.52.131 "nginx -t"`
4. Restart nginx: `ssh root@206.189.52.131 "systemctl restart nginx"`

### If application doesn't start:
1. Check PM2 logs: `ssh root@206.189.52.131 "pm2 logs techni-zlecenia-web"`
2. Check if port 3000 is in use: `ssh root@206.189.52.131 "netstat -tlnp | grep 3000"`
3. Restart PM2: `ssh root@206.189.52.131 "pm2 restart techni-zlecenia-web"`



