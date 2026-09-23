# Frontend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Configure network resilience against npm registry socket resets (ECONNRESET) in CI runners
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && (npm install --legacy-peer-deps --no-audit || (echo "Retrying npm install..." && sleep 3 && npm install --legacy-peer-deps --no-audit))

COPY . .
RUN npm run build

# Production server stage
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/build ./build

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000", "--single"]
