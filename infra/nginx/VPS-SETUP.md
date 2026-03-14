# VPS Server Setup Guide - Nginx & SSL for lanita.com

This guide walks you through setting up Nginx as a reverse proxy with HTTPS on a fresh Ubuntu VPS.

## Prerequisites

- A fresh Ubuntu 22.04/24.04 VPS (e.g., Oracle Free Tier, DigitalOcean, etc.)
- Domain `lanita.com` pointing to your VPS IP address (A record)
- SSH access to your VPS

---

## Step 1: Connect to Your VPS

```bash
ssh ubuntu@YOUR_VPS_IP
```

---

## Step 2: Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

---

## Step 3: Install Nginx and Certbot

```bash
sudo apt install -y nginx python3-certbot-nginx
```

---

## Step 4: Configure Firewall (if UFW is enabled)

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

---

## Step 5: Upload the Nginx Configuration

**Option A: Copy from your local machine:**

```bash
# From your LOCAL machine (not the VPS):
scp infra/nginx/lanita.conf ubuntu@YOUR_VPS_IP:/tmp/lanita.conf
```

**Option B: Create directly on the server:**

```bash
sudo nano /etc/nginx/sites-available/lanita
# Paste the contents of lanita.conf
```

---

## Step 6: Enable the Site Configuration

```bash
# Move config to correct location (if uploaded to /tmp)
sudo mv /tmp/lanita.conf /etc/nginx/sites-available/lanita

# Create symlink to enable the site
sudo ln -sf /etc/nginx/sites-available/lanita /etc/nginx/sites-enabled/

# Remove default site (optional but recommended)
sudo rm -f /etc/nginx/sites-enabled/default
```

---

## Step 7: Test Nginx Configuration

```bash
sudo nginx -t
```

Expected output:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

## Step 8: Obtain SSL Certificate with Certbot

**IMPORTANT:** Before running this, temporarily comment out the SSL lines in your config:

```bash
sudo nano /etc/nginx/sites-available/lanita
```

Comment out these lines (add # at the start):
```nginx
# ssl_certificate /etc/letsencrypt/live/lanita.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/lanita.com/privkey.pem;
# include /etc/letsencrypt/options-ssl-nginx.conf;
# ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
```

Also temporarily change `listen 443 ssl http2;` to just `listen 443;`

Then restart nginx:
```bash
sudo systemctl restart nginx
```

Now run Certbot:

```bash
sudo certbot --nginx -d lanita.com -d www.lanita.com
```

Certbot will:
1. Verify domain ownership
2. Obtain SSL certificates
3. Auto-configure nginx with the correct SSL settings

---

## Step 9: Verify SSL Auto-Renewal

```bash
sudo certbot renew --dry-run
```

---

## Step 10: Restart Nginx

```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

---

## Step 11: Verify Everything Works

1. Open `https://lanita.com` in your browser
2. Check for the padlock icon (valid SSL)
3. Test API: `https://lanita.com/api/health` – should return `{"status":"ok","database":"connected"}`

If the frontend does not load, ensure `WEB_PORT=4000` is set in your `.env` so the client container matches Nginx.

---

## Before Deploying with Docker

**Critical:** Set `WEB_PORT=4000` in your `.env` file. The Nginx config proxies the frontend from `127.0.0.1:4000`; the client container must expose `4000:3001`. Without this, the frontend will not be reachable via Nginx.

---

## Production .env Configuration

Before deploying with Docker on the VPS, create a `.env` file in the project root. Use `.env.production.example` as a template:

```bash
cp .env.production.example .env
```

Required variables for production (Nginx reverse proxy setup):

| Variable | Value | Reason |
|----------|-------|--------|
| WEB_PORT | 4000 | Must match Nginx frontend proxy (127.0.0.1:4000) |
| API_URL | https://lanita.com/api | Client must use full path including /api |
| CORS_ORIGIN | https://lanita.com,https://www.lanita.com | Allow production domain |
| JWT_ACCESS_SECRET | (your secret) | Required; do not use default in production |
| JWT_REFRESH_SECRET | (your secret) | Required; do not use default in production |

The deploy workflow does not inject secrets; set them in the VPS `.env` file before running `docker-compose up`.

---

## Troubleshooting

### Check Nginx Logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Check if Docker Containers are Running
```bash
docker ps
```

### Test Backend Directly
```bash
# Backend health check – should return {"status":"ok","database":"connected"}
curl http://127.0.0.1:4001/health

# Frontend (Next.js)
curl http://127.0.0.1:4000
```

### Reload Nginx Without Restart
```bash
sudo nginx -s reload
```

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Start Nginx | `sudo systemctl start nginx` |
| Stop Nginx | `sudo systemctl stop nginx` |
| Restart Nginx | `sudo systemctl restart nginx` |
| Test Config | `sudo nginx -t` |
| View Status | `sudo systemctl status nginx` |
| Renew SSL | `sudo certbot renew` |
| View SSL Certs | `sudo certbot certificates` |
