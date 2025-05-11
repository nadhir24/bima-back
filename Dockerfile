FROM node:20-alpine

WORKDIR /app

# Install OpenSSL untuk Prisma dan dependensi lainnya
RUN apk add --no-cache openssl

COPY package*.json ./

RUN npm ci

# Update @nestjs/schedule ke versi terbaru yang kompatibel dengan Node.js 20
RUN npm install @nestjs/schedule@latest

COPY . .

# Generate Prisma client before building
RUN npx prisma generate

RUN npm run build

# Menggunakan path yang benar ke dist/src/main
CMD ["node", "dist/src/main"] 