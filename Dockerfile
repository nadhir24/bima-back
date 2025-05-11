FROM node:18-alpine

WORKDIR /app

# Install OpenSSL untuk Prisma
RUN apk add --no-cache openssl

COPY package*.json ./

RUN npm ci

COPY . .

# Generate Prisma client before building
RUN npx prisma generate

RUN npm run build

# Menggunakan path yang benar ke dist/src/main
CMD ["node", "dist/src/main"] 