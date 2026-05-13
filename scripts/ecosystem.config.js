// PM2 ecosystem — GrossistePPN
// Usage : pm2 start scripts/ecosystem.config.js --env production
module.exports = {
  apps: [
    {
      name: "grossiteppn",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/grossiteppn",
      instances: 1,           // augmenter si CPU > 2 cœurs
      exec_mode: "fork",
      max_memory_restart: "512M",
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/log/pm2/grossiteppn-error.log",
      out_file: "/var/log/pm2/grossiteppn-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      watch: false,
      autorestart: true,
      restart_delay: 3000,
    },
  ],
};
