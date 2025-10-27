FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# OS deps (MeCab等) + Python + Node
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates build-essential mecab libmecab2 mecab-ipadic-utf8 \
    python3 python3-pip python3-venv python3-dev \
    nodejs npm \
 && rm -rf /var/lib/apt/lists/*

# 任意: Node 20 系を安定化
RUN npm install -g corepack && corepack enable

WORKDIR /app

# Python deps (wheel 強制でビルド事故回避)
COPY requirements.txt /app/requirements.txt
RUN python3 -m pip install --upgrade pip setuptools wheel \
 && python3 -m pip install --no-cache-dir --only-binary=:all: -r requirements.txt

# アプリ一式
COPY . /app

# エントリポイント
RUN chmod +x /app/start.sh
CMD ["/app/start.sh"]