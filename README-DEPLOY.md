# JivePilot Ops Brain — Self-Hosted Deployment Guide

## Required Environment Variables on VPS

Create `/var/www/jivepilot-ops/.env` with:

```
DATABASE_URL=mysql://ops_brain:OpsBrain2024!Secure@localhost:3306/ops_brain_db
JWT_SECRET=<long-random-string>
APP_USERNAME=admin
APP_PASSWORD=<your-password>
OPENAI_API_KEY=sk-...
NODE_ENV=production
PORT=3001
```

## First Deploy

```bash
cd /var/www/jivepilot-ops
git clone https://github.com/yehoshua-JH/jp-ops-brain.git .
pnpm install
pnpm run build
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

## Auto-Deploy (GitHub Actions)

Every push to `main` automatically deploys to the VPS.

Required GitHub Secrets (Settings → Secrets → Actions):
- `VPS_HOST` = 72.61.113.148
- `VPS_USER` = root
- `VPS_SSH_KEY` = (contents of the deploy SSH private key)

## Nginx Config

```nginx
server {
    listen 80;
    server_name ops.jivepilot.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then run: `certbot --nginx -d ops.jivepilot.com`
