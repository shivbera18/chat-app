FROM node:20-bookworm-slim

WORKDIR /app

# Prisma on slim images needs OpenSSL in some environments.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && npm run start"]