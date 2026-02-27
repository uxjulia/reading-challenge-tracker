# Reading Challenge Tracker (Node.js + React)

A self-hosted reading tracker with a Node.js/Express API, SQLite storage, and a React frontend.

## Features

- Year-based reading dashboard per user
- Sections for Finished, Currently Reading, and Want to Read
- Multi-user support with admin panel
- Public shareable profile pages (`/u/:username`)
- Reading goal + pace tracking
- Cover lookup from Google Books and Open Library
- Book stats (all-time totals, top authors, top genres)
- Drag-and-drop reordering of the Want to Read list
- SQLite persistence (`books.db`)

## Tech Stack

- Backend: Node.js, Express, better-sqlite3, express-session, bcryptjs
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

## First Login

On first startup the server seeds an admin account from your `.env` values:

- **Username**: value of `USERNAME`
- **Password**: value of `APP_PASSWORD`

Log in at the root URL (`/`). After the initial seed those env vars are no longer used for authentication — passwords are stored as bcrypt hashes in the database.

## User Management

Admins can manage users at `/admin`:

- **Add users** — set a username, password, and optional admin flag
- **Reset passwords** — set a new password for any user
- **Delete users** — removes the user and all their books

Each user has a completely isolated reading list, goals, and stats.

## Public Profiles

Every user has a public, read-only profile at:

```
/u/:username
/u/:username/year/:year
```

Private books are hidden from public views. Copy your public link from the user menu (share icon) in the header.

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

# Start the app with PM2 (uses ecosystem.config.js)
pm2 start

# Save the PM2 config
pm2 save

# Set PM2 to start on system reboot
pm2 startup
```

**Option B: Using systemd**

Create a service file:

```bash
sudo nano /etc/systemd/system/reading-challenge.service
```

Add the following (adjust `User` and paths to match your setup):

```ini
[Unit]
Description=Reading Challenge App
After=network.target

[Service]
User=pi
WorkingDirectory=/home/user/reading-challenge
ExecStart=/usr/bin/node /home/user/reading-challenge/server/index.js
Environment=NODE_ENV=production
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable reading-challenge
sudo systemctl start reading-challenge
```

3. **Set up a reverse proxy (optional)**

To access your app over HTTPS with a domain name:

1. Point a domain or subdomain (e.g. `books.yourdomain.com`) to your server's IP.
2. If hosting at home, set up port forwarding on your router for ports 80 and 443.
3. Use a reverse proxy such as [Nginx Proxy Manager](https://nginxproxymanager.com/) or Cloudflare Tunnels.
4. Point incoming traffic for your domain to `http://<your-server-ip>:8000`.

In production, Express serves the built React app from `client/dist`.

## Environment Variables

| Variable               | Description                                       | Required        |
| ---------------------- | ------------------------------------------------- | --------------- |
| `SECRET_KEY`           | Session cookie signing key                        | Yes             |
| `APP_PASSWORD`         | Initial admin password (first-run seed only)      | Yes (first run) |
| `USERNAME`             | Initial admin username (first-run seed only)      | Yes (first run) |
| `GOOGLE_BOOKS_API_KEY` | Google Books API key for cover lookup             | No              |
| `PORT`                 | Backend port (default `8000`)                     | No              |
| `CLIENT_ORIGIN`        | Dev CORS origin (default `http://localhost:5173`) | No              |

`APP_PASSWORD` and `USERNAME` are only used to seed the first admin account. Once the `users` table is populated they have no effect.

## Data Backup

All reading data is in `books.db`:

```bash
cp books.db books-backup-$(date +%Y%m%d).db
```
