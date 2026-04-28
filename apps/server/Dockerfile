FROM node:20-alpine AS base
RUN npm i -g pnpm
WORKDIR /app

FROM base AS dev
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install
COPY . .
EXPOSE 4000
CMD ["pnpm", "--filter", "server", "dev"]

FROM base AS prod
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --prod=false
COPY . .
RUN pnpm --filter @polypad/shared build && pnpm --filter server build
RUN pnpm install --prod
EXPOSE 4000
CMD ["node", "apps/server/dist/index.js"]