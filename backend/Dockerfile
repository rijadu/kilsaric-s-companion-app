FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./
COPY nest-cli.json ./
COPY src ./src

RUN npm ci
RUN npx prisma generate
RUN npx nest build
RUN ls -la dist/

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
