# ── Build ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ── Serve ────────────────────────────────────────────────────────────────────
FROM nginx:alpine AS server

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY redirects.conf /etc/nginx/redirects.conf

EXPOSE 80
