FROM node:22-slim AS base
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN npm i -g pnpm
WORKDIR /app

FROM base AS dev
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/
RUN pnpm install
COPY . .
EXPOSE 4000
CMD ["pnpm", "--filter", "server", "dev"]

FROM base AS prod
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/
RUN pnpm install --prod=false
COPY . .
RUN pnpm --filter server build
RUN pnpm install --prod
EXPOSE 4000
CMD ["node", "apps/server/dist/index.js"]
