FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN npm ci --workspace=@kids-calendar/shared --workspace=@kids-calendar/web --include-workspace-root --ignore-scripts
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
COPY scripts/generate-icons.js ./scripts/generate-icons.js
RUN node scripts/generate-icons.js && npm run build -w @kids-calendar/shared && npm run build -w @kids-calendar/web

FROM nginx:alpine
COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1
