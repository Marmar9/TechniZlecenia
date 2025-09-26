# Stage 1: Builder
FROM node:current-alpine3.22 AS builder

WORKDIR /app

COPY . .

RUN npm ci

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

FROM node:current-alpine3.22 AS runner

WORKDIR /app

RUN addgroup -S web && adduser -S web -G web

COPY --from=builder /app/.next/standalone ./standalone
COPY --from=builder /app/public ./standalone/public
COPY --from=builder /app/.next/static ./standalone/.next/static

ENV NODE_ENV=production
ENV PORT=3000

USER web

EXPOSE 3000

CMD ["node", "standalone/server.js"]
