# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM dependencies AS build
COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN npm run build -w @omni-route/shared && npm run build -w @omni-route/api

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev --workspace @omni-route/shared --workspace @omni-route/api
COPY --from=build --chown=node:node /app/apps/api/dist apps/api/dist
COPY --from=build --chown=node:node /app/packages/shared/dist packages/shared/dist
USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
