#!/bin/bash

# Mars Greenhouse Agent Backend - Run Script

echo "🌱 Starting TERRA MIND Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt --quiet

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your AWS credentials!"
fi

# Start the server
echo "🚀 Starting FastAPI server on http://localhost:8000"
echo "📖 API docs available at http://localhost:8000/docs"
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
