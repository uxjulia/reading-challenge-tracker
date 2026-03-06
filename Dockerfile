FROM node:22-alpine AS builder

# Native build deps for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/

RUN npm ci

COPY . .

RUN npm run build

RUN npm prune --omit=dev

# ── Production image ───────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/client/dist ./client/dist
COPY server ./server
COPY package.json ./

ENV NODE_ENV=production

EXPOSE 8000

CMD ["node", "server/index.js"]
