# Peak Academy API — build from monorepo root (Railway default)
# Prefer setting Railway service Root Directory to /backend instead.
FROM node:22-alpine

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/ ./

ENV NODE_ENV=production
ENV HOST=0.0.0.0
EXPOSE 4000

CMD ["npm", "start"]
