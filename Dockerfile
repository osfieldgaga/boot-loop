FROM node:24.13.0-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY packages/client/package.json packages/client/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci
COPY packages packages
COPY assets assets
COPY tuning tuning
COPY tools tools
COPY tsconfig*.json vitest.config.ts ./
RUN npm run check

FROM node:24.13.0-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY packages/client/package.json packages/client/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/packages/server/src packages/server/src
COPY --from=build /app/packages/shared/src packages/shared/src
COPY --from=build /app/packages/client/dist packages/client/dist
COPY --from=build /app/tuning tuning
COPY tsconfig.base.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "node_modules/tsx/dist/cli.mjs", "packages/server/src/index.ts"]
