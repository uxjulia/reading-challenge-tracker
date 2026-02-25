# Reading Challenge Tracker (Node.js + React)

A self-hosted reading tracker with a Node.js/Express API, SQLite storage, and a React frontend.

## Features

- Year-based reading dashboard
- Sections for Finished, Currently Reading, and Want to Read
- Session-based auth for write actions
- Reading goal + pace tracking
- Cover lookup from Google Books and Open Library
- SQLite persistence (`books.db`)

## Tech Stack

- Backend: Node.js, Express, better-sqlite3, express-session
- Frontend: React + Vite
- Database: SQLite

## Requirements

- Node.js 20+
- npm 10+

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
# edit .env with your values
```

3. Start development mode (API + React dev server):

```bash
npm run dev
```

4. Open:

```text
http://localhost:5173
```

The API runs on `http://localhost:8000` in dev.

## Production

1. Build frontend:

```bash
npm run build
```

2. Start server:

```bash
npm run start
```

You can use a process manager like **PM2**, or a native **systemd** service to keep the app running in the background.

**Option A: Using PM2**

```bash
# Install PM2 globally
npm install pm2 -g

# Start the app with PM2. This will automatically use the configuration settings in ecosystem.config.js.
pm2 start

# Save the PM2 config
pm2 save

# Set PM2 to start up when the system reboots
pm2 startup
```

**Option B: Using systemd (Standard Linux approach)**
Create a service file:

```bash
sudo nano /etc/systemd/system/reading-challenge.service
```

Add the following configuration (adjust the `User` and paths to match your setup):

```ini
[Unit]
Description=Reading Challenge App
After=network.target

[Service]
User=pi
WorkingDirectory=/home/pi/reading-challenge
ExecStart=/home/pi/reading-challenge/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable reading-challenge
sudo systemctl start reading-challenge
```

3. Set up a Domain and Reverse Proxy (Optional)

To access your reading challenge from anywhere securely (over HTTPS) without typing in an IP address and port:

1. Point a domain or subdomain (e.g., `books.yourdomain.com`) to your home network or server's IP.
2. If hosting at home, set up port forwarding on your router for ports 80 and 443 to the host machine.
3. Install a reverse proxy like [Nginx Proxy Manager](https://nginxproxymanager.com/) or Cloudflare Tunnels (recommended for home networks to avoid port forwarding).
4. Configure the reverse proxy to point incoming traffic for your domain to `http://<your-server-ip>:8000`.

In production mode, Express serves the built React app from `client/dist`.

## Environment Variables

- `SECRET_KEY`: session cookie signing key
- `APP_PASSWORD`: password required for add/edit/delete
- `GOOGLE_BOOKS_API_KEY`: optional API key
- `USERNAME`: header display name
- `PORT`: backend port (default `8000`)
- `CLIENT_ORIGIN`: dev CORS origin (default `http://localhost:5173`)

## Data Backup

All reading data is in `books.db`:

```bash
cp books.db books-backup-$(date +%Y%m%d).db
```
