#!/bin/bash
set -e

# Mars Greenhouse Agent Backend - Run Script
echo "🌱 Starting TERRA MIND Backend..."

# Detect if uv is installed
if command -v uv > /dev/null 2>&1; then
    echo "✨ uv detected! Using uv for faster operations."
    HAS_UV=true
else
    echo "🐍 uv not detected. Falling back to standard python/pip."
    HAS_UV=false
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    if [ "$HAS_UV" = true ]; then
        uv venv venv
    else
        python3 -m venv venv
    fi
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📦 Installing main dependencies..."
if [ "$HAS_UV" = true ]; then
    uv pip install -r requirements.txt --quiet
    echo "📦 Installing vision dependencies..."
    uv pip install -r vision/requirements-dev.txt --quiet
else
    pip install -r requirements.txt --quiet
    echo "📦 Installing vision dependencies..."
    pip install -r vision/requirements-dev.txt --quiet
fi

# Check for .env file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "⚠️  No .env file found. Copying from .env.example..."
        cp .env.example .env
        echo "⚠️  Please update .env with your configuration!"
    fi
fi

# Start the Vision service in the background
echo "👁️  Starting Vision AI service on http://localhost:8001..."
if [ "$HAS_UV" = true ]; then
    uv run python vision/main.py &
else
    python vision/main.py &
fi

# Start the main server
echo "🚀 Starting FastAPI server on http://localhost:8000"
echo "📖 API docs available at http://localhost:8000/docs"
if [ "$HAS_UV" = true ]; then
    uv run python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
else
    python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
fi
