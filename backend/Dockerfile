FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./
COPY nest-cli.json ./
COPY start.sh ./
COPY src ./src

RUN npm ci
RUN npx prisma generate
RUN npx tsc
RUN test -f dist/main.js || (echo "BUILD FAILED: dist/main.js not found" && exit 1)
RUN chmod +x start.sh

EXPOSE 3000

CMD ["./start.sh"]
