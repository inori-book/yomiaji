#!/bin/bash

# Set error handling
set -e

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to wait for port
wait_for_port() {
    local port=$1
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if check_port $port; then
            echo "Port $port is ready!"
            return 0
        fi
        echo "Waiting for port $port... ($((attempt + 1))/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "Port $port failed to become ready"
    return 1
}

# Check Python installation
echo "Checking Python installation..."
python3 --version || {
    echo "Python3 not found!"
    exit 1
}

# Check if required packages are installed
echo "Checking Python packages..."
python3 -c "import pandas, mecab, unidic_lite, fastapi, uvicorn" || {
    echo "Required Python packages not found!"
    echo "Installing packages..."
    pip3 install -r requirements.txt
}

# Start Python API server in background
echo "Starting Python API server..."
python3 python_api.py &
PYTHON_PID=$!

# Wait for Python API to be ready
echo "Waiting for Python API to be ready..."
if wait_for_port 8000; then
    echo "Python API started successfully with PID: $PYTHON_PID"
else
    echo "Python API failed to start"
    kill $PYTHON_PID 2>/dev/null || true
    exit 1
fi

# Start Next.js application
echo "Starting Next.js application..."
npm start

# Cleanup function
cleanup() {
    echo "Shutting down..."
    kill $PYTHON_PID 2>/dev/null || true
    exit 0
}

# Set trap for cleanup
trap cleanup SIGTERM SIGINT

# Wait for Python process
wait $PYTHON_PID
