# Multi-stage build for e2e test image
FROM mcr.microsoft.com/playwright:v1.57.0-noble

WORKDIR /app

COPY . .

RUN apt-get update && \
    apt-get install -y curl && \
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/ && \
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    npm ci && \
    npm run build && \
    rm -rf src

CMD ["npm", "run","test:parallel"]
