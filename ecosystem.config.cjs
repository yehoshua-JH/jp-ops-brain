module.exports = {
  apps: [
    {
      name: "jivepilot-brain",
      script: "node",
      args: "--import tsx/esm server/_core/index.ts",
      cwd: "/var/www/jivepilot-ops",
      interpreter: "none",
      env_production: {
        NODE_ENV: "production",
        PORT: "3001",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      error_file: "/var/log/jivepilot-brain/error.log",
      out_file: "/var/log/jivepilot-brain/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
