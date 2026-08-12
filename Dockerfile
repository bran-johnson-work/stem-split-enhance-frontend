
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com .
ARG NODE_IMAGE=public.ecr.aws/docker/library/node:22-alpine

# --- deps: resolve the full dependency tree once, cached on the lockfile ---
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- builder: compile the app and trace the standalone server bundle ---
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL="https://api.klearnote.ai"
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- runner: minimal runtime, non-root, only the traced output ---
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as an unprivileged user (alpine/busybox add* tools).
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nextjs

# public/ is served static; standalone/ carries server.js + traced node_modules;
# .next/static holds the hashed client chunks the server references.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# stdlib-only liveness probe — no curl/wget in the runtime layer.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+process.env.PORT+'/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
