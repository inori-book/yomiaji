FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# OS deps (MeCab等) + Python + Node + Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates build-essential mecab libmecab2 mecab-ipadic-utf8 \
    python3 python3-pip python3-venv python3-dev python3-full \
    python3-numpy python3-pandas python3-setuptools python3-wheel \
    nodejs npm \
 && rm -rf /var/lib/apt/lists/*

# 任意: Node 20 系を安定化
RUN npm install -g corepack && corepack enable

WORKDIR /app

# Python packages that are not available in apt
RUN python3 -m pip install --break-system-packages \
    fastapi uvicorn[standard] mecab-python3 unidic-lite

# Verify mecab-python3 installation
RUN python3 -c "import MeCab; print('MeCab import successful')"

# アプリ一式
COPY . /app

# エントリポイント
RUN chmod +x /app/start.sh

# Set memory limits for Node.js
ENV NODE_OPTIONS="--max-old-space-size=1024"

CMD ["/app/start.sh"]