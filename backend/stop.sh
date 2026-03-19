#!/bin/bash

echo "🛑 Stopping RedHarvester Backend services..."

# Function to kill process on a port
kill_port() {
    local port=$1
    local pid=$(lsof -t -i :$port)
    if [ -z "$pid" ]; then
        echo "✅ Port $port is already free."
    else
        echo "🔪 Killing process on port $port (PID: $pid)..."
        kill -9 $pid
    fi
}

# Kill by port (most reliable)
if command -v lsof > /dev/null 2>&1; then
    kill_port 8000
    kill_port 8001
else
    echo "⚠️ lsof not found, falling back to pkill..."
    pkill -f "uvicorn server:app" || true
    pkill -f "vision/main.py" || true
    pkill -f "uv run python" || true
fi

# Cleanup any remaining background jobs started by the shell
pkill -P $$ 2>/dev/null || true

echo "✨ All services stopped."
