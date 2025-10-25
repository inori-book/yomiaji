#!/bin/bash

# Start Python API server in background
echo "Starting Python API server..."
python3 python_api.py &
PYTHON_PID=$!

# Wait for Python API to be ready
echo "Waiting for Python API to be ready..."
sleep 10

# Check if Python API is running and responding
for i in {1..30}; do
    if curl -f http://127.0.0.1:8000/health >/dev/null 2>&1; then
        echo "Python API is ready!"
        break
    fi
    echo "Waiting for Python API... ($i/30)"
    sleep 2
done

# Final check
if ! curl -f http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo "Python API failed to start or respond"
    kill $PYTHON_PID 2>/dev/null
    exit 1
fi

echo "Python API started with PID: $PYTHON_PID"

# Start Next.js application
echo "Starting Next.js application..."
npm start

# Cleanup function
cleanup() {
    echo "Shutting down..."
    kill $PYTHON_PID 2>/dev/null
    exit 0
}

# Set trap for cleanup
trap cleanup SIGTERM SIGINT

# Wait for Python process
wait $PYTHON_PID
