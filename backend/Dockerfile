FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY backend/package*.json ./
COPY backend/prisma ./prisma/
COPY backend/tsconfig.json ./
COPY backend/nest-cli.json ./
COPY backend/src ./src

RUN npm ci
RUN npx prisma generate
RUN npx tsc
RUN test -f dist/main.js || (echo "BUILD FAILED: dist/main.js not found" && exit 1)

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
