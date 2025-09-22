# Deployment Instructions

## Option 1: Using PM2 (Recommended)

1. Install PM2 globally:
```bash
sudo npm install -g pm2
```

2. Start the application:
```bash
cd /home/eduard/Pulpit/TechniZlecenia
pm2 start ecosystem.config.js
```

3. Save PM2 configuration:
```bash
pm2 save
pm2 startup
```

4. Configure Nginx as reverse proxy (use the nginx-config.conf file)

## Option 2: Using Systemd

1. Copy the service file:
```bash
sudo cp techni-zlecenia.service /etc/systemd/system/
```

2. Reload systemd and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable techni-zlecenia
sudo systemctl start techni-zlecenia
```

3. Check status:
```bash
sudo systemctl status techni-zlecenia
```

## Nginx Configuration

1. Copy the nginx configuration to your sites-available:
```bash
sudo cp nginx-config.conf /etc/nginx/sites-available/techni-zlecenia
sudo ln -s /etc/nginx/sites-available/techni-zlecenia /etc/nginx/sites-enabled/
```

2. Test and reload nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Important Notes

- The application runs on port 3000 by default
- Make sure your backend API is also running and accessible
- Update the API_BASE_URL in the code if needed
- The application requires Node.js 18+ to run



