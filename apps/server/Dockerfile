FROM node:22-slim AS base
RUN npm i -g pnpm
WORKDIR /app

FROM base AS prod
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/
RUN CI=true pnpm install
COPY . .
RUN pnpm --filter server build
EXPOSE 4000
CMD ["node", "apps/server/dist/index.js"]
