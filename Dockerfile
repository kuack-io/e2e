FROM public.ecr.aws/docker/library/node:25-slim AS builder

WORKDIR /build

COPY package.json package-lock.json tsconfig.json ./
COPY src/ ./src/

# Install TypeScript globally (build tool, not a project dependency).
# Then install only production deps and build.
RUN npm install -g typescript && \
    npm ci --omit=dev && \
    tsc

FROM mcr.microsoft.com/playwright:v1.57.0-noble

WORKDIR /e2e

RUN apt-get update && \
    apt-get install -y curl && \
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY features/ ./features/
COPY cucumber.js ./

COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/dist ./dist

CMD ["npm", "run", "test:parallel"]
