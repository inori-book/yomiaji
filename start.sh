#!/bin/bash

# Start Python API server in background
echo "Starting Python API server..."
python3 python_api.py &
PYTHON_PID=$!

# Wait for Python API to be ready
echo "Waiting for Python API to be ready..."
sleep 5

# Check if Python API is running
if ! kill -0 $PYTHON_PID 2>/dev/null; then
    echo "Python API failed to start"
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
