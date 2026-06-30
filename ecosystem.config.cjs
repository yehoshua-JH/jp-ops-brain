module.exports = {
  apps: [
    {
      name: "jivepilot-ops",
      script: "node_modules/.bin/tsx",
      args: "server/_core/index.ts",
      cwd: "/var/www/jivepilot-ops",
      env_production: {
        NODE_ENV: "production",
        PORT: "3001",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      error_file: "/var/log/jivepilot-ops/error.log",
      out_file: "/var/log/jivepilot-ops/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
