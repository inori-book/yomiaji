# Use Ubuntu as base image
FROM ubuntu:22.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    mecab \
    mecab-ipadic-utf8 \
    libmecab-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy Python requirements
COPY requirements.txt ./
RUN pip3 install -r requirements.txt

# Copy application files
COPY . .

# Build Next.js application
RUN npm run build

# Make start script executable
RUN chmod +x start.sh

# Expose ports
EXPOSE 3000
EXPOSE 8000

# Start both Python API and Next.js
CMD ["./start.sh"]
