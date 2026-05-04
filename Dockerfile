FROM oven/bun:alpine AS base
WORKDIR /usr/src/app
COPY package.json bun.lockb ./

FROM base AS dev_deps
RUN bun install --frozen-lockfile

FROM base AS build
COPY --from=dev_deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base AS release 
COPY --from=build /usr/src/app/dist ./dist
EXPOSE ${PORT}
CMD ["bun", "start:prod"]