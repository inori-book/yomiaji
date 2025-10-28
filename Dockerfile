# ---- Stage 1: Next build (Node only) ----
FROM node:20-bullseye AS web-builder
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; else npm ci; fi
COPY . .
RUN npm run build || yarn build
RUN mkdir -p out-rt/.next && \
    cp -r .next/standalone out-rt/ && \
    cp -r .next/static out-rt/.next/static && \
    cp -r public out-rt/public || true

# ---- Stage 2: Runtime (Ubuntu + Python + Node) ----
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates build-essential \
    python3 python3-pip python3-venv python3-dev \
    mecab libmecab2 mecab-ipadic-utf8 \
    nodejs npm \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g corepack && corepack enable

WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN python3 -m pip install --upgrade pip setuptools wheel && \
    python3 -m pip install --no-cache-dir --only-binary=:all: -r requirements.txt

COPY . /app
COPY --from=web-builder /app/out-rt /app/.next-rt

RUN chmod +x /app/start.sh
ENV NEXT_STANDALONE_DIR="/app/.next-rt/standalone"
CMD ["/app/start.sh"]
