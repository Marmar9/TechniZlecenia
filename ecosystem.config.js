module.exports = {
  apps: [{
    name: 'techni-zlecenia-web',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/myapp',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/techni-zlecenia-web-error.log',
    out_file: '/var/log/pm2/techni-zlecenia-web-out.log',
    log_file: '/var/log/pm2/techni-zlecenia-web.log'
  }]
}
